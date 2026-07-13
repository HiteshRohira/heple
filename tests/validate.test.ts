import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { BLOCK_TYPES, INLINE_TYPES } from "../src/schema.js";
import { validatePlan } from "../src/validate.js";

async function fixture(): Promise<unknown> {
  return JSON.parse(await readFile("fixtures/implementation-plan.json", "utf8"));
}

async function example(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile("example.json", "utf8")) as Record<string, unknown>;
}

describe("validatePlan", () => {
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
});
