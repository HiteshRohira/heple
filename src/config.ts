import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { THEME_NAMES, type ThemeName } from "./schema.js";

interface HepleConfig {
  theme: ThemeName;
}

function configPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(configHome, "heple", "config.json");
}

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && THEME_NAMES.some((theme) => theme === value);
}

export async function getDefaultTheme(): Promise<ThemeName> {
  try {
    const config = JSON.parse(await readFile(configPath(), "utf8")) as Partial<HepleConfig>;
    return isThemeName(config.theme) ? config.theme : "default";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "default";
    if (error instanceof SyntaxError) return "default";
    throw error;
  }
}

export async function setDefaultTheme(theme: ThemeName): Promise<void> {
  const path = configPath();
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify({ theme }, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryPath, path);
}
