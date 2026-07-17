import { AGENT_COMMANDS } from "./capabilities.js";
import type { PlanDocument } from "./schema.js";

export const AUTHORING_EXAMPLE = {
  version: "1",
  title: "Example title",
  summary: "Summary",
  language: "en",
  blocks: [
    {
      type: "section",
      title: "Section",
      blocks: [
        {
          type: "details",
          summary: "Details",
          open: true,
          blocks: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Text " },
                { type: "link", text: "link", href: "https://example.com" },
                { type: "strong", text: " strong" },
                { type: "emphasis", text: " emphasis" },
                { type: "code", text: "code" },
                { type: "status", value: "active" },
                { type: "severity", value: "high" },
              ],
            },
            {
              type: "list",
              style: "unordered",
              items: [{ content: [{ type: "text", text: "Item" }] }],
            },
            {
              type: "callout",
              tone: "info",
              title: "Callout",
              content: [{ type: "text", text: "Content" }],
            },
            {
              type: "steps",
              items: [{
                title: "Step",
                description: "Description",
                status: "planned",
                meta: [{ label: "Owner", value: "Team" }],
              }],
            },
            {
              type: "table",
              caption: "Table",
              columns: [{ label: "Column", align: "left" }],
              rows: [{ cells: [[{ type: "text", text: "Cell" }]] }],
            },
            {
              type: "code",
              code: "const value = 1;",
              language: "js",
              filename: "file.js",
              caption: "Code",
              highlightLines: [1],
            },
          ],
        },
      ],
    },
  ],
} satisfies PlanDocument;

export function getModelPrompt(): string {
  return `Create a heple plan and save it as plan.json.

  Workflow:
  1. Write valid JSON to plan.json. Do not use Markdown fences in the file.
  2. Validate it with: ${AGENT_COMMANDS.validate}
  3. Validation is mandatory. Fix every diagnostic and rerun step 2 until it succeeds.
  4. Render without browser interaction: ${AGENT_COMMANDS.renderNonInteractive}

  Use only the JSON shapes demonstrated below. Root blocks, sections, and details can contain any block shape. Omit/add fields and items as needed.
  Choices: list style unordered|ordered; callout tone info|warning|success; status planned|active|done|blocked; severity low|medium|high|critical; column align left|center|right.
  Reference JSON:
${JSON.stringify(AUTHORING_EXAMPLE)}`;
}
