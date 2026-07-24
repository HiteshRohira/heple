import { describe, expect, it, vi } from "vitest";

vi.mock("@sinclair/typebox", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sinclair/typebox")>();
  return {
    ...actual,
    Type: new Proxy(actual.Type, {
      get(target, property, receiver) {
        if (property === "Union") return () => ({});
        return Reflect.get(target, property, receiver);
      },
    }),
  };
});

describe("discriminated union schema construction", () => {
  it("fails loudly when TypeBox does not expose its variants through anyOf", async () => {
    await expect(import("../src/schema.js")).rejects.toThrow(
      "TypeBox union must expose every variant through a non-empty anyOf array",
    );
  });
});
