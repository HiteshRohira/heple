# heple project guide

## What heple is

heple is a CLI that turns a model-authored, structured plan into a polished, self-contained HTML document and opens it in the user's browser.

The product exists to preserve the readability and visual usefulness of HTML plans while removing the design variance that comes from asking a model to write arbitrary HTML and CSS. A model describes the plan's meaning with a small, versioned JSON vocabulary. heple validates that description and deterministically maps it to trusted, pre-styled HTML components.

Think of heple as a presentation compiler, not an AI webpage generator:

```text
model -> versioned plan JSON -> validation -> normalized document -> fixed renderer -> HTML file -> browser
```

For the same heple version, configuration, and valid input, the rendered output must be materially identical regardless of which model produced the JSON.

## Why it exists

Markdown is a good authoring format, but plans often contain information that is easier to understand spatially: milestones, dependencies, comparisons, risks, decisions, flows, mockups, and code hotspots. HTML can expose hierarchy, relationships, status, and emphasis at a glance; it can also support responsive layouts, semantic navigation, and carefully limited interaction.

Unconstrained model-generated HTML does not make a dependable product. Its structure, visual language, accessibility, responsiveness, and safety vary across models and runs. It also makes every plan a new frontend implementation rather than an instance of a stable document system.

heple resolves that tension:

- the model decides what the plan says;
- the schema decides what the model may express;
- the renderer decides how that meaning looks and behaves;
- the CLI makes the result easy to create and view.

The constraint is the feature. A smaller vocabulary that renders consistently is more valuable than arbitrary HTML that occasionally looks exceptional.

## Roadmap TODOs

- Add a setup flow that chooses the default style system for future renders.
- Explore a one-time, deliberately simple local theme-picker page as an optional setup step.
- Design a supported custom-theme format with validated semantic tokens, paired light/dark modes, and deterministic local loading.
- Design a custom HTML-structure/template extension point for pages that need a different document shape. Keep model content escaped and validation explicit; customization must not silently introduce arbitrary scripts.

## The model-facing contract

The CLI must make it easy for an agent or model to discover and produce valid input without copying implementation internals. Design for both humans and automated callers.

The intended capability is conceptually:

```sh
heple plan.json                         # validate, render, and open
heple plan.json --theme default         # choose a renderer-owned theme
heple plan.json --output ./plan.html    # choose the artifact path
heple plan.json --navigation            # opt into the right-side section navigator
heple plan.json --no-open               # render without opening a browser
heple example                            # open the shipped v1 element catalog
heple schema                            # print the machine-readable JSON Schema
heple prompt                            # print model instructions and the schema
heple validate plan.json                # validate without rendering
heple themes                            # list the available themes
```

The default command should complete the useful loop without requiring a subcommand. Preserve the separation between schema discovery, validation, rendering, and opening. Commands should support stdin where it improves agent workflows and stdout where it enables composition. Machine-readable errors should be available without making human errors worse.

The model prompt must be derived from, or tested against, the canonical schema so the two cannot drift. Include the schema version in every document. Prefer explicit discriminated unions and bounded enums over loosely shaped objects. Keep required fields minimal and make defaults deterministic.

The schema version is required, but visible top-level regions—title, summary, and blocks—are optional. Omitted regions render nothing. A selected primitive still requires the semantic payload that makes it meaningful, such as paragraph content or a link target.

Do not expose internal component names merely because they exist in the renderer. The public vocabulary is a durable product API; internal HTML templates are replaceable implementation details.

## Architecture boundaries

Keep these concerns distinct even if the first implementation lives in a single package:

1. **Schema** defines the accepted public document language and its versions.
2. **Parser and validator** reject invalid or unsupported input with structured diagnostics.
3. **Normalizer** applies documented defaults and produces a canonical internal document.
4. **Renderer** maps only the canonical document to trusted templates and assets.
5. **Artifact writer** produces a self-contained output file.
6. **Browser opener** hands the completed local artifact to the operating system.
7. **CLI** handles arguments, stdin/stdout, exit codes, and user-facing messages.

The renderer must not compensate for invalid documents, and the CLI must not contain plan-specific rendering logic. Keep filesystem and server side effects outside schema, validation, and rendering code so the core pipeline is easy to test.

Prefer a renderer-owned design-token system and a small component registry. Avoid adding a general templating escape hatch, plugin-supplied arbitrary scripts, or user CSS in the initial product; each would weaken the main guarantee.

## Schema evolution

The schema is the product's most important interface.

- Every plan declares a schema version.
- Document which heple versions support which schema versions.
- Reject unsupported major versions clearly.
- Make additive changes intentionally; optional fields still need deterministic defaults.
- Provide migrations only when they can preserve meaning without guessing.
- Keep representative fixtures for every supported version.
- Treat changes to enum meaning, default ordering, or required fields as compatibility changes, not refactors.

Before adding a schema field, answer:

1. What semantic need does it express?
2. Can an existing primitive express it clearly?
3. Can different models reliably choose and populate it?
4. Can heple render it accessibly on desktop and mobile?
5. What happens when its content is empty, long, duplicated, or adversarial?

## Rendering rules

- Generate valid, semantic HTML with stable structure.
- Keep styling renderer-owned and tokenized.
- Prefer CSS for layout and state; use JavaScript only for bounded renderer-owned enhancements such as copying code and switching light/dark mode.
- The core content must remain available without JavaScript.
- Avoid third-party runtime dependencies and remote fonts/assets in rendered artifacts unless a future product requirement explicitly changes the offline and privacy contract.
- Never use raw model content as an HTML attribute, DOM id, class name, style, or script value without appropriate normalization and escaping.
- Generate stable internal identifiers from canonical position or validated IDs, with deterministic collision handling.
- Define graceful behavior for empty collections, very long text, large code samples, dense tables, and oversized diagrams.
- If a semantic construct cannot be rendered clearly, fail validation or provide a documented fallback; do not invent a one-off layout.

## CLI behavior

Follow normal Unix expectations:

- `--help` is useful and examples are copy-pasteable.
- Success output is concise and includes the artifact path.
- Diagnostics go to stderr; requested data or artifacts go to stdout.
- Exit codes distinguish success from invalid input and operational failure.
- Non-interactive use never waits for prompts.
- Browser opening, output paths, and overwrite behavior are explicit and testable.
- Browser opening can be disabled for automation with `--no-open`.
- Temporary files are handled predictably.

Do not require an API key or model integration to use heple. heple consumes model output; it is not responsible for choosing or calling a model in the core workflow.

## Testing expectations

Test the contract at multiple levels:

- schema tests for valid, invalid, boundary, and unsupported-version documents;
- normalization tests for defaults, canonical ordering, and stable IDs;
- renderer snapshots or golden files for representative fixtures;
- repeat-render tests proving the same canonical input produces the promised stable output;
- semantic HTML and accessibility checks;
- responsive visual checks at a small, named set of viewport sizes;
- security tests for escaping, unsafe protocols, injection strings, and path traversal;
- CLI integration tests for files, stdin/stdout, exit codes, errors, and signals;
- browser-opening tests that do not launch a real browser during the automated suite.

Fixtures should represent real planning needs rather than toy prose. Include at least a compact plan, a complete implementation plan, sparse/empty optional content, maximum practical density, long unbroken content, Unicode and bidirectional text, and hostile strings.

When a rendered fixture changes, review it visually as well as textually. Update golden files only when the change is intentional and explain the user-visible effect.

## Working conventions for agents

The v1 stack is Node.js 24 LTS, ESM, and strict TypeScript. Use Commander for the CLI, TypeBox for TypeScript-backed JSON Schema, Ajv for validation, plain TypeScript renderer functions, `open` for cross-platform browser opening, and Vitest for tests. Use pnpm for repository development. Do not add a terminal UI or frontend rendering framework unless the product requirements materially change.

The v1 public vocabulary is intentionally small:

- block primitives: `section`, `paragraph`, `list`, `callout`, `steps`, `table`, `code`, and `details`;
- inline primitives: `text`, `link`, `strong`, `emphasis`, `code`, `status`, and `severity`;
- themes: `default`, `bubblegum`, `caffeine`, `claude`, `claymorphism`, `neobrutalism`, `sage-garden`, `supabase`, `twitter`, `vercel`, `violet-bloom`, `modern-minimal`, and `mono`.

Sections determine heading levels; the model does not select `h1` through `h6`. Details render with native `<details>` and `<summary>` and require no custom JavaScript. Lists are ordered or unordered; v1 has no checklist primitive. Step metadata uses ordinary grouped text rather than HTML description lists. Code blocks may include the renderer-owned copy control. Every theme defines paired light/dark semantic tokens and the artifact includes a visible mode toggle. Theme choice and section navigation are renderer configuration, not model-authored document content. Navigation is off by default and, when enabled, appears as a fixed right-side disclosure rail without reducing content width.

`example.json` is a shipped compatibility fixture and user-facing element catalog. Keep it exhaustive: every supported block and inline primitive, bounded variant, and optional renderer field must appear at least once. `heple example` renders it with navigation enabled by default.

For each change:

1. Identify the user-visible or model-facing contract affected.
2. Update schema, examples, prompt guidance, implementation, and tests together when applicable.
3. Preserve the boundary between semantic input and renderer-owned presentation.
4. Run the narrowest relevant checks, then the broader suite before handoff.
5. Report intentional compatibility or rendered-output changes explicitly.

Do not:

- accept raw HTML/CSS/JavaScript from plan JSON;
- add a component solely to reproduce one attractive reference page;
- infer missing meaning from prose during rendering;
- make network access part of validation or rendering;
- silently change the schema or rendering contract;
- couple the core tool to one model vendor;
- claim accessibility, determinism, or security without tests appropriate to the claim.

## Initial scope and non-goals

The first useful version should prove one loop well:

1. a model can discover the format;
2. it can produce a valid structured implementation plan;
3. heple can explain invalid input;
4. valid input renders into a consistent, readable, accessible HTML artifact;
5. the artifact is written locally and opened in the default browser.

Unless a later decision explicitly expands scope, the initial version is not:

- a general-purpose website builder;
- a free-form dashboard or slide generator;
- a WYSIWYG editor;
- a model orchestration layer;
- a remote hosting or collaboration service;
- a replacement for the canonical plan JSON;
- a system for running arbitrary model-generated code.

The JSON document is the source of truth. HTML is a deterministic view of it.

## Product references

The medium-level product direction is informed by Thariq Shihipar's “The Unreasonable Effectiveness of HTML” and its example gallery:

- https://x.com/trq212/status/2052809885763747935
- https://thariqs.github.io/html-effectiveness/

Use these references only to understand why spatial, visual, interactive documents can outperform walls of Markdown. Do not borrow their visual identity or treat their individual layouts as templates.

Theme architecture and the curated preset tokens come from tweakcn's separation of semantic colors, paired light/dark modes, typography, radius, and shadows:

- https://github.com/jnsahaj/tweakcn

heple adapts the selected tweakcn presets to its smaller semantic token vocabulary while keeping the source palette names recognizable. Rendering remains self-contained and deterministic.
