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
Programmatic rendering also accepts a custom theme definition without registering a new built-in.

## Programmatic API

The package root exports the typed schema, validation, normalization, and rendering API:

```ts
import {
  formatValidationIssues,
  normalizePlan,
  renderPlan,
  validatePlan,
  type ThemeDefinition,
} from "heple";
import customThemeJson from "heple/custom-theme.json" with { type: "json" };

const result = validatePlan(JSON.parse(planJson));
if (!result.ok) {
  throw new Error(formatValidationIssues(result.issues));
}

const customTheme: ThemeDefinition = customThemeJson;
const html = renderPlan(normalizePlan(result.value), {
  theme: customTheme,
  navigation: true,
});
```

`renderPlan` validates custom theme objects at runtime before adding their semantic tokens to
the generated CSS. The shipped [custom-theme.json](./custom-theme.json) shows the complete
supported shape, including paired light and dark modes. It is also exported as
`heple/custom-theme.json`.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm test:package
pnpm dev fixtures/implementation-plan.json --no-open
```

One-off HTML design studies belong in the local `examples/` directory. The entire directory is intentionally gitignored so experimental pages cannot be committed accidentally; no generation or build step depends on it.

## Roadmap

- [x] Accept custom theme definitions in the renderer
- [ ] Benchmarks for token savings
- [ ] Dashboard to configure org-wide theming
- [ ] Publish to your team or the world
- [ ] Changelog for each plan
