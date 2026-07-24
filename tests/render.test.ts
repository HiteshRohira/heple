import { readFile } from "node:fs/promises";
import { HtmlValidate } from "html-validate";
import { beforeAll, describe, expect, it } from "vitest";
import { AUTHORING_EXAMPLE, getModelPrompt } from "../src/prompt.js";
import { normalizePlan } from "../src/normalize.js";
import { renderPlan } from "../src/render.js";
import {
  BLOCK_TYPES,
  getJsonSchema,
  INLINE_TYPES,
  THEME_NAMES,
  type PlanDocument,
} from "../src/schema.js";
import { validatePlan } from "../src/validate.js";
import type { ThemeDefinition } from "../src/themes.js";

let plan: PlanDocument;
const htmlValidator = new HtmlValidate({
  extends: ["html-validate:recommended", "html-validate:a11y"],
  rules: { "heading-level": "error" },
});

async function expectValidSemanticHtml(html: string): Promise<void> {
  const report = await htmlValidator.validateString(html);
  expect(
    report.results.flatMap((result) =>
      result.messages.map(({ ruleId, message, line, column }) => ({
        ruleId,
        message,
        line,
        column,
      })),
    ),
  ).toEqual([]);
}

beforeAll(async () => {
  const input = JSON.parse(await readFile("fixtures/implementation-plan.json", "utf8"));
  const result = validatePlan(input);
  if (!result.ok) throw new Error("Fixture must be valid");
  plan = normalizePlan(result.value);
});

describe("renderPlan", () => {
  it("matches the representative golden and repeated renders byte-for-byte", async () => {
    const rendered = renderPlan(structuredClone(plan), { theme: "default" });
    const repeated = renderPlan(structuredClone(plan), { theme: "default" });
    const golden = await readFile(
      "tests/goldens/implementation-plan.default.html.golden",
      "utf8",
    );

    expect(repeated).toBe(rendered);
    expect(rendered).toBe(golden);
  });

  it("produces self-contained semantic HTML", async () => {
    const html = renderPlan(plan, { theme: "default" });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<nav class="toc"');
    expect(html).toContain("<details>");
    expect(html).toContain("<table>");
    expect(html).toContain('class="copy-code"');
    expect(html).toContain("navigator.clipboard.writeText");
    expect(html).toContain('class="mode-toggle"');
    expect(html).toContain('class="mode-icon mode-icon-light"');
    expect(html).toContain('class="mode-icon mode-icon-dark"');
    expect(html).not.toContain("data-mode-label");
    expect(html).toContain('data-mode="dark"');
    expect(html).toContain('devicePreference.addEventListener("change"');
    expect(html).toContain('localStorage.setItem("heple-mode"');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain(".callout-info { border-left-color: var(--info); background: var(--info-soft); }");
    expect(html).not.toContain('class="facts"');
    expect(html).not.toMatch(/https:\/\/[^\"]+\.(css|js)/);
    expect(html).not.toMatch(/<dl|<dt|<dd/);
    await expectValidSemanticHtml(html);

    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
      (match) => match[1] ?? "",
    );
    expect(scripts).toHaveLength(2);
    for (const script of scripts) expect(() => new Function(script)).not.toThrow();
  });

  it("uses readable mode-aware code colors and compact line spacing in every theme", () => {
    for (const theme of THEME_NAMES) {
      const html = renderPlan(plan, { theme });

      expect(html).toMatch(/--code-bg: color-mix\(in srgb, [^\n]+ 90%, [^\n]+\);/);
      expect(html).toContain("--code-text:");
      expect(html).toContain("--code-muted:");
      expect(html).toContain("--code-border:");
      expect(html).toContain("--code-highlight:");
      expect(html).toContain("border-bottom: 1px solid var(--code-border)");
      expect(html).toContain("border: 1px solid var(--code-border)");
      expect(html).toContain("background: var(--code-highlight)");
      expect(html).toContain("font: .84rem/.75rem var(--font-mono)");
      expect(html).not.toContain("border-bottom: 1px solid #ffffff22");
    }
  });

  it("uses theme-specific status palettes with clearly separated badge treatments", () => {
    const expectedPalettes = {
      default: ["oklch(0.488 0.243 264.376)", "oklch(0.6 0.118 184.704)"],
      caffeine: ["#644a40", "#65734f"],
      clay: ["#6366f1", "#16805a"],
      supabase: ["#3b82f6", "#10b981"],
      twitter: ["#1e9df1", "#00b87a"],
      mono: ["#737373", "#525252"],
    } satisfies Record<(typeof THEME_NAMES)[number], [string, string]>;

    for (const theme of THEME_NAMES) {
      const html = renderPlan(plan, { theme });
      const [info, success] = expectedPalettes[theme];

      expect(html).toContain(`--info: ${info};`);
      expect(html).toContain(`--success: ${success};`);
      expect(html).toContain("--info-soft: color-mix(in srgb, var(--info) 18%");
      expect(html).toContain("--info-border: color-mix(in srgb, var(--info) 58%");
      expect(html).toContain("--danger-border: color-mix(in srgb, var(--danger) 58%");
    }

    expect(renderPlan(plan, { theme: "twitter" })).toContain("--sidebar: #f7f8f8;");
    expect(renderPlan(plan, { theme: "clay" })).toContain("--sidebar-accent: #f3e5f5;");
    expect(renderPlan(plan, { theme: "mono" })).toContain("--sidebar-border: #ffffff;");
  });

  it("renders a custom theme definition without adding it to the built-in theme list", () => {
    const customTheme: ThemeDefinition = {
      description: "Test theme",
      radius: "0.5rem",
      fontSans: "system-ui, sans-serif",
      fontMono: "monospace",
      shadow: "none",
      light: {
        background: "#f7f8fa",
        foreground: "#121212",
        surface: "#ffffff",
        raised: "#eeeeee",
        muted: "#666666",
        border: "#dddddd",
        accent: "#86a8c5",
        accentForeground: "#000000",
        accentSoft: "#e5edf4",
        danger: "#b42318",
      },
      dark: {
        background: "#121212",
        foreground: "#f7f8fa",
        surface: "#202020",
        raised: "#2a2a2a",
        muted: "#aaaaaa",
        border: "#444444",
        accent: "#86a8c5",
        accentForeground: "#000000",
        accentSoft: "#31404d",
        danger: "#ff7b6b",
      },
    };
    const html = renderPlan(plan, { theme: customTheme });

    expect(html).toContain("--bg: #f7f8fa");
    expect(html).toContain("--accent: #86a8c5");
    expect(THEME_NAMES).toEqual([
      "default",
      "caffeine",
      "clay",
      "supabase",
      "twitter",
      "mono",
    ]);
  });

  it("renders navigation by default and targets offset section containers", () => {
    const html = renderPlan(plan, { theme: "default" });

    expect(html).toContain('<nav class="toc" aria-label="Plan sections">');
    expect(html).toContain('class="toc-dots"');
    expect(html).toContain('href="#section-1" data-fragment-link');
    expect(html).not.toContain('href="#section-1" target="_blank"');
    expect(html).toContain('<section class="section" id="section-1"');
    expect(html).toContain("scroll-margin-top: 28px");
    expect(html).toContain("padding: 6px 10px");
    expect(html).toContain("border-radius: var(--radius)");
  });

  it("uses document-local behavior for stable section fragments", () => {
    const fragmentPlan: PlanDocument = {
      version: "1",
      title: "Link behavior",
      blocks: [
        {
          type: "paragraph",
          content: [
            { type: "link", text: "Jump", href: "#section-2" },
            { type: "link", text: "External", href: "https://example.com" },
          ],
        },
        {
          type: "section",
          title: "Stable target",
          blocks: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Target content" }],
            },
          ],
        },
      ],
    };
    const html = renderPlan(fragmentPlan, { theme: "default" });

    expect(html).toContain('<a href="#section-2" data-fragment-link>Jump</a>');
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">External</a>',
    );
    expect(html).toContain('<section class="section" id="section-2"');
  });

  it("reveals fragment targets inside closed details", () => {
    const hiddenSectionPlan: PlanDocument = {
      version: "1",
      blocks: [
        {
          type: "details",
          summary: "Closed",
          blocks: [
            {
              type: "section",
              title: "Hidden section",
              blocks: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Hidden content" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const html = renderPlan(hiddenSectionPlan, { theme: "default" });

    expect(html).toContain('href="#section-1-1" data-fragment-link');
    expect(html).toContain('<section class="section" id="section-1-1"');
    expect(html).toContain(
      "if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;",
    );
    expect(html).toContain("let clickedFragmentHash = \"\";");
    expect(html).toContain(
      "const clicked = clickedFragmentHash === window.location.hash;",
    );
    expect(html).toContain("if (target && !clicked) {");
    expect(html).toContain('window.addEventListener("hashchange"');
    expect(html).toContain("const initialTarget = revealFragment(window.location.hash);");
  });

  it("keeps heading levels sequential with or without a document title", async () => {
    const nestedBlocks: PlanDocument["blocks"] = [
      {
        type: "section",
        title: "Top section",
        blocks: [
          {
            type: "section",
            title: "Nested section",
            blocks: [
              {
                type: "steps",
                items: [{ title: "List item title" }],
              },
            ],
          },
        ],
      },
    ];
    const titled = renderPlan(
      { version: "1", title: "Document title", blocks: nestedBlocks },
      { theme: "default" },
    );
    const untitled = renderPlan(
      { version: "1", summary: "Summary only", blocks: nestedBlocks },
      { theme: "default" },
    );

    expect(titled).toContain("<h1>Document title</h1>");
    expect(titled).toContain('<h2 class="section-title"');
    expect(titled).toContain('<h3 class="section-title"');
    expect(untitled).toContain('<h1 class="section-title"');
    expect(untitled).toContain('<h2 class="section-title"');
    expect(untitled).not.toContain("<h3>List item title");
    expect(untitled).toContain('<strong class="step-title">List item title ');
    expect(untitled).toContain(
      ".section > .section-title { margin: 0 0 18px;",
    );
    expect(untitled).not.toContain("main > .section > .section-title");
    await expectValidSemanticHtml(titled);
    await expectValidSemanticHtml(untitled);
  });

  it("omits navigation when disabled", () => {
    const html = renderPlan(plan, { theme: "default", navigation: false });

    expect(html).not.toContain('<nav class="toc"');
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
    const html = renderPlan(hostile, { theme: "mono" });

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

  it("provides the authoring workflow and a compact, valid format example", () => {
    const prompt = getModelPrompt();
    expect(prompt).toContain("heple validate plan.json");
    expect(prompt).toContain("Validation is mandatory");
    expect(prompt).toContain("heple plan.json --output ./plan.html --no-open");
    expect(prompt).toContain(`Reference JSON:\n${JSON.stringify(AUTHORING_EXAMPLE)}`);
    expect(prompt).not.toContain("additionalProperties");
    expect(prompt).not.toContain("minLength");
    expect(prompt.length).toBeLessThan(JSON.stringify(getJsonSchema(), null, 2).length / 2);
  });

  it("keeps the compact authoring example aligned with every schema primitive", () => {
    const validation = validatePlan(AUTHORING_EXAMPLE);
    expect(validation).toMatchObject({ ok: true });
    if (!validation.ok) throw new Error("Authoring example must be valid");
    expect(renderPlan(normalizePlan(validation.value), { theme: "default" }))
      .toContain("<!doctype html>");

    const serialized = JSON.stringify(AUTHORING_EXAMPLE);
    for (const type of BLOCK_TYPES) expect(serialized).toContain(`\"type\":\"${type}\"`);
    for (const type of INLINE_TYPES) expect(serialized).toContain(`\"type\":\"${type}\"`);
  });
});
