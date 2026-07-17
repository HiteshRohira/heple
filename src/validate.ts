import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import {
  BLOCK_TYPES,
  INLINE_TYPES,
  PlanDocumentSchema,
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

const ajv = new Ajv2020({ allErrors: true, discriminator: true, strict: false });
const validateSchema = ajv.compile<PlanDocument>(PlanDocumentSchema);

type DiscriminatedKind = "block" | "inline";

function appendPath(base: string, property: string): string {
  return `${base}/${property.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function schemaIssue(
  error: ErrorObject,
  discriminatedKinds: ReadonlyMap<string, DiscriminatedKind>,
): ValidationIssue {
  const base = error.instancePath;
  if (error.keyword === "discriminator") {
    const kind = discriminatedKinds.get(base) ?? "block";
    const values = kind === "block" ? BLOCK_TYPES : INLINE_TYPES;
    const value = error.params.tagValue;
    const label = value === undefined
      ? `${kind} type is required`
      : typeof value === "string"
        ? `unknown ${kind} type ${JSON.stringify(value)}`
        : `${kind} type must be a string`;
    return {
      path: appendPath(base, "type"),
      message: `${label}; expected one of: ${values.join(", ")}`,
    };
  }

  const property = error.keyword === "additionalProperties"
    ? String(error.params.additionalProperty)
    : error.keyword === "required"
      ? String(error.params.missingProperty)
      : undefined;
  const path = property === undefined ? base || "/" : appendPath(base, property);
  return {
    path,
    message: error.keyword === "required"
      ? "is required"
      : error.message ?? "is invalid",
  };
}

function schemaIssues(
  errors: ErrorObject[],
  discriminatedKinds: ReadonlyMap<string, DiscriminatedKind>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (let index = 0; index < errors.length; index += 1) {
    const error = errors[index]!;
    if (error.keyword === "const") {
      const allowedValues: unknown[] = [];
      let end = index;
      while (end < errors.length) {
        const candidate = errors[end]!;
        if (
          candidate.keyword !== "const"
          || candidate.instancePath !== error.instancePath
        ) break;
        allowedValues.push(candidate.params.allowedValue);
        end += 1;
      }
      const unionError = errors[end];
      if (
        allowedValues.length > 1
        && unionError?.keyword === "anyOf"
        && unionError.instancePath === error.instancePath
      ) {
        issues.push({
          path: error.instancePath || "/",
          message: `must be one of: ${allowedValues.map(String).join(", ")}`,
        });
        index = end;
        continue;
      }
    }
    issues.push(schemaIssue(error, discriminatedKinds));
  }
  return issues;
}

function collectDiscriminatedKinds(input: unknown): Map<string, DiscriminatedKind> {
  const kinds = new Map<string, DiscriminatedKind>();

  function collectInlines(value: unknown, path: string): void {
    if (!Array.isArray(value)) return;
    value.forEach((_inline, index) => kinds.set(`${path}/${index}`, "inline"));
  }

  function collectBlocks(value: unknown, path: string): void {
    if (!Array.isArray(value)) return;
    value.forEach((candidate, index) => {
      const blockPath = `${path}/${index}`;
      kinds.set(blockPath, "block");
      if (candidate === null || typeof candidate !== "object") return;

      const block = candidate as Record<string, unknown>;
      switch (block.type) {
        case "section":
        case "details":
          collectBlocks(block.blocks, `${blockPath}/blocks`);
          break;
        case "paragraph":
        case "callout":
          collectInlines(block.content, `${blockPath}/content`);
          break;
        case "list":
          if (Array.isArray(block.items)) {
            block.items.forEach((item, itemIndex) => {
              if (item !== null && typeof item === "object") {
                collectInlines(
                  (item as Record<string, unknown>).content,
                  `${blockPath}/items/${itemIndex}/content`,
                );
              }
            });
          }
          break;
        case "table":
          if (Array.isArray(block.rows)) {
            block.rows.forEach((row, rowIndex) => {
              if (row === null || typeof row !== "object") return;
              const cells = (row as Record<string, unknown>).cells;
              if (!Array.isArray(cells)) return;
              cells.forEach((cell, cellIndex) =>
                collectInlines(cell, `${blockPath}/rows/${rowIndex}/cells/${cellIndex}`),
              );
            });
          }
          break;
      }
    });
  }

  if (input !== null && typeof input === "object") {
    collectBlocks((input as Record<string, unknown>).blocks, "/blocks");
  }
  return kinds;
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
      case "steps":
      case "code":
        break;
    }
  });
}

export function validatePlan(input: unknown): ValidationResult {
  if (!validateSchema(input)) {
    const discriminatedKinds = collectDiscriminatedKinds(input);
    return {
      ok: false,
      issues: schemaIssues(validateSchema.errors ?? [], discriminatedKinds),
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
