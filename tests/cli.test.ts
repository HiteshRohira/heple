import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
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
      "midnight",
      "--output",
      output,
      "--no-open",
    ]);

    expect(result.stdout).toBe(`Created ${output}\n`);
    const html = await readFile(output, "utf8");
    expect(html).toContain("--bg: #11151c");
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
    expect(result.stdout).toContain("paper");
    expect(result.stdout).toContain("midnight");
    expect(result.stdout).toContain("system");
  });
});
