#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Command, Option } from "commander";
import open from "open";
import { defaultOutputPath, readInput, writeArtifact } from "./io.js";
import { normalizePlan } from "./normalize.js";
import { getModelPrompt } from "./prompt.js";
import { renderPlan } from "./render.js";
import { getJsonSchema, THEME_NAMES, type ThemeName } from "./schema.js";
import { themeDescriptions } from "./themes.js";
import { formatValidationIssues, validatePlan } from "./validate.js";

const VERSION = "0.0.1";

interface CliDependencies {
  openPath: (path: string) => Promise<unknown>;
}

interface RenderCommandOptions {
  output?: string;
  theme: ThemeName;
  open: boolean;
  navigation?: boolean;
}

function assertValid(input: unknown) {
  const result = validatePlan(input);
  if (!result.ok) {
    throw new Error(`Plan validation failed:\n${formatValidationIssues(result.issues)}`);
  }
  return result.value;
}

async function renderCommand(
  inputPath: string,
  options: RenderCommandOptions,
  dependencies: CliDependencies,
  fallbackOutputPath?: string,
): Promise<void> {
  const input = await readInput(inputPath);
  const plan = normalizePlan(assertValid(input));
  const outputPath = resolve(options.output ?? fallbackOutputPath ?? defaultOutputPath(inputPath));
  const html = renderPlan(plan, {
    theme: options.theme,
    navigation: options.navigation ?? false,
  });
  await writeArtifact(outputPath, html);
  process.stdout.write(`Created ${outputPath}\n`);

  if (options.open) {
    await dependencies.openPath(outputPath);
    process.stdout.write("Opened in your default browser\n");
  }
}

export function createProgram(
  dependencies: CliDependencies = { openPath: (path) => open(path) },
): Command {
  const program = new Command();
  program
    .name("heple")
    .description("Turn structured JSON plans into deterministic HTML")
    .version(VERSION)
    .enablePositionalOptions()
    .argument("[input]", "plan JSON file, or - for stdin")
    .option("-o, --output <path>", "HTML output path")
    .addOption(
      new Option("-t, --theme <theme>", "render theme")
        .choices([...THEME_NAMES])
        .default("default"),
    )
    .option("--navigation", "show the right-side section navigator")
    .option("--no-open", "do not open the generated plan")
    .addHelpText(
      "after",
      `
Make HTML plans with consistent design for use by your agent.
Run heple example to see an example plan.
Run heple themes to choose a theme, then pass --theme <name> when rendering.
`,
    )
    .action(async (input: string | undefined, options: RenderCommandOptions) => {
      if (!input) {
        program.outputHelp();
        return;
      }
      await renderCommand(input, options, dependencies);
    });

  program
    .command("example")
    .description("Open the shipped catalog of every v1 element")
    .option("-o, --output <path>", "HTML output path")
    .addOption(
      new Option("-t, --theme <theme>", "render theme")
        .choices([...THEME_NAMES])
        .default("default"),
    )
    .option("--no-navigation", "hide the right-side section navigator")
    .option("--no-open", "do not open the generated catalog")
    .action(async (options: RenderCommandOptions | Command) => {
      const parsedOptions = options instanceof Command
        ? (options.opts() as RenderCommandOptions)
        : options;
      const examplePath = fileURLToPath(new URL("../example.json", import.meta.url));
      await renderCommand(
        examplePath,
        parsedOptions,
        dependencies,
        resolve("heple-example.html"),
      );
    });

  program
    .command("validate")
    .description("Validate a plan without rendering it")
    .argument("<input>", "plan JSON file, or - for stdin")
    .action(async (inputPath: string) => {
      assertValid(await readInput(inputPath));
      process.stdout.write("Plan is valid\n");
    });

  program
    .command("schema")
    .description("Print the canonical JSON Schema")
    .action(() => {
      process.stdout.write(`${JSON.stringify(getJsonSchema(), null, 2)}\n`);
    });

  program
    .command("prompt")
    .description("Print model instructions and the canonical schema")
    .action(() => {
      process.stdout.write(`${getModelPrompt()}\n`);
    });

  program
    .command("themes")
    .description("List renderer themes")
    .action(() => {
      for (const theme of THEME_NAMES) {
        process.stdout.write(`${theme.padEnd(16)} ${themeDescriptions[theme]}\n`);
      }
    });

  program.showHelpAfterError();
  return program;
}

export async function run(argv = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

const isEntryPoint = process.argv[1]
  ? realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))
  : false;

if (isEntryPoint) {
  run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`heple: ${message}\n`);
    process.exitCode = 1;
  });
}
