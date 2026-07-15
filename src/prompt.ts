import { getJsonSchema } from "./schema.js";

export function getModelPrompt(): string {
  return `Create a heple plan and save it as plan.json.

Workflow:
1. Write valid JSON to plan.json. Do not use Markdown fences in the file.
2. Optionally check it with: heple validate plan.json
3. Generate plan.html and open it with: heple plan.json

For a different destination or no browser launch, run:
heple plan.json --output path/to/plan.html --no-open

The plan must match this JSON Schema:
${JSON.stringify(getJsonSchema(), null, 2)}`;
}
