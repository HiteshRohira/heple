---
name: heple
description: Create validated, deterministic HTML plans with the Heple CLI. Use when an agent needs to turn an implementation plan, rollout, decision record, comparison, risk assessment, or other structured planning content into a polished local HTML artifact.
---

# Heple

Create `plan.json` as the source of truth, validate it, then render it with Heple. Require Node.js 24 or newer and an available `heple` command before starting.

## Workflow

1. Inspect the live contract. Run `heple capabilities`. Use its `documentSchema` as authoritative; use `heple prompt` for compact authoring guidance.
2. Write JSON only to `plan.json`. Never add raw HTML, CSS, JavaScript, Markdown fences, or fields absent from the schema.
3. Run `heple validate plan.json`. Validation is mandatory. If it fails, fix every diagnostic and rerun until it prints `Plan is valid`.
4. Render safely for automation:

   ```sh
   heple plan.json --output ./plan.html --no-open
   ```

5. Report the JSON source and HTML artifact paths. Omit `--no-open` only when the user explicitly wants the browser opened.

Use renderer-owned themes and navigation flags only when requested. Prefer sections for hierarchy, steps for sequences, tables for comparisons, callouts for constraints or outcomes, and details for supporting material.

## Minimal document

```json
{
  "version": "1",
  "title": "Implementation plan",
  "blocks": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Ship the validated change." }]
    }
  ]
}
```

To make Heple the default for suitable plans in a repository, merge the concise snippet from `assets/AGENTS.md` into that repository's `AGENTS.md`.
