import { describe, expect, it, vi } from "vitest";

const mockedAjv = vi.hoisted(() => ({
  errors: [
    {
      instancePath: "/a",
      schemaPath: "#/properties/a/anyOf/1/const",
      keyword: "const",
      params: { allowedValue: "beta" },
      message: "must be equal to constant",
    },
    {
      instancePath: "/b",
      schemaPath: "#/properties/b/anyOf/0/const",
      keyword: "const",
      params: { allowedValue: "gamma" },
      message: "must be equal to constant",
    },
    {
      instancePath: "/a",
      schemaPath: "#/properties/a/anyOf/0/const",
      keyword: "const",
      params: { allowedValue: "alpha" },
      message: "must be equal to constant",
    },
    {
      instancePath: "/b",
      schemaPath: "#/properties/b/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    },
    {
      instancePath: "/a",
      schemaPath: "#/properties/a/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    },
    {
      instancePath: "/b",
      schemaPath: "#/properties/b/anyOf/1/const",
      keyword: "const",
      params: { allowedValue: "delta" },
      message: "must be equal to constant",
    },
  ],
}));

vi.mock("ajv/dist/2020.js", () => ({
  Ajv2020: class {
    compile() {
      return Object.assign(() => false, { errors: mockedAjv.errors });
    }
  },
}));

describe("validation issue formatting", () => {
  it("coalesces interleaved literal-union errors by path and schema branch", async () => {
    const { validatePlan } = await import("../src/validate.js");

    expect(validatePlan({})).toEqual({
      ok: false,
      issues: [
        { path: "/a", message: "must be one of: alpha, beta" },
        { path: "/b", message: "must be one of: gamma, delta" },
      ],
    });
  });
});
