import { execFile } from "node:child_process";
import { mkdtemp, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cli = resolve("src/cli.ts");

async function runCli(args: string[]) {
  return execFileAsync(process.execPath, ["--import", "tsx", cli, ...args], {
    cwd: process.cwd(),
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

  it("shows setup guidance with the root help", async () => {
    const result = await runCli([]);

    expect(result.stdout).toContain("Make HTML plans with consistent design");
    expect(result.stdout).toContain("Run heple example to see an example plan.");
    expect(result.stdout).toContain("Run heple themes to choose a theme");
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
    expect(result.stdout).toContain("default");
    expect(result.stdout).toContain("bubblegum");
    expect(result.stdout).toContain("modern-minimal");
    expect(result.stdout).toContain("mono");
  });

  it("renders the shipped exhaustive example with navigation enabled", async () => {
    const directory = await mkdtemp(join(tmpdir(), "heple-test-"));
    const output = join(directory, "catalog.html");
    const result = await runCli(["example", "--output", output, "--no-open"]);

    expect(result.stdout).toBe(`Created ${output}\n`);
    const html = await readFile(output, "utf8");
    expect(html).toContain("The heple element catalog");
    expect(html).toContain('<nav class="toc"');
    expect(html).toContain('class="mode-toggle"');
  });
});
