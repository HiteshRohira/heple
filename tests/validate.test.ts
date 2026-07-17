import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  BLOCK_TYPES,
  getJsonSchema,
  INLINE_TYPES,
  V1_COMPLEXITY_BUDGETS,
  type Block,
  type PlanDocument,
} from "../src/schema.js";
import { validatePlan } from "../src/validate.js";

async function fixture(): Promise<unknown> {
  return JSON.parse(await readFile("fixtures/implementation-plan.json", "utf8"));
}

async function example(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile("example.json", "utf8")) as Record<string, unknown>;
}

const paragraph = (text = "Text"): Block => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

function detailsAtDepth(depth: number): Block {
  let block = paragraph();
  for (let level = 1; level < depth; level += 1) {
    block = {
      type: "details",
      summary: `Level ${level}`,
      blocks: [block],
    };
  }
  return block;
}

function blockCountPlan(childBlocksPerDetails: number[]): PlanDocument {
  return {
    version: "1",
    blocks: childBlocksPerDetails.map((count, index) => ({
      type: "details",
      summary: `Group ${index}`,
      blocks: Array.from({ length: count }, () => paragraph()),
    })),
  };
}

function tablePlan(columns: number, rows: number): PlanDocument {
  return {
    version: "1",
    blocks: [{
      type: "table",
      columns: Array.from({ length: columns }, (_, index) => ({
        label: `Column ${index}`,
      })),
      rows: Array.from({ length: rows }, () => ({
        cells: Array.from(
          { length: columns },
          () => [{ type: "text" as const, text: "Cell" }],
        ),
      })),
    }],
  };
}

function totalStringCharacters(value: unknown): number {
  if (typeof value === "string") return [...value].length;
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + totalStringCharacters(item), 0);
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).reduce(
      (total: number, item) => total + totalStringCharacters(item),
      0,
    );
  }
  return 0;
}

function planAtTotalStringBudget(): PlanDocument {
  const plan: PlanDocument = {
    version: "1",
    blocks: Array.from(
      { length: V1_COMPLEXITY_BUDGETS.collectionItems },
      () => ({
        type: "paragraph" as const,
        content: Array.from(
          { length: V1_COMPLEXITY_BUDGETS.collectionItems },
          () => ({ type: "text" as const, text: "x" }),
        ),
      }),
    ),
  };
  let remaining = V1_COMPLEXITY_BUDGETS.totalStringCharacters
    - totalStringCharacters(plan);

  for (const block of plan.blocks ?? []) {
    if (block.type !== "paragraph") continue;
    for (const inline of block.content) {
      if (inline.type !== "text" || remaining === 0) continue;
      const added = Math.min(
        remaining,
        V1_COMPLEXITY_BUDGETS.stringCharacters - inline.text.length,
      );
      inline.text += "x".repeat(added);
      remaining -= added;
    }
  }

  if (remaining !== 0) throw new Error("String-budget fixture could not be filled");
  return plan;
}

describe("validatePlan", () => {
  it("publishes the v1 budgets in the canonical schema", () => {
    expect(getJsonSchema()).toMatchObject({
      "x-heple-complexity-budgets": V1_COMPLEXITY_BUDGETS,
      properties: {
        title: { maxLength: V1_COMPLEXITY_BUDGETS.stringCharacters },
        blocks: { maxItems: V1_COMPLEXITY_BUDGETS.collectionItems },
      },
    });
  });

  it("accepts a document with no visible regions", () => {
    expect(validatePlan({ version: "1" })).toEqual({
      ok: true,
      value: { version: "1" },
    });
  });

  it("accepts the complete implementation-plan fixture", async () => {
    expect(validatePlan(await fixture())).toMatchObject({ ok: true });
  });

  it("ships a valid example covering every block and inline primitive", async () => {
    const input = await example();
    expect(validatePlan(input)).toMatchObject({ ok: true });

    const serialized = JSON.stringify(input);
    for (const type of BLOCK_TYPES) expect(serialized).toContain(`\"type\":\"${type}\"`);
    for (const type of INLINE_TYPES) expect(serialized).toContain(`\"type\":\"${type}\"`);
    for (const value of ["planned", "active", "done", "blocked"]) {
      expect(serialized).toContain(`\"${value}\"`);
    }
    for (const value of ["low", "medium", "high", "critical"]) {
      expect(serialized).toContain(`\"${value}\"`);
    }
    for (const tone of ["info", "warning", "success"]) {
      expect(serialized).toContain(`\"${tone}\"`);
    }
    expect(serialized).not.toContain('\"note\"');
  });

  it("rejects unknown properties", async () => {
    const plan = (await fixture()) as Record<string, unknown>;
    plan.rawHtml = "<script>alert(1)</script>";
    const result = validatePlan(plan);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        path: "/rawHtml",
        message: "must NOT have additional properties",
      });
    }
  });

  it("rejects the removed facts regions and note callout tone", () => {
    expect(validatePlan({ version: "1", facts: [{ label: "A", value: "B" }] }).ok).toBe(false);
    expect(validatePlan({
      version: "1",
      blocks: [{
        type: "callout",
        tone: "note",
        content: [{ type: "text", text: "Old tone" }],
      }],
    }).ok).toBe(false);
  });

  it("rejects unsafe links", () => {
    const result = validatePlan({
      version: "1",
      title: "Unsafe link",
      blocks: [
        {
          type: "paragraph",
          content: [{ type: "link", text: "run", href: "javascript:alert(1)" }],
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          path: "/blocks/0/content/0/href",
          message: "must use http, https, mailto, or a #fragment",
        },
      ],
    });
  });

  it("requires one table cell per column", () => {
    const result = validatePlan({
      version: "1",
      title: "Broken table",
      blocks: [
        {
          type: "table",
          columns: [{ label: "A" }, { label: "B" }],
          rows: [{ cells: [[{ type: "text", text: "only one" }]] }],
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      issues: [{ path: "/blocks/0/rows/0/cells", message: "must contain exactly 2 cells" }],
    });
  });

  it("rejects the removed checklist list style", () => {
    const result = validatePlan({
      version: "1",
      blocks: [
        {
          type: "list",
          style: "checklist",
          items: [{ content: [{ type: "text", text: "Old item" }], checked: true }],
        },
      ],
    });

    expect(result.ok).toBe(false);
  });

  it("accepts exactly the total block limit and rejects one extra block", () => {
    const atLimit = blockCountPlan([99, 99, 99, 99, 99]);
    expect(validatePlan(atLimit)).toMatchObject({ ok: true });

    const overLimit = blockCountPlan([99, 99, 99, 99, 100]);
    expect(validatePlan(overLimit)).toEqual({
      ok: false,
      issues: [{
        path: "/blocks",
        message: "plan may contain at most 500 blocks in total (v1 limit)",
      }],
    });
  });

  it("counts details in the overall nesting budget", () => {
    expect(validatePlan({
      version: "1",
      blocks: [detailsAtDepth(V1_COMPLEXITY_BUDGETS.blockNestingDepth)],
    })).toMatchObject({ ok: true });

    const result = validatePlan({
      version: "1",
      blocks: [detailsAtDepth(V1_COMPLEXITY_BUDGETS.blockNestingDepth + 1)],
    });
    expect(result).toMatchObject({
      ok: false,
      issues: [{
        message: "blocks may be nested at most 8 levels including sections and details (v1 limit)",
      }],
    });
  });

  it("does not recursively inspect unknown schema properties", () => {
    let unknown: Record<string, unknown> = {};
    for (let depth = 0; depth < 20_000; depth += 1) {
      unknown = { unknown };
    }

    expect(validatePlan({ version: "1", unknown })).toEqual({
      ok: false,
      issues: [{
        path: "/unknown",
        message: "must NOT have additional properties",
      }],
    });
  });

  it("accepts ordinary collections at the limit and diagnoses an extra item", () => {
    const content = Array.from(
      { length: V1_COMPLEXITY_BUDGETS.collectionItems },
      () => ({ type: "text" as const, text: "x" }),
    );
    expect(validatePlan({
      version: "1",
      blocks: [{ type: "paragraph", content }],
    })).toMatchObject({ ok: true });

    const result = validatePlan({
      version: "1",
      blocks: [{ type: "paragraph", content: [...content, { type: "text", text: "x" }] }],
    });
    expect(result).toEqual({
      ok: false,
      issues: [{
        path: "/blocks/0/content",
        message: "must contain at most 100 items (v1 limit)",
      }],
    });
  });

  it("bounds table dimensions and aggregate cell density", () => {
    expect(validatePlan(tablePlan(V1_COMPLEXITY_BUDGETS.tableColumns, 1)))
      .toMatchObject({ ok: true });
    expect(validatePlan(tablePlan(1, V1_COMPLEXITY_BUDGETS.tableRows)))
      .toMatchObject({ ok: true });
    expect(validatePlan(tablePlan(10, 200))).toMatchObject({ ok: true });

    const tooManyColumns = validatePlan(
      tablePlan(V1_COMPLEXITY_BUDGETS.tableColumns + 1, 1),
    );
    expect(tooManyColumns.ok).toBe(false);
    if (!tooManyColumns.ok) {
      expect(tooManyColumns.issues).toContainEqual({
        path: "/blocks/0/columns",
        message: "must contain at most 20 items (v1 limit)",
      });
    }
    expect(validatePlan(tablePlan(1, V1_COMPLEXITY_BUDGETS.tableRows + 1)))
      .toMatchObject({
        ok: false,
        issues: [{
          path: "/blocks/0/rows",
          message: "must contain at most 200 items (v1 limit)",
        }],
      });
    expect(validatePlan(tablePlan(11, 182))).toMatchObject({
      ok: false,
      issues: [{
        path: "/blocks/0/rows",
        message: "table may contain at most 2000 cells (v1 limit)",
      }],
    });
  });

  it("measures Unicode strings by code point and accepts bidirectional text", () => {
    const atLimit = `مرحبا \u202E${"😀".repeat(
      V1_COMPLEXITY_BUDGETS.stringCharacters - 7,
    )}`;
    expect([...atLimit]).toHaveLength(V1_COMPLEXITY_BUDGETS.stringCharacters);
    expect(validatePlan({ version: "1", title: atLimit })).toMatchObject({ ok: true });

    expect(validatePlan({ version: "1", title: `${atLimit}x` })).toEqual({
      ok: false,
      issues: [{
        path: "/title",
        message: "must contain at most 10000 Unicode characters (v1 string limit)",
      }],
    });
  });

  it("bounds aggregate string content without truncating an at-limit plan", () => {
    const atLimit = planAtTotalStringBudget();
    expect(totalStringCharacters(atLimit))
      .toBe(V1_COMPLEXITY_BUDGETS.totalStringCharacters);
    expect(validatePlan(atLimit)).toMatchObject({ ok: true });

    const firstBlock = atLimit.blocks?.[0];
    if (firstBlock?.type !== "paragraph" || firstBlock.content[99]?.type !== "text") {
      throw new Error("Unexpected string-budget fixture");
    }
    firstBlock.content[99].text += "x";
    expect(validatePlan(atLimit)).toMatchObject({
      ok: false,
      issues: [{
        path: "/",
        message: "plan strings must contain at most 1000000 Unicode characters in total (v1 limit)",
      }],
    });
  });

  it("accepts code at its character and line limits and rejects overages", () => {
    const codeAtCharacterLimit = "x".repeat(V1_COMPLEXITY_BUDGETS.codeCharacters);
    expect(validatePlan({
      version: "1",
      blocks: [{ type: "code", code: codeAtCharacterLimit }],
    })).toMatchObject({ ok: true });
    expect(validatePlan({
      version: "1",
      blocks: [{ type: "code", code: `${codeAtCharacterLimit}x` }],
    })).toMatchObject({
      ok: false,
      issues: [{
        path: "/blocks/0/code",
        message: "must contain at most 100000 Unicode characters (v1 code limit)",
      }],
    });

    const codeAtLineLimit = "\n".repeat(V1_COMPLEXITY_BUDGETS.codeLines - 1);
    expect(validatePlan({
      version: "1",
      blocks: [{ type: "code", code: codeAtLineLimit }],
    })).toMatchObject({ ok: true });
    expect(validatePlan({
      version: "1",
      blocks: [{ type: "code", code: `${codeAtLineLimit}\n` }],
    })).toMatchObject({
      ok: false,
      issues: [{
        path: "/blocks/0/code",
        message: "must contain at most 5000 lines (v1 code limit)",
      }],
    });
  });

  it("requires every highlighted line to exist in the code block", () => {
    expect(validatePlan({
      version: "1",
      blocks: [{ type: "code", code: "one\ntwo", highlightLines: [2] }],
    })).toMatchObject({ ok: true });

    expect(validatePlan({
      version: "1",
      blocks: [{ type: "code", code: "one\ntwo", highlightLines: [3] }],
    })).toEqual({
      ok: false,
      issues: [{
        path: "/blocks/0/highlightLines/0",
        message: "must reference an existing code line (code has 2 lines)",
      }],
    });
  });
});
