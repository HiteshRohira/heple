import { BLOCK_TYPES, INLINE_TYPES } from "./schema.js";

export function getModelPrompt(): string {
  return `Create a heple plan and save it as plan.json.

Workflow:
1. Write valid JSON to plan.json. Do not use Markdown fences in the file.
2. Optionally check it with: heple validate plan.json
3. Generate plan.html and open it with: heple plan.json

For a different destination or no browser launch, run:
heple plan.json --output path/to/plan.html --no-open

Plan rules:
- Set the top-level version to "1". Title, summary, language, and blocks are optional.
- Block types: ${BLOCK_TYPES.join(", ")}.
- Inline types: ${INLINE_TYPES.join(", ")}.
- Omit empty optional regions.
- Describe meaning, not HTML, CSS, JavaScript, colors, or coordinates.
- Use section nesting for headings; do not encode heading levels.
- Links may use http, https, mailto, or #fragment targets.
- Every table row must have exactly one cell per declared column.

Run heple schema only if you need the exact JSON Schema.`;
}
