# heple

Make HTML plans with a good design. Always.

To be used by your agents.

heple turns a structured JSON plan into deterministic, self-contained HTML and opens it in your default browser.

## Why to use it

1. Consistently good designs for your HTML plans
2. Massive savings on tokens
3. I will be happy :)

## Installation

heple requires Node.js 24 or newer.

Install it globally with npm:

```sh
npm install --global heple
heple plan.json
```

Or run it without a global install:

```sh
npx heple@latest plan.json
```

## Usage

```text
heple plan.json # validate, render, and open a plan
heple plan.json --theme clay --output plan.html --no-open
heple plan.json --no-navigation
heple example # render and open the element catalog
heple validate plan.json # validate a plan without rendering it
heple schema # print the canonical JSON Schema
heple prompt # print plan-authoring instructions and a compact format example
heple themes # choose and save the default theme
```

Built-in themes are `default`, `caffeine`, `clay`, `supabase`, `twitter`, and `mono`.
Programmatic rendering also accepts a custom theme definition without registering a new built-in;
see [fixtures/custom-theme.json](./fixtures/custom-theme.json) for the complete shape.

## V1 complexity limits

Heple rejects plans that exceed these budgets. It reports validation diagnostics and never
silently truncates accepted content.

| Budget | V1 limit |
| --- | ---: |
| Blocks across the whole plan | 500 |
| Block nesting (top-level is 1; both `section` and `details` add a level) | 8 |
| Items in an ordinary collection, including block lists, inline content, list items, steps, metadata, and highlighted lines | 100 |
| Table dimensions | 20 columns, 200 rows, and 2,000 cells |
| Any non-code string | 10,000 Unicode characters |
| All strings in one plan, including code | 1,000,000 Unicode characters |
| One code block | 100,000 Unicode characters and 5,000 lines |

Sections retain their semantic heading limit of five nested section levels. Details do not
increase section heading depth, but do count toward the eight-level overall nesting budget.
Every `highlightLines` entry must refer to a line that exists in its code block.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev fixtures/implementation-plan.json --no-open
```

One-off HTML design studies belong in the local `examples/` directory. The entire directory is intentionally gitignored so experimental pages cannot be committed accidentally; no generation or build step depends on it.

## Roadmap

- [x] Accept custom theme definitions in the renderer
- [ ] Benchmarks for token savings
- [ ] Dashboard to configure org-wide theming
- [ ] Publish to your team or the world
- [ ] Changelog for each plan
