import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import {
  PlanDocumentSchema,
  V1_COMPLEXITY_BUDGETS,
  type Block,
  type Inline,
  type PlanDocument,
} from "./schema.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: PlanDocument }
  | { ok: false; issues: ValidationIssue[] };

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile<PlanDocument>(PlanDocumentSchema);

type InspectionKind =
  | "root"
  | "block"
  | "inline"
  | "listItem"
  | "step"
  | "fact"
  | "column"
  | "row"
  | "cell"
  | "string";

interface InspectionEntry {
  value: unknown;
  path: string;
  kind: InspectionKind;
  blockDepth?: number | undefined;
  code?: boolean | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unicodeLengthUpTo(value: string, limit: number): number {
  let length = 0;
  for (const _character of value) {
    length += 1;
    if (length > limit) break;
  }
  return length;
}

function lineCountUpTo(value: string, limit: number): number {
  let lines = 1;
  for (const character of value) {
    if (character === "\n") lines += 1;
    if (lines > limit) break;
  }
  return lines;
}

function propertyPath(path: string, property: string): string {
  return path === "/" ? `/${property}` : `${path}/${property}`;
}

function inspectComplexity(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const issueKeys = new Set<string>();
  const stack: InspectionEntry[] = [{ value: input, path: "/", kind: "root" }];
  let totalBlocks = 0;
  let traversalItems = 0;
  let totalStringCharacters = 0;
  let totalBlocksReported = false;
  let totalStringsReported = false;
  let traversalLimitExceeded = false;

  const addIssue = (issue: ValidationIssue) => {
    const key = `${issue.path}\0${issue.message}`;
    if (!issueKeys.has(key)) {
      issueKeys.add(key);
      issues.push(issue);
    }
  };

  const pushString = (
    parent: Record<string, unknown>,
    path: string,
    property: string,
    code = false,
  ) => {
    const value = parent[property];
    if (typeof value === "string") {
      stack.push({
        value,
        path: propertyPath(path, property),
        kind: "string",
        code,
      });
    }
  };

  const inspectArrayLength = (
    value: unknown,
    path: string,
    maxItems: number,
  ): value is unknown[] => {
    if (traversalLimitExceeded) return false;
    if (!Array.isArray(value)) return false;
    if (value.length > maxItems) {
      addIssue({
        path,
        message: `must contain at most ${maxItems} items (v1 limit)`,
      });
    }
    const inspectedLength = Math.min(value.length, maxItems);
    if (
      traversalItems + inspectedLength
      > V1_COMPLEXITY_BUDGETS.traversalItems
    ) {
      traversalLimitExceeded = true;
      stack.length = 0;
      addIssue({
        path: "/",
        message: `plan may contain at most ${V1_COMPLEXITY_BUDGETS.traversalItems} traversable collection items in total (v1 limit)`,
      });
      return false;
    }
    traversalItems += inspectedLength;
    return true;
  };

  const pushArray = (
    value: unknown,
    path: string,
    maxItems: number,
    kind: InspectionKind,
    blockDepth?: number,
  ) => {
    if (!inspectArrayLength(value, path, maxItems)) return;
    const inspectedLength = Math.min(value.length, maxItems);
    for (let index = inspectedLength - 1; index >= 0; index -= 1) {
      stack.push({
        value: value[index],
        path: `${path}/${index}`,
        kind,
        blockDepth,
      });
    }
  };

  while (stack.length > 0 && !traversalLimitExceeded) {
    const entry = stack.pop();
    if (!entry) break;

    if (entry.kind === "string" && typeof entry.value === "string") {
      const fieldLimit = entry.code
        ? V1_COMPLEXITY_BUDGETS.codeCharacters
        : V1_COMPLEXITY_BUDGETS.stringCharacters;
      // Counting up to the aggregate budget is necessary even after the field
      // limit is crossed so later strings cannot evade the plan-wide limit.
      const length = unicodeLengthUpTo(
        entry.value,
        Math.max(fieldLimit, V1_COMPLEXITY_BUDGETS.totalStringCharacters),
      );
      totalStringCharacters += length;

      if (length > fieldLimit) {
        addIssue({
          path: entry.path,
          message: entry.code
            ? `must contain at most ${fieldLimit} Unicode characters (v1 code limit)`
            : `must contain at most ${fieldLimit} Unicode characters (v1 string limit)`,
        });
      }
      if (
        !totalStringsReported
        && totalStringCharacters > V1_COMPLEXITY_BUDGETS.totalStringCharacters
      ) {
        totalStringsReported = true;
        addIssue({
          path: "/",
          message: `plan strings must contain at most ${V1_COMPLEXITY_BUDGETS.totalStringCharacters} Unicode characters in total (v1 limit)`,
        });
      }
      if (entry.code) {
        const lines = lineCountUpTo(entry.value, V1_COMPLEXITY_BUDGETS.codeLines);
        if (lines > V1_COMPLEXITY_BUDGETS.codeLines) {
          addIssue({
            path: entry.path,
            message: `must contain at most ${V1_COMPLEXITY_BUDGETS.codeLines} lines (v1 code limit)`,
          });
        }
      }
      continue;
    }

    if (entry.kind === "cell") {
      pushArray(
        entry.value,
        entry.path,
        V1_COMPLEXITY_BUDGETS.collectionItems,
        "inline",
      );
      continue;
    }

    if (!isRecord(entry.value)) continue;

    switch (entry.kind) {
      case "root":
        pushString(entry.value, entry.path, "version");
        pushString(entry.value, entry.path, "title");
        pushString(entry.value, entry.path, "summary");
        pushString(entry.value, entry.path, "language");
        pushArray(
          entry.value.blocks,
          "/blocks",
          V1_COMPLEXITY_BUDGETS.collectionItems,
          "block",
          1,
        );
        break;
      case "block": {
        totalBlocks += 1;
        if (totalBlocks > V1_COMPLEXITY_BUDGETS.totalBlocks) {
          if (!totalBlocksReported) {
            totalBlocksReported = true;
            addIssue({
              path: "/blocks",
              message: `plan may contain at most ${V1_COMPLEXITY_BUDGETS.totalBlocks} blocks in total (v1 limit)`,
            });
          }
          break;
        }
        if (
          entry.blockDepth !== undefined
          && entry.blockDepth > V1_COMPLEXITY_BUDGETS.blockNestingDepth
        ) {
          addIssue({
            path: entry.path,
            message: `blocks may be nested at most ${V1_COMPLEXITY_BUDGETS.blockNestingDepth} levels including sections and details (v1 limit)`,
          });
          break;
        }
        pushString(entry.value, entry.path, "type");
        switch (entry.value.type) {
          case "section":
            pushString(entry.value, entry.path, "title");
            pushArray(
              entry.value.blocks,
              propertyPath(entry.path, "blocks"),
              V1_COMPLEXITY_BUDGETS.collectionItems,
              "block",
              (entry.blockDepth ?? 0) + 1,
            );
            break;
          case "paragraph":
            pushArray(
              entry.value.content,
              propertyPath(entry.path, "content"),
              V1_COMPLEXITY_BUDGETS.collectionItems,
              "inline",
            );
            break;
          case "list":
            pushString(entry.value, entry.path, "style");
            pushArray(
              entry.value.items,
              propertyPath(entry.path, "items"),
              V1_COMPLEXITY_BUDGETS.collectionItems,
              "listItem",
            );
            break;
          case "callout":
            pushString(entry.value, entry.path, "tone");
            pushString(entry.value, entry.path, "title");
            pushArray(
              entry.value.content,
              propertyPath(entry.path, "content"),
              V1_COMPLEXITY_BUDGETS.collectionItems,
              "inline",
            );
            break;
          case "steps":
            pushArray(
              entry.value.items,
              propertyPath(entry.path, "items"),
              V1_COMPLEXITY_BUDGETS.collectionItems,
              "step",
            );
            break;
          case "table": {
            pushString(entry.value, entry.path, "caption");
            pushArray(
              entry.value.columns,
              propertyPath(entry.path, "columns"),
              V1_COMPLEXITY_BUDGETS.tableColumns,
              "column",
            );
            pushArray(
              entry.value.rows,
              propertyPath(entry.path, "rows"),
              V1_COMPLEXITY_BUDGETS.tableRows,
              "row",
            );
            let cellCount = 0;
            if (Array.isArray(entry.value.rows)) {
              const rows = entry.value.rows.slice(0, V1_COMPLEXITY_BUDGETS.tableRows);
              for (const row of rows) {
                if (isRecord(row) && Array.isArray(row.cells)) {
                  cellCount += row.cells.length;
                }
              }
            }
            if (cellCount > V1_COMPLEXITY_BUDGETS.tableCells) {
              addIssue({
                path: propertyPath(entry.path, "rows"),
                message: `table may contain at most ${V1_COMPLEXITY_BUDGETS.tableCells} cells (v1 limit)`,
              });
            }
            break;
          }
          case "code":
            pushString(entry.value, entry.path, "code", true);
            pushString(entry.value, entry.path, "language");
            pushString(entry.value, entry.path, "filename");
            pushString(entry.value, entry.path, "caption");
            inspectArrayLength(
              entry.value.highlightLines,
              propertyPath(entry.path, "highlightLines"),
              V1_COMPLEXITY_BUDGETS.collectionItems,
            );
            break;
          case "details":
            pushString(entry.value, entry.path, "summary");
            pushArray(
              entry.value.blocks,
              propertyPath(entry.path, "blocks"),
              V1_COMPLEXITY_BUDGETS.collectionItems,
              "block",
              (entry.blockDepth ?? 0) + 1,
            );
            break;
        }
        break;
      }
      case "inline":
        pushString(entry.value, entry.path, "type");
        pushString(entry.value, entry.path, "text");
        pushString(entry.value, entry.path, "href");
        pushString(entry.value, entry.path, "value");
        break;
      case "listItem":
        pushArray(
          entry.value.content,
          propertyPath(entry.path, "content"),
          V1_COMPLEXITY_BUDGETS.collectionItems,
          "inline",
        );
        break;
      case "step":
        pushString(entry.value, entry.path, "title");
        pushString(entry.value, entry.path, "description");
        pushString(entry.value, entry.path, "status");
        pushArray(
          entry.value.meta,
          propertyPath(entry.path, "meta"),
          V1_COMPLEXITY_BUDGETS.collectionItems,
          "fact",
        );
        break;
      case "fact":
        pushString(entry.value, entry.path, "label");
        pushString(entry.value, entry.path, "value");
        break;
      case "column":
        pushString(entry.value, entry.path, "label");
        pushString(entry.value, entry.path, "align");
        break;
      case "row":
        pushArray(
          entry.value.cells,
          propertyPath(entry.path, "cells"),
          V1_COMPLEXITY_BUDGETS.tableColumns,
          "cell",
        );
        break;
      case "string":
        break;
    }
  }

  return issues;
}

function schemaIssue(error: ErrorObject): ValidationIssue {
  const base = error.instancePath;
  const path = error.keyword === "additionalProperties"
    ? `${base}/${String(error.params.additionalProperty)}`
    : base || "/";
  return {
    path,
    message: error.message ?? "is invalid",
  };
}

function isSafeHref(href: string): boolean {
  if (href.startsWith("#")) return true;
  try {
    const protocol = new URL(href).protocol;
    return protocol === "https:" || protocol === "http:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

function inspectInline(content: Inline[], path: string, issues: ValidationIssue[]): void {
  content.forEach((inline, index) => {
    if (inline.type === "link" && !isSafeHref(inline.href)) {
      issues.push({
        path: `${path}/${index}/href`,
        message: "must use http, https, mailto, or a #fragment",
      });
    }
  });
}

function inspectBlocks(
  blocks: Block[],
  path: string,
  issues: ValidationIssue[],
  sectionDepth = 0,
): void {
  blocks.forEach((block, index) => {
    const blockPath = `${path}/${index}`;
    switch (block.type) {
      case "section":
        if (sectionDepth >= 5) {
          issues.push({ path: blockPath, message: "sections may be nested at most 5 levels" });
        }
        inspectBlocks(block.blocks, `${blockPath}/blocks`, issues, sectionDepth + 1);
        break;
      case "details":
        inspectBlocks(block.blocks, `${blockPath}/blocks`, issues, sectionDepth);
        break;
      case "paragraph":
      case "callout":
        inspectInline(block.content, `${blockPath}/content`, issues);
        break;
      case "list":
        block.items.forEach((item, itemIndex) => {
          inspectInline(item.content, `${blockPath}/items/${itemIndex}/content`, issues);
        });
        break;
      case "table":
        block.rows.forEach((row, rowIndex) => {
          if (row.cells.length !== block.columns.length) {
            issues.push({
              path: `${blockPath}/rows/${rowIndex}/cells`,
              message: `must contain exactly ${block.columns.length} cells`,
            });
          }
          row.cells.forEach((cell, cellIndex) =>
            inspectInline(cell, `${blockPath}/rows/${rowIndex}/cells/${cellIndex}`, issues),
          );
        });
        break;
      case "code":
        if (block.highlightLines) {
          const lineCount = lineCountUpTo(block.code, Number.POSITIVE_INFINITY);
          block.highlightLines.forEach((line, lineIndex) => {
            if (line > lineCount) {
              issues.push({
                path: `${blockPath}/highlightLines/${lineIndex}`,
                message: `must reference an existing code line (code has ${lineCount} lines)`,
              });
            }
          });
        }
        break;
      case "steps":
        break;
    }
  });
}

export function validatePlan(input: unknown): ValidationResult {
  const complexityIssues = inspectComplexity(input);
  if (complexityIssues.length > 0) {
    // Later phases recurse or iterate over input collections, so complexity
    // errors must be fixed before schema and semantic diagnostics are safe.
    return { ok: false, issues: complexityIssues };
  }

  if (!validateSchema(input)) {
    return {
      ok: false,
      issues: (validateSchema.errors ?? []).map(schemaIssue),
    };
  }

  const plan = input as PlanDocument;
  const issues: ValidationIssue[] = [];
  inspectBlocks(plan.blocks ?? [], "/blocks", issues);
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: plan };
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}
