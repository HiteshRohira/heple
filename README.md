# heple

Make HTML plans with consistent design. Always.

To be used by your agents.

heple turns a structured JSON plan into deterministic, self-contained HTML and opens it in your default browser.

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
heple plan.json
heple plan.json --theme sage-garden --output plan.html --no-open
heple plan.json --navigation
heple example
heple validate plan.json
heple schema
heple prompt
heple themes # choose and save the default theme
```

Use `heple prompt` to give a model both the authoring instructions and canonical JSON Schema. The plan format accepts a constrained set of semantic blocks and inline content; it never accepts arbitrary HTML, CSS, or JavaScript.

Run `heple themes`, move with the up and down arrow keys, and press Enter to save your default theme. An explicit `--theme` option overrides that default for one render.

Available themes are `default`, `bubblegum`, `caffeine`, `claude`, `claymorphism`, `neobrutalism`, `sage-garden`, `supabase`, `twitter`, `vercel`, `violet-bloom`, `modern-minimal`, and `mono`. Every theme includes coordinated light and dark modes. Generated pages follow the device preference until the reader chooses a mode, then remember that choice locally.

The themes are inspired by tweakcn. The curated palettes adapt tokens from tweakcn's [pinned preset collection](https://github.com/jnsahaj/tweakcn/blob/f89566aef1b6d71d0f72b998d16a5980bea10c98/utils/theme-presets.ts) to heple's smaller renderer vocabulary.

Run `heple example` to render and open the shipped [element catalog](./example.json). It demonstrates every v1 block, inline primitive, callout tone, status, severity, table alignment, and optional rendering field. The example enables section navigation by default; pass `--no-navigation` to hide it.

Title, summary, and blocks are optional. Omitted regions do not render placeholders. Section navigation is also off by default; pass `--navigation` to enable the right-side hover rail.

Model-authored links open in a new tab by default. Internal section navigation remains in the current tab.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev fixtures/implementation-plan.json --no-open
```
