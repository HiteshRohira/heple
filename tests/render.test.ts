import { readFile } from "node:fs/promises";
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

beforeAll(async () => {
  const input = JSON.parse(await readFile("fixtures/implementation-plan.json", "utf8"));
  const result = validatePlan(input);
  if (!result.ok) throw new Error("Fixture must be valid");
  plan = normalizePlan(result.value);
});

describe("renderPlan", () => {
  it("is deterministic for the same plan and theme", () => {
    expect(renderPlan(plan, { theme: "default" })).toBe(renderPlan(plan, { theme: "default" }));
  });

  it("produces self-contained semantic HTML", () => {
    const html = renderPlan(plan, { theme: "default" });

    expect(html).toContain("<!doctype html>");
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

  it("renders a custom theme definition without adding it to the built-in theme list", async () => {
    const customTheme = JSON.parse(
      await readFile("custom-theme.json", "utf8"),
    ) as ThemeDefinition;
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

  it("rejects incomplete or unsafe custom theme values", async () => {
    const customTheme = JSON.parse(
      await readFile("custom-theme.json", "utf8"),
    ) as ThemeDefinition;

    expect(() =>
      renderPlan(plan, {
        theme: {
          ...customTheme,
          light: { ...customTheme.light, accent: "</style><script>alert(1)</script>" },
        },
      }),
    ).toThrow("/light/accent: must be a single safe CSS value");

    const missingBackground = structuredClone(customTheme) as ThemeDefinition & {
      light: Partial<ThemeDefinition["light"]>;
    };
    delete missingBackground.light.background;
    expect(() =>
      renderPlan(plan, { theme: missingBackground as ThemeDefinition }),
    ).toThrow("/light/background: must be a non-empty string");

    expect(() =>
      renderPlan(plan, {
        theme: {
          ...customTheme,
          dark: { ...customTheme.dark, background: "url(https://example.com/pixel)" },
        },
      }),
    ).toThrow("/dark/background: must not load an external resource");

    for (const background of [
      'image("https://example.com/pixel.png")',
      'src("https://example.com/pixel.png")',
    ]) {
      expect(() =>
        renderPlan(plan, {
          theme: {
            ...customTheme,
            dark: { ...customTheme.dark, background },
          },
        }),
      ).toThrow("/dark/background: must not load an external resource");
    }

    expect(() =>
      renderPlan(plan, {
        theme: {
          ...customTheme,
          dark: { ...customTheme.dark, background: "u\\72l(https://example.com/pixel)" },
        },
      }),
    ).toThrow("/dark/background: must be a single safe CSS value");
  });

  it("renders navigation by default and targets offset section containers", () => {
    const html = renderPlan(plan, { theme: "default" });

    expect(html).toContain('<nav class="toc" aria-label="Plan sections" tabindex="0">');
    expect(html).toContain('class="toc-dots"');
    expect(html).toContain('href="#section-1"');
    expect(html).not.toContain('href="#section-1" target="_blank"');
    expect(html).toContain('<section class="section" id="section-1"');
    expect(html).toContain("scroll-margin-top: 28px");
    expect(html).toContain("padding: 6px 10px");
    expect(html).toContain("border-radius: var(--radius)");
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
    expect(prompt).toContain("heple plan.json");
    expect(prompt).toContain(`Reference JSON:\n${JSON.stringify(AUTHORING_EXAMPLE)}`);
    expect(prompt).not.toContain("additionalProperties");
    expect(prompt).not.toContain("minLength");
    expect(prompt.length).toBeLessThan(JSON.stringify(getJsonSchema(), null, 2).length / 2);
  });

  it("keeps the compact authoring example aligned with every schema primitive", () => {
    expect(validatePlan(AUTHORING_EXAMPLE)).toMatchObject({ ok: true });

    const serialized = JSON.stringify(AUTHORING_EXAMPLE);
    for (const type of BLOCK_TYPES) expect(serialized).toContain(`\"type\":\"${type}\"`);
    for (const type of INLINE_TYPES) expect(serialized).toContain(`\"type\":\"${type}\"`);
  });
});
