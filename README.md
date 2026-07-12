# heple

heple turns a structured JSON plan into deterministic, self-contained HTML and opens it in your default browser.

```sh
pnpm install
pnpm build
node dist/cli.js fixtures/implementation-plan.json
```

During development:

```sh
pnpm dev fixtures/implementation-plan.json --no-open
```

## Commands

```text
heple plan.json
heple plan.json --theme paper --output plan.html --no-open
heple plan.json --navigation
heple validate plan.json
heple schema
heple prompt
heple themes
```

Use `heple prompt` to give a model both the authoring instructions and canonical JSON Schema. The plan format accepts a constrained set of semantic blocks and inline content; it never accepts arbitrary HTML, CSS, or JavaScript.

Available themes are `paper`, `midnight`, and `system`.

Visible document regions are optional. If title, summary, facts, or blocks are absent, heple leaves them out without rendering placeholders. Section navigation is also off by default; pass `--navigation` to enable the right-side hover rail.

## Development

```sh
pnpm typecheck
pnpm test
pnpm build
```
