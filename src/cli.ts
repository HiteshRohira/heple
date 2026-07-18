#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Argument, Command, CommanderError, Option } from "commander";
import open from "open";
import {
  CliFailure,
  type CliCommand,
  errorEnvelope,
  serializeEnvelope,
  successEnvelope,
} from "./cli-protocol.js";
import { getDefaultTheme, getExampleOutputPath, setDefaultTheme } from "./config.js";
import { defaultOutputPath, JsonParseError, readInput, writeArtifact } from "./io.js";
import { normalizePlan } from "./normalize.js";
import { getModelPrompt } from "./prompt.js";
import { renderPlan } from "./render.js";
import { getJsonSchema, THEME_NAMES, type ThemeName } from "./schema.js";
import { selectTheme } from "./theme-selector.js";
import { themeDescriptions } from "./themes.js";
import { formatValidationIssues, validatePlan } from "./validate.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version?: unknown };

if (typeof packageJson.version !== "string") {
  throw new Error("package.json must contain a version");
}

const VERSION = packageJson.version;
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
  json?: boolean;
}

interface ValidateCommandOptions {
  json?: boolean;
}

interface RenderResult {
  outputPath: string;
  opened: boolean;
  theme: ThemeName;
  navigation: boolean;
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadInput(inputPath: string): Promise<unknown> {
  try {
    return await readInput(inputPath);
  } catch (error) {
    if (error instanceof JsonParseError) {
      throw new CliFailure(
        "INVALID_JSON",
        "invalid_input",
        error.message,
        {
          diagnostics: [{ code: "JSON_SYNTAX_ERROR", path: "", message: error.detail }],
        },
      );
    }
    throw new CliFailure(
      "INPUT_READ_FAILED",
      "operational",
      `Could not read input: ${errorDetail(error)}`,
    );
  }
}

function assertValid(input: unknown) {
  const result = validatePlan(input);
  if (!result.ok) {
    throw new CliFailure(
      "INVALID_PLAN",
      "invalid_input",
      `Plan validation failed:\n${formatValidationIssues(result.issues)}`,
      { diagnostics: result.issues },
    );
  }
  return result.value;
}

async function renderCommand(
  inputPath: string,
  options: RenderCommandOptions,
  dependencies: CliDependencies,
  fallbackOutputPath?: string,
  json = false,
): Promise<RenderResult> {
  const input = await loadInput(inputPath);
  const validatedPlan = assertValid(input);
  const outputPath = resolve(options.output ?? fallbackOutputPath ?? defaultOutputPath(inputPath));
  let theme: ThemeName;
  try {
    theme = options.theme ?? await getDefaultTheme();
  } catch (error) {
    throw new CliFailure(
      "CONFIG_READ_FAILED",
      "operational",
      `Could not read configuration: ${errorDetail(error)}`,
    );
  }
  const navigation = options.navigation ?? true;
  let html: string;
  try {
    const plan = normalizePlan(validatedPlan);
    html = renderPlan(plan, { theme, navigation });
  } catch (error) {
    throw new CliFailure(
      "RENDER_FAILED",
      "operational",
      `Could not render plan: ${errorDetail(error)}`,
    );
  }
  try {
    await writeArtifact(outputPath, html);
  } catch (error) {
    throw new CliFailure(
      "OUTPUT_WRITE_FAILED",
      "operational",
      `Could not write artifact: ${errorDetail(error)}`,
    );
  }
  if (!json) {
    process.stdout.write(`Created ${outputPath}\n`);
  }

  let opened = false;
  if (options.open) {
    try {
      await dependencies.openPath(outputPath);
      opened = true;
    } catch (error) {
      throw new CliFailure(
        "BROWSER_OPEN_FAILED",
        "operational",
        `Could not open artifact: ${errorDetail(error)}`,
        { details: { outputPath } },
      );
    }
  }
  return { outputPath, opened, theme, navigation };
}

function writeRenderResult(
  result: RenderResult,
  json: boolean,
  command: Extract<CliCommand, "render" | "example"> = "render",
): void {
  if (json) {
    process.stdout.write(serializeEnvelope(successEnvelope(command, result)));
    return;
  }
  if (result.opened) {
    process.stdout.write("Opened in your default browser\n");
  }
}

export function createProgram(
  dependencies: CliDependencies = { openPath: (path) => open(path) },
): Command {
  const program = new Command();
  const usesJsonProtocol = (options: { json?: boolean }): boolean =>
    options.json === true || program.opts<{ json?: boolean }>().json === true;
  const rejectUnsupportedJson = (
    command: Extract<CliCommand, "schema" | "prompt" | "themes">,
  ): void => {
    if (program.opts<{ json?: boolean }>().json) {
      throw new CliFailure(
        "INVALID_ARGUMENT",
        "invalid_input",
        `option '--json' is not supported by command '${command}'`,
      );
    }
  };
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
    .option("--json", "emit the versioned machine-readable CLI protocol")
    .action(async (input: string | undefined, options: RenderCommandOptions) => {
      if (!input) {
        if (options.json) {
          throw new CliFailure(
            "INVALID_ARGUMENT",
            "invalid_input",
            "missing required plan JSON input",
          );
        }
        process.stdout.write(WELCOME_MESSAGE);
        return;
      }
      const json = usesJsonProtocol(options);
      writeRenderResult(await renderCommand(input, options, dependencies, undefined, json), json);
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
    .option("--json", "emit the versioned machine-readable CLI protocol")
    .action(async (options: RenderCommandOptions | Command) => {
      const parsedOptions = options instanceof Command
        ? (options.opts() as RenderCommandOptions)
        : options;
      const examplePath = fileURLToPath(new URL("../example.json", import.meta.url));
      const json = usesJsonProtocol(parsedOptions);
      writeRenderResult(
        await renderCommand(
          examplePath,
          parsedOptions,
          dependencies,
          getExampleOutputPath(),
          json,
        ),
        json,
        "example",
      );
    });

  program
    .command("validate")
    .description("Validate a plan without rendering it")
    .argument("<input>", "plan JSON file, or - for stdin")
    .option("--json", "emit the versioned machine-readable CLI protocol")
    .action(async (inputPath: string, options: ValidateCommandOptions) => {
      assertValid(await loadInput(inputPath));
      if (usesJsonProtocol(options)) {
        process.stdout.write(serializeEnvelope(successEnvelope("validate", { valid: true })));
      } else {
        process.stdout.write("Plan is valid\n");
      }
    });

  program
    .command("schema")
    .description("Print the canonical JSON Schema")
    .action(() => {
      rejectUnsupportedJson("schema");
      process.stdout.write(`${JSON.stringify(getJsonSchema(), null, 2)}\n`);
    });

  program
    .command("prompt")
    .description("Print plan-authoring instructions and a compact format example")
    .action(() => {
      rejectUnsupportedJson("prompt");
      process.stdout.write(`${getModelPrompt()}\n`);
    });

  program
    .command("themes")
    .description("Choose the default renderer theme")
    .addArgument(
      new Argument("[theme]", "theme to set without the interactive selector")
        .choices([...THEME_NAMES]),
    )
    .action(async (theme: ThemeName | undefined) => {
      rejectUnsupportedJson("themes");
      const currentTheme = await getDefaultTheme();
      if (theme) {
        await setDefaultTheme(theme);
        process.stdout.write(`Default theme changed to ${theme}.\n`);
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

      process.stdout.write(`Current default: ${currentTheme}\n\n`);
      for (const theme of THEME_NAMES) {
        process.stdout.write(`${theme.padEnd(16)} ${themeDescriptions[theme]}\n`);
      }
      process.stdout.write("\nRun heple themes in an interactive terminal to choose the default.\n");
    });

  program.showHelpAfterError();
  return program;
}

function commandIdentifier(command: Command): CliCommand {
  const name = command.name();
  return name === "heple" ? "render" : name as CliCommand;
}

function configureFailureHandling(
  command: Command,
  json: boolean,
  setCommand: (command: CliCommand) => void,
): void {
  const identifier = commandIdentifier(command);
  command.exitOverride((error) => {
    setCommand(identifier);
    throw error;
  });
  if (json) {
    command.configureOutput({ writeErr: () => undefined });
  }
  for (const subcommand of command.commands) {
    configureFailureHandling(subcommand, json, setCommand);
  }
}

function requestsJsonProtocol(argv: string[]): boolean {
  for (const argument of argv.slice(2)) {
    if (argument === "--") return false;
    if (argument === "--json") return true;
  }
  return false;
}

export async function run(
  argv = process.argv,
  dependencies?: CliDependencies,
): Promise<void> {
  const json = requestsJsonProtocol(argv);
  let command: CliCommand = "render";
  const program = createProgram(dependencies);
  program.hook("preAction", (_thisCommand, actionCommand) => {
    command = commandIdentifier(actionCommand);
  });
  configureFailureHandling(program, json, (selectedCommand) => {
    command = selectedCommand;
  });

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.exitCode === 0) return;
      process.exitCode = 2;
      if (json) {
        const failure = new CliFailure(
          "INVALID_ARGUMENT",
          "invalid_input",
          error.message.replace(/^error: /, ""),
        );
        process.stderr.write(serializeEnvelope(errorEnvelope(command, failure)));
      }
      return;
    }

    const failure = error instanceof CliFailure
      ? error
      : new CliFailure("INTERNAL_ERROR", "operational", errorDetail(error));
    process.exitCode = failure.exitCode;
    if (json) {
      process.stderr.write(serializeEnvelope(errorEnvelope(command, failure)));
    } else {
      process.stderr.write(`heple: ${failure.message}\n`);
    }
  }
}

const isEntryPoint = process.argv[1]
  ? realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))
  : false;

if (isEntryPoint) {
  void run();
}
