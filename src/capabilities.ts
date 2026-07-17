import { getJsonSchema, THEME_NAMES } from "./schema.js";

export const AGENT_COMMANDS = {
  instructions: "heple prompt",
  schema: "heple schema",
  validate: "heple validate plan.json",
  renderNonInteractive: "heple plan.json --output ./plan.html --no-open",
} as const;

export function getAgentCapabilities(version: string) {
  return {
    capabilitiesVersion: "1",
    name: "heple",
    version,
    documentSchema: getJsonSchema(),
    commands: AGENT_COMMANDS,
    rendering: {
      opensBrowserByDefault: true,
      nonInteractiveFlag: "--no-open",
    },
    themes: [...THEME_NAMES],
  };
}
