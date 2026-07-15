#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Argument, Command, Option } from "commander";
import open from "open";
import { getDefaultTheme, getExampleOutputPath, setDefaultTheme } from "./config.js";
import { defaultOutputPath, readInput, writeArtifact } from "./io.js";
import { normalizePlan } from "./normalize.js";
import { getModelPrompt } from "./prompt.js";
import { renderPlan } from "./render.js";
import { getJsonSchema, THEME_NAMES, type ThemeName } from "./schema.js";
import { selectTheme } from "./theme-selector.js";
import { themeDescriptions } from "./themes.js";
import { formatValidationIssues, validatePlan } from "./validate.js";

const VERSION = "0.0.1";
const WELCOME_MESSAGE = `Make HTML plans with consistent design. heple turns a structured JSON plan into deterministic, self-contained HTML and opens it in your default browser.

If you are an agent, run heple prompt to see what you have to do.
If you are a human, run heple example.
`;

interface CliDependencies {
  openPath: (path: string) => Promise<unknown>;
}

interface RenderCommandOptions {
  output?: string;
  theme?: ThemeName;
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
    theme: options.theme ?? await getDefaultTheme(),
    navigation: options.navigation ?? true,
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
        .choices([...THEME_NAMES]),
    )
    .option("--no-navigation", "hide the right-side section navigator")
    .option("--no-open", "do not open the generated plan")
    .action(async (input: string | undefined, options: RenderCommandOptions) => {
      if (!input) {
        process.stdout.write(WELCOME_MESSAGE);
        return;
      }
      await renderCommand(input, options, dependencies);
    });

  program
    .command("example")
    .description("Render and open the cached catalog of every v1 element")
    .addOption(
      new Option("-t, --theme <theme>", "render theme")
        .choices([...THEME_NAMES]),
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
        getExampleOutputPath(),
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
    .description("Print concise plan-authoring instructions for an agent")
    .action(() => {
      process.stdout.write(`${getModelPrompt()}\n`);
    });

  program
    .command("themes")
    .description("Choose the default renderer theme (inspired by tweakcn)")
    .addArgument(
      new Argument("[theme]", "theme to set without the interactive selector")
        .choices([...THEME_NAMES]),
    )
    .action(async (theme: ThemeName | undefined) => {
      const currentTheme = await getDefaultTheme();
      if (theme) {
        await setDefaultTheme(theme);
        process.stdout.write(`Themes are inspired by tweakcn.\nDefault theme changed to ${theme}.\n`);
        return;
      }

      if (process.stdin.isTTY && process.stdout.isTTY) {
        const selectedTheme = await selectTheme(currentTheme);
        if (!selectedTheme) {
          process.stdout.write("Theme selection cancelled.\n");
          return;
        }
        await setDefaultTheme(selectedTheme);
        process.stdout.write(`Default theme changed to ${selectedTheme}.\n`);
        return;
      }

      process.stdout.write(`Themes are inspired by tweakcn.\nCurrent default: ${currentTheme}\n\n`);
      for (const theme of THEME_NAMES) {
        process.stdout.write(`${theme.padEnd(16)} ${themeDescriptions[theme]}\n`);
      }
      process.stdout.write("\nRun heple themes in an interactive terminal to choose the default.\n");
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
