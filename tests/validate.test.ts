import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validatePlan } from "../src/validate.js";

async function fixture(): Promise<unknown> {
  return JSON.parse(await readFile("fixtures/implementation-plan.json", "utf8"));
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
