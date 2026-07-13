import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { PlanDocumentSchema, type Block, type Inline, type PlanDocument } from "./schema.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: PlanDocument }
  | { ok: false; issues: ValidationIssue[] };

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile<PlanDocument>(PlanDocumentSchema);

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
      case "steps":
      case "code":
        break;
    }
  });
}

export function validatePlan(input: unknown): ValidationResult {
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
