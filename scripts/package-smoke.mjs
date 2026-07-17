import { execFile } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const isWindows = process.platform === "win32";

function runCommand(command, args, options) {
  if (!isWindows) return execFileAsync(command, args, options);
  return execFileAsync(
    process.env.ComSpec ?? "cmd.exe",
    ["/d", "/s", "/c", command, ...args],
    { ...options, windowsHide: true },
  );
}

const projectRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = await mkdtemp(join(tmpdir(), "heple-package-smoke-"));
const packDirectory = join(temporaryRoot, "pack");
const consumerDirectory = join(temporaryRoot, "consumer");

try {
  await mkdir(packDirectory);
  await mkdir(consumerDirectory);

  await runCommand(
    isWindows ? "npm.cmd" : "npm",
    ["pack", "--pack-destination", packDirectory],
    { cwd: projectRoot },
  );

  const tarballs = (await readdir(packDirectory)).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1 || !tarballs[0]) {
    throw new Error(`Expected one npm tarball, found ${tarballs.length}`);
  }

  await writeFile(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
    "utf8",
  );
  await runCommand(
    isWindows ? "npm.cmd" : "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
      join("..", "pack", tarballs[0]),
    ],
    { cwd: consumerDirectory },
  );

  const installedManifest = JSON.parse(
    await readFile(join(consumerDirectory, "node_modules", "heple", "package.json"), "utf8"),
  );
  if (installedManifest.exports?.["."]?.types !== "./dist/index.d.ts") {
    throw new Error("Packed package does not expose its root TypeScript declarations");
  }
  await stat(join(consumerDirectory, "node_modules", "heple", "dist", "index.js"));
  await stat(join(consumerDirectory, "node_modules", "heple", "dist", "index.d.ts"));
  await stat(join(consumerDirectory, "node_modules", "heple", "custom-theme.json"));

  await writeFile(
    join(consumerDirectory, "consumer.ts"),
    `import customTheme from "heple/custom-theme.json" with { type: "json" };
import {
  normalizePlan,
  renderPlan,
  validatePlan,
  validateTheme,
  type PlanDocument,
  type ThemeDefinition,
} from "heple";

const input: PlanDocument = {
  version: "1",
  title: "Packed API smoke test",
  blocks: [{
    type: "paragraph",
    content: [{ type: "text", text: "Imported from a clean consumer." }],
  }],
};
const planResult = validatePlan(input);
if (!planResult.ok) throw new Error("The typed plan must validate");
const themeResult = validateTheme(customTheme);
if (!themeResult.ok) throw new Error("The shipped custom theme must validate");
const theme: ThemeDefinition = customTheme;
const html = renderPlan(normalizePlan(planResult.value), { theme });
if (!html.includes("Packed API smoke test") || !html.includes("--bg: #f7f8fa")) {
  throw new Error("The packed programmatic API did not render the custom theme");
}
`,
    "utf8",
  );

  const compiler = resolve(
    projectRoot,
    "node_modules",
    "typescript",
    "lib",
    "tsc.js",
  );
  await execFileAsync(
    process.execPath,
    [
      compiler,
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2023",
      "--strict",
      "--resolveJsonModule",
      "--outDir",
      "compiled",
      "consumer.ts",
    ],
    { cwd: consumerDirectory },
  );
  await execFileAsync(process.execPath, [join(consumerDirectory, "compiled", "consumer.js")], {
    cwd: consumerDirectory,
  });

  const planPath = join(consumerDirectory, "plan.json");
  const outputPath = join(consumerDirectory, "plan.html");
  await writeFile(
    planPath,
    `${JSON.stringify({ version: "1", title: "Packed CLI smoke test" }, null, 2)}\n`,
    "utf8",
  );

  const binaryDirectory = join(consumerDirectory, "node_modules", ".bin");
  const cliResult = await runCommand(
    isWindows ? join("node_modules", ".bin", "heple.cmd") : join(binaryDirectory, "heple"),
    ["plan.json", "--output", "plan.html", "--no-open"],
    {
      cwd: consumerDirectory,
    },
  );
  const createdArtifact = cliResult.stdout
    .split(/\r?\n/u)
    .some((line) => line.startsWith("Created ") && line.endsWith("plan.html"));
  if (!createdArtifact) {
    throw new Error("The packed CLI did not report its generated artifact");
  }
  if (!(await readFile(outputPath, "utf8")).includes("Packed CLI smoke test")) {
    throw new Error("The packed CLI did not render the input plan");
  }

  process.stdout.write("Packed API and CLI smoke test passed\n");
} finally {
  await rm(temporaryRoot, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
