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
heple validate plan.json --json # validate with the versioned JSON protocol
heple plan.json --json --no-open # render with the versioned JSON protocol
heple schema # print the canonical JSON Schema
heple prompt # print plan-authoring instructions and a compact format example
heple themes # choose and save the default theme
```

Built-in themes are `default`, `caffeine`, `clay`, `supabase`, `twitter`, and `mono`.
Programmatic rendering also accepts a custom theme definition without registering a new built-in;
see [fixtures/custom-theme.json](./fixtures/custom-theme.json) for the complete shape.

Automated callers can add `--json` to validation or rendering without changing the
default browser-opening behavior. Successful envelopes are written to stdout, error
envelopes are written to stderr, and invalid input exits differently from operational
failures. The complete stable contract is documented in
[docs/cli-protocol-v1.md](./docs/cli-protocol-v1.md).

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev fixtures/implementation-plan.json --no-open
```

## Roadmap

- [x] Accept custom theme definitions in the renderer
- [ ] Benchmarks for token savings
- [ ] Dashboard to configure org-wide theming
- [ ] Publish to your team or the world
- [ ] Review flow for published plans
- [ ] Changelog for each plan
