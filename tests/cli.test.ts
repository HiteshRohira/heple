import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cli = resolve("src/cli.ts");
const tsx = import.meta.resolve("tsx");

async function runCli(args: string[], env?: NodeJS.ProcessEnv, cwd = process.cwd()) {
  return execFileAsync(process.execPath, ["--import", tsx, cli, ...args], {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
  });
}

describe("heple CLI", () => {
  it("prints the package version", async () => {
    const result = await runCli(["--version"]);
    expect(result.stdout).toBe("0.0.1\n");
  });

  it("runs when invoked through a global-install-style symlink", async () => {
    const directory = await mkdtemp(join(tmpdir(), "heple-test-"));
    const linkedCli = join(directory, "heple");
    await symlink(cli, linkedCli);

    const result = await execFileAsync(
      process.execPath,
      ["--import", "tsx", linkedCli, "--version"],
      { cwd: process.cwd() },
    );

    expect(result.stdout).toBe("0.0.1\n");
    expect(result.stderr).toBe("");
  });

  it("shows only the welcome message when run without arguments", async () => {
    const result = await runCli([]);

    expect(result.stdout).toBe(
      `Make HTML plans with consistent design. heple turns a structured JSON plan into deterministic, self-contained HTML and opens it in your default browser.

If you are an agent, run heple prompt to see what you have to do.
If you are a human, run heple example.
`,
    );
    expect(result.stderr).toBe("");
  });

  it("shows arguments, options, and commands with --help", async () => {
    const result = await runCli(["--help"]);

    expect(result.stdout).toContain("Arguments:");
    expect(result.stdout).toContain("Options:");
    expect(result.stdout).toContain("Commands:");
  });

  it("validates a plan", async () => {
    const result = await runCli(["validate", "fixtures/implementation-plan.json"]);
    expect(result.stdout).toBe("Plan is valid\n");
    expect(result.stderr).toBe("");
  });

  it("renders without launching a browser", async () => {
    const directory = await mkdtemp(join(tmpdir(), "heple-test-"));
    const output = join(directory, "plan.html");
    const result = await runCli([
      "fixtures/implementation-plan.json",
      "--theme",
      "sage-garden",
      "--output",
      output,
      "--no-open",
    ]);

    expect(result.stdout).toBe(`Created ${output}\n`);
    const html = await readFile(output, "utf8");
    expect(html).toContain("--bg: #f8f7f4");
    expect(html).not.toContain('<nav class="toc"');
  });

  it("opts into the right-side navigator", async () => {
    const directory = await mkdtemp(join(tmpdir(), "heple-test-"));
    const output = join(directory, "plan.html");
    await runCli([
      "fixtures/implementation-plan.json",
      "--navigation",
      "--output",
      output,
      "--no-open",
    ]);

    expect(await readFile(output, "utf8")).toContain('<nav class="toc"');
  });

  it("prints available themes", async () => {
    const result = await runCli(["themes"]);
    expect(result.stdout).toContain("Themes are inspired by tweakcn.");
    expect(result.stdout).toContain("default");
    expect(result.stdout).toContain("bubblegum");
    expect(result.stdout).toContain("modern-minimal");
    expect(result.stdout).toContain("mono");
  });

  it("saves and uses the selected default theme", async () => {
    const directory = await mkdtemp(join(tmpdir(), "heple-test-"));
    const configHome = join(directory, "config");
    const output = join(directory, "plan.html");
    const env = { XDG_CONFIG_HOME: configHome };

    const selection = await runCli(["themes", "sage-garden"], env);
    expect(selection.stdout).toContain("Default theme changed to sage-garden.");
    expect(
      JSON.parse(await readFile(join(configHome, "heple", "config.json"), "utf8")),
    ).toEqual({ theme: "sage-garden" });

    await runCli([
      "fixtures/implementation-plan.json",
      "--output",
      output,
      "--no-open",
    ], env);
    expect(await readFile(output, "utf8")).toContain("--bg: #f8f7f4");
  });

  it("renders the shipped exhaustive example with navigation enabled", async () => {
    const directory = await mkdtemp(join(tmpdir(), "heple-test-"));
    const cacheHome = join(directory, "cache");
    const output = join(cacheHome, "heple", "example.html");
    const result = await runCli(["example", "--no-open"], {
      XDG_CACHE_HOME: cacheHome,
      XDG_CONFIG_HOME: join(directory, "config"),
    });

    expect(result.stdout).toBe(`Created ${output}\n`);
    const html = await readFile(output, "utf8");
    expect(html).toContain("The heple element catalog");
    expect(html).toContain('<nav class="toc"');
    expect(html).toContain('class="mode-toggle"');
  });

  it("overwrites one cached example without writing to the current directory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "heple-test-"));
    const workingDirectory = join(directory, "workspace");
    const cacheHome = join(directory, "cache");
    const configHome = join(directory, "config");
    const output = join(cacheHome, "heple", "example.html");
    const env = { XDG_CACHE_HOME: cacheHome, XDG_CONFIG_HOME: configHome };
    await mkdir(workingDirectory);
    await runCli(["themes", "twitter"], env, workingDirectory);

    const firstRun = await runCli(["example", "--no-open"], env, workingDirectory);
    expect(firstRun.stdout).toBe(`Created ${output}\n`);
    expect(await readFile(output, "utf8")).toContain("--accent: #1e9df1");
    await expect(readFile(join(workingDirectory, "heple-example.html"), "utf8"))
      .rejects.toMatchObject({ code: "ENOENT" });

    await writeFile(output, "stale example", "utf8");
    await runCli(["example", "--no-open"], env, workingDirectory);
    expect(await readFile(output, "utf8")).toContain("The heple element catalog");
  });
});
