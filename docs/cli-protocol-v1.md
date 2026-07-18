# heple machine-readable CLI protocol v1

The `--json` option gives automated callers a versioned contract for validation and
rendering while the default CLI output remains human-readable.

```sh
heple validate plan.json --json
heple plan.json --json --no-open
```

`--json` changes reporting only. Rendering still opens the completed artifact unless
`--no-open` is supplied.

## Transport

- Each validation or rendering invocation in JSON mode emits exactly one compact JSON
  envelope followed by `\n`.
- Success envelopes are written to stdout and stderr is empty.
- Error envelopes are written to stderr and stdout is empty.
- Object keys and diagnostic ordering are deterministic for the same heple version,
  command, environment, and input.
- `--json` activates the protocol only when it appears before the first `--`;
  tokens after `--` are positional values.
- `protocolVersion` versions this CLI protocol independently from the plan document's
  `version`.

## Success envelopes

Validation:

```json
{"protocolVersion":"1","ok":true,"command":"validate","data":{"valid":true}}
```

Rendering:

```json
{"protocolVersion":"1","ok":true,"command":"render","data":{"outputPath":"/absolute/path/plan.html","opened":false,"theme":"default","navigation":true}}
```

`outputPath` is absolute. `opened` records whether heple successfully handed the
artifact to the default browser. `theme` is the selected built-in theme and
`navigation` is the effective renderer setting.

## Error envelope

```json
{"protocolVersion":"1","ok":false,"command":"validate","error":{"code":"INVALID_PLAN","class":"invalid_input","message":"Plan validation failed:\n/version: must be equal to constant","diagnostics":[{"code":"PLAN_SCHEMA_VIOLATION","path":"/version","message":"must be equal to constant"}]}}
```

`error.code` and diagnostic `code` values are stable identifiers. `message` is for
display and may contain environment-specific details for operational failures.
Diagnostic paths are JSON Pointers. The `diagnostics` field is present when a failure
can be tied to input locations. In accordance with JSON Pointer, the empty string
identifies the document root; `/` identifies an object property whose name is empty.

When an artifact was successfully written but browser opening failed, the envelope
includes the absolute path so the caller can still use the result:

```json
{"protocolVersion":"1","ok":false,"command":"render","error":{"code":"BROWSER_OPEN_FAILED","class":"operational","message":"Could not open artifact: browser unavailable","details":{"outputPath":"/absolute/path/plan.html"}}}
```

`command` identifies the invoked CLI command. Its v1 values are `render` for the
default plan-rendering command, plus `example`, `validate`, `schema`, `prompt`, and
`themes`. This remains accurate for argument errors, including when `--json` is not
supported by the selected subcommand.

## Exit codes

| Exit code | Class | Meaning |
| --- | --- | --- |
| `0` | success | Validation or rendering completed. |
| `2` | `invalid_input` | CLI arguments, JSON syntax, or the plan document are invalid. Retrying unchanged input will not succeed. |
| `1` | `operational` | Reading configuration/input, rendering, writing, browser opening, or an unexpected runtime operation failed. |

## Error codes

| Error code | Class | Meaning |
| --- | --- | --- |
| `INVALID_ARGUMENT` | `invalid_input` | The CLI invocation is malformed. |
| `INVALID_JSON` | `invalid_input` | Input is not syntactically valid JSON. |
| `INVALID_PLAN` | `invalid_input` | JSON does not satisfy the supported plan contract. |
| `INPUT_READ_FAILED` | `operational` | The input file or stdin could not be read. |
| `CONFIG_READ_FAILED` | `operational` | The renderer theme configuration could not be read. |
| `RENDER_FAILED` | `operational` | A validated plan could not be rendered. |
| `OUTPUT_WRITE_FAILED` | `operational` | The HTML artifact could not be written. |
| `BROWSER_OPEN_FAILED` | `operational` | The artifact was written but could not be opened; `error.details.outputPath` contains its absolute path. |
| `INTERNAL_ERROR` | `operational` | An otherwise unclassified runtime failure occurred. |

## Diagnostic codes

| Diagnostic code | Meaning |
| --- | --- |
| `JSON_SYNTAX_ERROR` | Input could not be parsed as JSON. |
| `PLAN_SCHEMA_VIOLATION` | A JSON Schema rule was violated. |
| `UNSAFE_LINK_PROTOCOL` | A link uses a protocol outside the supported allowlist. |
| `SECTION_DEPTH_EXCEEDED` | Section nesting exceeds the supported maximum. |
| `TABLE_CELL_COUNT_MISMATCH` | A table row has a different number of cells than columns. |

New error or diagnostic codes may be added within protocol v1. Existing code meanings,
envelope fields, stream routing, and exit-code classes will not change incompatibly
without a new `protocolVersion`.
