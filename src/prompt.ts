import { BLOCK_TYPES, INLINE_TYPES, getJsonSchema } from "./schema.js";

export function getModelPrompt(): string {
  return `Create a heple plan as JSON that validates against the schema below.

Rules:
- Return JSON only. Do not wrap it in Markdown fences.
- Use schema version "1".
- Title, summary, and blocks are optional; omit any document region that has no content.
- Describe meaning, never HTML, CSS, JavaScript, colors, or layout coordinates.
- Available block types: ${BLOCK_TYPES.join(", ")}.
- Available inline types: ${INLINE_TYPES.join(", ")}.
- Use section nesting for headings; do not encode heading levels.
- Links may use http, https, mailto, or #fragment targets.
- Every table row must have exactly one cell per declared column.

JSON Schema:
${JSON.stringify(getJsonSchema(), null, 2)}`;
}
