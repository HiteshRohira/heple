import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";

export class JsonParseError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(`Could not parse JSON: ${detail}`);
    this.name = "JsonParseError";
    this.detail = detail;
  }
}

export async function readInput(inputPath: string): Promise<unknown> {
  const source = inputPath === "-" ? await readStdin() : await readFile(inputPath, "utf8");
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new JsonParseError(detail);
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function defaultOutputPath(inputPath: string): string {
  if (inputPath === "-") return resolve("heple-plan.html");
  const absolute = resolve(inputPath);
  const extension = extname(absolute);
  const name = basename(absolute, extension);
  return resolve(dirname(absolute), `${name}.html`);
}

export async function writeArtifact(path: string, html: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, html, "utf8");
}
