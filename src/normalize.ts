import type { Block, PlanDocument } from "./schema.js";

function normalizeBlocks(blocks: Block[]): void {
  for (const block of blocks) {
    switch (block.type) {
      case "section":
      case "details":
        normalizeBlocks(block.blocks);
        break;
      case "list":
        block.style ??= "unordered";
        break;
      case "callout":
        block.tone ??= "info";
        break;
      case "table":
        for (const column of block.columns) column.align ??= "left";
        break;
      case "code":
        if (block.highlightLines) {
          block.highlightLines = [...block.highlightLines].sort((left, right) => left - right);
        }
        break;
      case "paragraph":
      case "steps":
        break;
    }
  }
}

export function normalizePlan(plan: PlanDocument): PlanDocument {
  const normalized = structuredClone(plan);
  normalized.language ??= "en";
  normalizeBlocks(normalized.blocks ?? []);
  return normalized;
}
