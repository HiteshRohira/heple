import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { getModelPrompt } from "../src/prompt.js";
import { normalizePlan } from "../src/normalize.js";
import { renderPlan } from "../src/render.js";
import { BLOCK_TYPES, getJsonSchema, type PlanDocument } from "../src/schema.js";
import { validatePlan } from "../src/validate.js";

let plan: PlanDocument;

beforeAll(async () => {
  const input = JSON.parse(await readFile("fixtures/implementation-plan.json", "utf8"));
  const result = validatePlan(input);
  if (!result.ok) throw new Error("Fixture must be valid");
  plan = normalizePlan(result.value);
});

describe("renderPlan", () => {
  it("is deterministic for the same plan and theme", () => {
    expect(renderPlan(plan, { theme: "signal" })).toBe(renderPlan(plan, { theme: "signal" }));
  });

  it("produces self-contained semantic HTML", () => {
    const html = renderPlan(plan, { theme: "signal" });

    expect(html).toContain("<!doctype html>");
    expect(html).not.toContain('<nav class="toc"');
    expect(html).toContain("<details>");
    expect(html).toContain("<table>");
    expect(html).toContain('class="copy-code"');
    expect(html).toContain("navigator.clipboard.writeText");
    expect(html).toContain('class="mode-toggle"');
    expect(html).toContain('data-mode="dark"');
    expect(html).toContain('localStorage.setItem("heple-mode"');
    expect(html).not.toMatch(/https:\/\/[^\"]+\.(css|js)/);
    expect(html).not.toMatch(/<dl|<dt|<dd/);

    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
      (match) => match[1] ?? "",
    );
    expect(scripts).toHaveLength(2);
    for (const script of scripts) expect(() => new Function(script)).not.toThrow();
  });

  it("renders navigation only when requested and targets offset section containers", () => {
    const html = renderPlan(plan, { theme: "signal", navigation: true });

    expect(html).toContain('<nav class="toc" aria-label="Plan sections" tabindex="0">');
    expect(html).toContain('class="toc-dots"');
    expect(html).toContain('href="#section-1"');
    expect(html).toContain('<section class="section" id="section-1"');
    expect(html).toContain("scroll-margin-top: 28px");
  });

  it("escapes every model-authored text position", () => {
    const hostile: PlanDocument = {
      version: "1",
      title: "</title><script>alert(1)</script>",
      blocks: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "<img src=x onerror=alert(1)>" }],
        },
      ],
    };
    const html = renderPlan(hostile, { theme: "orchid" });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});

describe("normalizePlan", () => {
  it("applies deterministic defaults without mutating the input", () => {
    const input: PlanDocument = {
      version: "1",
      title: "Defaults",
      blocks: [
        {
          type: "list",
          items: [{ content: [{ type: "text", text: "One" }] }],
        },
      ],
    };

    const normalized = normalizePlan(input);
    expect(normalized.language).toBe("en");
    expect(normalized.blocks?.[0]).toMatchObject({ type: "list", style: "unordered" });
    expect(input).not.toHaveProperty("language");
    expect(input.blocks?.[0]).not.toHaveProperty("style");
  });
});

describe("model contract", () => {
  it("publishes the canonical v1 schema", () => {
    expect(getJsonSchema()).toMatchObject({
      $id: "https://heple.dev/schema/v1.json",
      $schema: "https://json-schema.org/draft/2020-12/schema",
    });
  });

  it("derives prompt vocabulary from the exported block types", () => {
    const prompt = getModelPrompt();
    for (const type of BLOCK_TYPES) expect(prompt).toContain(type);
    expect(prompt).toContain(JSON.stringify(getJsonSchema(), null, 2));
  });
});
