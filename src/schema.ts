import { Type, type Static, type TSchema } from "@sinclair/typebox";

const exactObject = <T extends Record<string, TSchema>>(properties: T) =>
  Type.Object(properties, { additionalProperties: false });

export const V1_COMPLEXITY_BUDGETS = Object.freeze({
  totalBlocks: 500,
  blockNestingDepth: 8,
  collectionItems: 100,
  traversalItems: 50_000,
  tableColumns: 20,
  tableRows: 200,
  tableCells: 2_000,
  stringCharacters: 10_000,
  totalStringCharacters: 1_000_000,
  codeCharacters: 100_000,
  codeLines: 5_000,
} as const);

const nonEmptyString = Type.String({
  minLength: 1,
  maxLength: V1_COMPLEXITY_BUDGETS.stringCharacters,
});
const string = Type.String({
  maxLength: V1_COMPLEXITY_BUDGETS.stringCharacters,
});

export const INLINE_TYPES = [
  "text",
  "link",
  "strong",
  "emphasis",
  "code",
  "status",
  "severity",
] as const;

export const BLOCK_TYPES = [
  "section",
  "paragraph",
  "list",
  "callout",
  "steps",
  "table",
  "code",
  "details",
] as const;

export const THEME_NAMES = [
  "default",
  "caffeine",
  "clay",
  "supabase",
  "twitter",
  "mono",
] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export const InlineSchema = Type.Union([
  exactObject({ type: Type.Literal("text"), text: nonEmptyString }),
  exactObject({
    type: Type.Literal("link"),
    text: nonEmptyString,
    href: nonEmptyString,
  }),
  exactObject({ type: Type.Literal("strong"), text: nonEmptyString }),
  exactObject({ type: Type.Literal("emphasis"), text: nonEmptyString }),
  exactObject({ type: Type.Literal("code"), text: nonEmptyString }),
  exactObject({
    type: Type.Literal("status"),
    value: Type.Union([
      Type.Literal("planned"),
      Type.Literal("active"),
      Type.Literal("done"),
      Type.Literal("blocked"),
    ]),
  }),
  exactObject({
    type: Type.Literal("severity"),
    value: Type.Union([
      Type.Literal("low"),
      Type.Literal("medium"),
      Type.Literal("high"),
      Type.Literal("critical"),
    ]),
  }),
]);

export type Inline = Static<typeof InlineSchema>;

const InlineContentSchema = Type.Array(InlineSchema, {
  minItems: 1,
  maxItems: V1_COMPLEXITY_BUDGETS.collectionItems,
});
const FactSchema = exactObject({ label: nonEmptyString, value: nonEmptyString });

export const BlockSchema = Type.Recursive(
  (Block) =>
    Type.Union([
      exactObject({
        type: Type.Literal("section"),
        title: nonEmptyString,
        blocks: Type.Array(Block, {
          minItems: 1,
          maxItems: V1_COMPLEXITY_BUDGETS.collectionItems,
        }),
      }),
      exactObject({
        type: Type.Literal("paragraph"),
        content: InlineContentSchema,
      }),
      exactObject({
        type: Type.Literal("list"),
        style: Type.Optional(
          Type.Union([
            Type.Literal("unordered"),
            Type.Literal("ordered"),
          ]),
        ),
        items: Type.Array(
          exactObject({
            content: InlineContentSchema,
          }),
          {
            minItems: 1,
            maxItems: V1_COMPLEXITY_BUDGETS.collectionItems,
          },
        ),
      }),
      exactObject({
        type: Type.Literal("callout"),
        tone: Type.Optional(
          Type.Union([
            Type.Literal("info"),
            Type.Literal("warning"),
            Type.Literal("success"),
          ]),
        ),
        title: Type.Optional(nonEmptyString),
        content: InlineContentSchema,
      }),
      exactObject({
        type: Type.Literal("steps"),
        items: Type.Array(
          exactObject({
            title: nonEmptyString,
            description: Type.Optional(string),
            status: Type.Optional(
              Type.Union([
                Type.Literal("planned"),
                Type.Literal("active"),
                Type.Literal("done"),
                Type.Literal("blocked"),
              ]),
            ),
            meta: Type.Optional(
              Type.Array(FactSchema, {
                maxItems: V1_COMPLEXITY_BUDGETS.collectionItems,
              }),
            ),
          }),
          {
            minItems: 1,
            maxItems: V1_COMPLEXITY_BUDGETS.collectionItems,
          },
        ),
      }),
      exactObject({
        type: Type.Literal("table"),
        caption: Type.Optional(nonEmptyString),
        columns: Type.Array(
          exactObject({
            label: nonEmptyString,
            align: Type.Optional(
              Type.Union([
                Type.Literal("left"),
                Type.Literal("center"),
                Type.Literal("right"),
              ]),
            ),
          }),
          {
            minItems: 1,
            maxItems: V1_COMPLEXITY_BUDGETS.tableColumns,
          },
        ),
        rows: Type.Array(
          exactObject({
            cells: Type.Array(InlineContentSchema, {
              minItems: 1,
              maxItems: V1_COMPLEXITY_BUDGETS.tableColumns,
            }),
          }),
          {
            minItems: 1,
            maxItems: V1_COMPLEXITY_BUDGETS.tableRows,
          },
        ),
      }),
      exactObject({
        type: Type.Literal("code"),
        code: Type.String({
          maxLength: V1_COMPLEXITY_BUDGETS.codeCharacters,
        }),
        language: Type.Optional(nonEmptyString),
        filename: Type.Optional(nonEmptyString),
        caption: Type.Optional(nonEmptyString),
        highlightLines: Type.Optional(
          Type.Array(Type.Integer({ minimum: 1 }), {
            maxItems: V1_COMPLEXITY_BUDGETS.collectionItems,
            uniqueItems: true,
          }),
        ),
      }),
      exactObject({
        type: Type.Literal("details"),
        summary: nonEmptyString,
        open: Type.Optional(Type.Boolean()),
        blocks: Type.Array(Block, {
          minItems: 1,
          maxItems: V1_COMPLEXITY_BUDGETS.collectionItems,
        }),
      }),
    ]),
  { $id: "HepleBlock" },
);

export const PlanDocumentSchema = exactObject({
  version: Type.Literal("1"),
  title: Type.Optional(nonEmptyString),
  summary: Type.Optional(string),
  language: Type.Optional(
    Type.String({
      maxLength: V1_COMPLEXITY_BUDGETS.stringCharacters,
      pattern: "^[A-Za-z]{2,3}(-[A-Za-z0-9]+)*$",
    }),
  ),
  blocks: Type.Optional(
    Type.Array(BlockSchema, {
      minItems: 1,
      maxItems: V1_COMPLEXITY_BUDGETS.collectionItems,
    }),
  ),
});

PlanDocumentSchema.$id = "https://heple.dev/schema/v1.json";
PlanDocumentSchema.title = "heple plan document v1";
PlanDocumentSchema.$schema = "https://json-schema.org/draft/2020-12/schema";
(PlanDocumentSchema as unknown as TSchema & {
  "x-heple-complexity-budgets": typeof V1_COMPLEXITY_BUDGETS;
})["x-heple-complexity-budgets"] = V1_COMPLEXITY_BUDGETS;

export type PlanDocument = Static<typeof PlanDocumentSchema>;
export type Block = Static<typeof BlockSchema>;

export function getJsonSchema(): Record<string, unknown> {
  return structuredClone(PlanDocumentSchema) as Record<string, unknown>;
}
