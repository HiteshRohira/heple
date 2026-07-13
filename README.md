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
heple plan.json --theme signal --output plan.html --no-open
heple plan.json --navigation
heple example
heple validate plan.json
heple schema
heple prompt
heple themes
```

Use `heple prompt` to give a model both the authoring instructions and canonical JSON Schema. The plan format accepts a constrained set of semantic blocks and inline content; it never accepts arbitrary HTML, CSS, or JavaScript.

Available themes are `signal`, `orchid`, and `circuit`. Every theme includes coordinated light and dark modes; generated pages contain a visible mode toggle and remember the reader's choice locally.

Run `heple example` to render and open the shipped [element catalog](./example.json). It demonstrates every v1 block, inline primitive, tone, status, severity, table alignment, and optional rendering field. The example enables section navigation by default; pass `--no-navigation` to hide it.

Visible document regions are optional. If title, summary, facts, or blocks are absent, heple leaves them out without rendering placeholders. Section navigation is also off by default; pass `--navigation` to enable the right-side hover rail.

## Development

```sh
pnpm typecheck
pnpm test
pnpm build
```
