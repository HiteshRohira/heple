import { Kind, Type, type Static, type TSchema } from "@sinclair/typebox";

const exactObject = <T extends Record<string, TSchema>>(properties: T) =>
  Type.Object(properties, { additionalProperties: false });

const nonEmptyString = Type.String({ minLength: 1 });

type DiscriminatedUnionStatic<T extends TSchema[], P extends unknown[]> = {
  [K in keyof T]: T[K] extends TSchema ? Static<T[K], P> : never;
}[number];

interface TDiscriminatedUnion<T extends TSchema[]> extends TSchema {
  [Kind]: "Union";
  static: DiscriminatedUnionStatic<T, this["params"]>;
  oneOf: T;
  discriminator: { propertyName: "type" };
}

function discriminatedUnion<T extends TSchema[]>(
  variants: [...T],
): TDiscriminatedUnion<T> {
  const generatedUnion: unknown = Type.Union(variants);
  const generatedAnyOf = generatedUnion !== null && typeof generatedUnion === "object"
    ? Reflect.get(generatedUnion, "anyOf")
    : undefined;
  if (
    !Array.isArray(generatedAnyOf)
    || generatedAnyOf.length === 0
    || generatedAnyOf.length !== variants.length
  ) {
    throw new Error("TypeBox union must expose every variant through a non-empty anyOf array");
  }

  const { anyOf, ...union } = generatedUnion as Record<string, unknown> & {
    anyOf: unknown[];
  };
  return {
    ...union,
    oneOf: anyOf,
    discriminator: { propertyName: "type" },
  } as unknown as TDiscriminatedUnion<T>;
}

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

export const InlineSchema = discriminatedUnion([
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

const InlineContentSchema = Type.Array(InlineSchema, { minItems: 1 });
const FactSchema = exactObject({ label: nonEmptyString, value: nonEmptyString });

export const BlockSchema = Type.Recursive(
  (Block) =>
    discriminatedUnion([
      exactObject({
        type: Type.Literal("section"),
        title: nonEmptyString,
        blocks: Type.Array(Block, { minItems: 1 }),
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
          { minItems: 1 },
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
            description: Type.Optional(Type.String()),
            status: Type.Optional(
              Type.Union([
                Type.Literal("planned"),
                Type.Literal("active"),
                Type.Literal("done"),
                Type.Literal("blocked"),
              ]),
            ),
            meta: Type.Optional(Type.Array(FactSchema)),
          }),
          { minItems: 1 },
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
          { minItems: 1 },
        ),
        rows: Type.Array(
          exactObject({ cells: Type.Array(InlineContentSchema, { minItems: 1 }) }),
          { minItems: 1 },
        ),
      }),
      exactObject({
        type: Type.Literal("code"),
        code: Type.String(),
        language: Type.Optional(nonEmptyString),
        filename: Type.Optional(nonEmptyString),
        caption: Type.Optional(nonEmptyString),
        highlightLines: Type.Optional(
          Type.Array(Type.Integer({ minimum: 1 }), { uniqueItems: true }),
        ),
      }),
      exactObject({
        type: Type.Literal("details"),
        summary: nonEmptyString,
        open: Type.Optional(Type.Boolean()),
        blocks: Type.Array(Block, { minItems: 1 }),
      }),
    ]),
  { $id: "HepleBlock" },
);

export const PlanDocumentSchema = exactObject({
  version: Type.Literal("1"),
  title: Type.Optional(nonEmptyString),
  summary: Type.Optional(Type.String()),
  language: Type.Optional(Type.String({ pattern: "^[A-Za-z]{2,3}(-[A-Za-z0-9]+)*$" })),
  blocks: Type.Optional(Type.Array(BlockSchema, { minItems: 1 })),
});

PlanDocumentSchema.$id = "https://heple.dev/schema/v1.json";
PlanDocumentSchema.title = "heple plan document v1";
PlanDocumentSchema.$schema = "https://json-schema.org/draft/2020-12/schema";

export type PlanDocument = Static<typeof PlanDocumentSchema>;
export type Block = Static<typeof BlockSchema>;

export function getJsonSchema(): Record<string, unknown> {
  return structuredClone(PlanDocumentSchema) as Record<string, unknown>;
}
