import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizePlan } from "../src/normalize.js";
import { renderPlan } from "../src/render.js";
import { validatePlan } from "../src/validate.js";

const INTEGRATION_DOCUMENTS = [
  "skills/heple/SKILL.md",
  "skills/heple/assets/AGENTS.md",
];

describe("Heple agent integration kit", () => {
  it("ships generated UI metadata for the installable skill", async () => {
    const metadata = await readFile("skills/heple/agents/openai.yaml", "utf8");

    expect(metadata).toContain('display_name: "Heple Plans"');
    expect(metadata).toContain('short_description: "Create validated visual plans with Heple"');
    expect(metadata).toContain(
      'default_prompt: "Use $heple to create and validate a visual implementation plan."',
    );
  });

  it("keeps every embedded JSON example valid and renderable", async () => {
    let exampleCount = 0;

    for (const path of INTEGRATION_DOCUMENTS) {
      const markdown = await readFile(path, "utf8");
      for (const match of markdown.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)) {
        exampleCount += 1;
        const source = match[1]?.trim();
        if (!source) throw new Error(`${path} contains an empty JSON example`);
        const input = JSON.parse(source);
        const result = validatePlan(input);

        expect(result, `${path} contains an invalid example`).toMatchObject({ ok: true });
        if (!result.ok) continue;
        expect(renderPlan(normalizePlan(result.value), { theme: "default" }))
          .toContain("<!doctype html>");
      }
    }

    expect(exampleCount).toBeGreaterThan(0);
  });
});
