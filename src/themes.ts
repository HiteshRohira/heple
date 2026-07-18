import { THEME_NAMES, type ThemeName } from "./schema.js";

export interface ThemeMode {
  background: string;
  foreground: string;
  surface: string;
  raised: string;
  muted: string;
  border: string;
  accent: string;
  accentForeground: string;
  accentSoft: string;
  info?: string;
  success?: string;
  warning?: string;
  danger: string;
  sidebar?: string;
  sidebarForeground?: string;
  sidebarAccent?: string;
  sidebarAccentForeground?: string;
  sidebarBorder?: string;
}

export interface ThemeDefinition {
  description: string;
  radius: string;
  fontSans: string;
  fontMono: string;
  shadow: string;
  light: ThemeMode;
  dark: ThemeMode;
}

export interface ThemeValidationIssue {
  path: string;
  message: string;
}

export type ThemeValidationResult =
  | { ok: true; value: ThemeName | ThemeDefinition }
  | { ok: false; issues: ThemeValidationIssue[] };

const sansFallback = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
const monoFallback = 'ui-monospace, "SFMono-Regular", Consolas, monospace';

const definitionFields = [
  "description",
  "radius",
  "fontSans",
  "fontMono",
  "shadow",
  "light",
  "dark",
] as const;

const requiredModeFields = [
  "background",
  "foreground",
  "surface",
  "raised",
  "muted",
  "border",
  "accent",
  "accentForeground",
  "accentSoft",
  "danger",
] as const;

const optionalModeFields = [
  "info",
  "success",
  "warning",
  "sidebar",
  "sidebarForeground",
  "sidebarAccent",
  "sidebarAccentForeground",
  "sidebarBorder",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inspectString(
  value: unknown,
  path: string,
  issues: ThemeValidationIssue[],
  cssValue = false,
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "must be a non-empty string" });
    return;
  }

  if (
    cssValue
    && (
      /[\u0000-\u001f\u007f;{}<>\\]/u.test(value)
      || value.includes("/*")
      || value.includes("*/")
    )
  ) {
    issues.push({ path, message: "must be a single safe CSS value" });
    return;
  }

  if (cssValue && /\b(?:url|src|image|image-set|cross-fade|element)\s*\(/iu.test(value)) {
    issues.push({ path, message: "must not load an external resource" });
  }
}

function inspectMode(
  value: unknown,
  path: string,
  issues: ThemeValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }

  const allowedFields = new Set<string>([...requiredModeFields, ...optionalModeFields]);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      issues.push({ path: `${path}/${field}`, message: "is not a supported theme token" });
    }
  }

  for (const field of requiredModeFields) {
    inspectString(value[field], `${path}/${field}`, issues, true);
  }
  for (const field of optionalModeFields) {
    if (value[field] !== undefined) {
      inspectString(value[field], `${path}/${field}`, issues, true);
    }
  }
}

export function validateTheme(theme: unknown): ThemeValidationResult {
  if (typeof theme === "string") {
    return (THEME_NAMES as readonly string[]).includes(theme)
      ? { ok: true, value: theme as ThemeName }
      : {
          ok: false,
          issues: [{ path: "/", message: `must be one of: ${THEME_NAMES.join(", ")}` }],
        };
  }

  if (!isRecord(theme)) {
    return {
      ok: false,
      issues: [{ path: "/", message: "must be a built-in theme name or theme object" }],
    };
  }

  const issues: ThemeValidationIssue[] = [];
  const allowedFields = new Set<string>(definitionFields);
  for (const field of Object.keys(theme)) {
    if (!allowedFields.has(field)) {
      issues.push({ path: `/${field}`, message: "is not a supported theme property" });
    }
  }

  inspectString(theme.description, "/description", issues);
  inspectString(theme.radius, "/radius", issues, true);
  inspectString(theme.fontSans, "/fontSans", issues, true);
  inspectString(theme.fontMono, "/fontMono", issues, true);
  inspectString(theme.shadow, "/shadow", issues, true);
  inspectMode(theme.light, "/light", issues);
  inspectMode(theme.dark, "/dark", issues);

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: theme as unknown as ThemeDefinition };
}

export function formatThemeValidationIssues(issues: ThemeValidationIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}

function assertValidTheme(theme: unknown): asserts theme is ThemeName | ThemeDefinition {
  const result = validateTheme(theme);
  if (!result.ok) {
    throw new TypeError(
      `Invalid theme definition:\n${formatThemeValidationIssues(result.issues)}`,
    );
  }
}

const themes: Record<ThemeName, ThemeDefinition> = {
  default: {
    description: "The balanced default",
    radius: "0.625rem",
    fontSans: sansFallback,
    fontMono: monoFallback,
    shadow: "0 1px 3px color-mix(in srgb, black 10%, transparent)",
    light: {
      background: "oklch(1 0 0)", foreground: "oklch(0.145 0 0)", surface: "oklch(1 0 0)",
      raised: "oklch(0.97 0 0)", muted: "oklch(0.556 0 0)", border: "oklch(0.922 0 0)",
      accent: "oklch(0.205 0 0)", accentForeground: "oklch(0.985 0 0)", accentSoft: "oklch(0.97 0 0)",
      info: "oklch(0.488 0.243 264.376)", success: "oklch(0.6 0.118 184.704)",
      warning: "oklch(0.769 0.188 70.08)",
      danger: "oklch(0.577 0.245 27.325)",
    },
    dark: {
      background: "oklch(0.145 0 0)", foreground: "oklch(0.985 0 0)", surface: "oklch(0.205 0 0)",
      raised: "oklch(0.269 0 0)", muted: "oklch(0.708 0 0)", border: "oklch(0.275 0 0)",
      accent: "oklch(0.922 0 0)", accentForeground: "oklch(0.205 0 0)", accentSoft: "oklch(0.371 0 0)",
      info: "oklch(0.488 0.243 264.376)", success: "oklch(0.696 0.17 162.48)",
      warning: "oklch(0.769 0.188 70.08)",
      danger: "oklch(0.704 0.191 22.216)",
    },
  },
  caffeine: {
    description: "Warm coffee neutrals and restrained contrast",
    radius: "0.5rem",
    fontSans: sansFallback,
    fontMono: monoFallback,
    shadow: "0 1px 3px color-mix(in srgb, black 10%, transparent)",
    light: {
      background: "#f9f9f9", foreground: "#202020", surface: "#fcfcfc", raised: "#efefef",
      muted: "#646464", border: "#d8d8d8", accent: "#644a40", accentForeground: "#ffffff",
      accentSoft: "#e8e8e8", info: "#644a40", success: "#65734f", warning: "#a86424",
      danger: "#e54d2e", sidebar: "#fbfbfb", sidebarForeground: "#252525",
      sidebarAccent: "#f7f7f7", sidebarAccentForeground: "#343434", sidebarBorder: "#ebebeb",
    },
    dark: {
      background: "#111111", foreground: "#eeeeee", surface: "#191919", raised: "#222222",
      muted: "#b4b4b4", border: "#201e18", accent: "#ffe0c2", accentForeground: "#081a1b",
      accentSoft: "#2a2a2a", info: "#ffe0c2", success: "#9db58c", warning: "#e3a45f",
      danger: "#e54d2e", sidebar: "#18181b", sidebarForeground: "#f4f4f5",
      sidebarAccent: "#27272a", sidebarAccentForeground: "#f4f4f5", sidebarBorder: "#27272a",
    },
  },
  clay: {
    description: "Soft clay surfaces with restrained indigo accents",
    radius: "1.25rem",
    fontSans: `"Plus Jakarta Sans", ${sansFallback}`,
    fontMono: `"Roboto Mono", ${monoFallback}`,
    shadow: "2px 2px 10px 4px hsl(240 4% 60% / 0.18)",
    light: {
      background: "#e7e5e4", foreground: "#1e293b", surface: "#f5f5f4", raised: "#e7e5e4",
      muted: "#6b7280", border: "#d6d3d1", accent: "#6366f1", accentForeground: "#ffffff",
      accentSoft: "#f3e5f5", info: "#6366f1", success: "#16805a", warning: "#a15c00",
      danger: "#ef4444", sidebar: "#d6d3d1", sidebarForeground: "#1e293b",
      sidebarAccent: "#f3e5f5", sidebarAccentForeground: "#374151", sidebarBorder: "#d6d3d1",
    },
    dark: {
      background: "#1e1b18", foreground: "#e2e8f0", surface: "#2c2825", raised: "#1f1c19",
      muted: "#9ca3af", border: "#3a3633", accent: "#818cf8", accentForeground: "#1e1b18",
      accentSoft: "#484441", info: "#818cf8", success: "#55d6a5", warning: "#f3b45d",
      danger: "#ef4444", sidebar: "#3a3633", sidebarForeground: "#e2e8f0",
      sidebarAccent: "#484441", sidebarAccentForeground: "#d1d5db", sidebarBorder: "#3a3633",
    },
  },
  supabase: {
    description: "Clean grayscale surfaces with a green product accent",
    radius: "0.5rem",
    fontSans: `Outfit, ${sansFallback}`,
    fontMono: monoFallback,
    shadow: "0 1px 3px color-mix(in srgb, black 17%, transparent)",
    light: {
      background: "#fcfcfc", foreground: "#171717", surface: "#fcfcfc", raised: "#ededed",
      muted: "#202020", border: "#dfdfdf", accent: "#72e3ad", accentForeground: "#1e2723",
      accentSoft: "#ededed", info: "#3b82f6", success: "#10b981", warning: "#f59e0b",
      danger: "#ca3214", sidebar: "#fcfcfc", sidebarForeground: "#707070",
      sidebarAccent: "#ededed", sidebarAccentForeground: "#202020", sidebarBorder: "#dfdfdf",
    },
    dark: {
      background: "#121212", foreground: "#e2e8f0", surface: "#171717", raised: "#1f1f1f",
      muted: "#a2a2a2", border: "#292929", accent: "#006239", accentForeground: "#dde8e3",
      accentSoft: "#313131", info: "#60a5fa", success: "#4ade80", warning: "#fbbf24",
      danger: "#ff7b6b", sidebar: "#121212", sidebarForeground: "#898989",
      sidebarAccent: "#313131", sidebarAccentForeground: "#fafafa", sidebarBorder: "#292929",
    },
  },
  twitter: {
    description: "High-clarity social UI with sky-blue accents",
    radius: "1.3rem",
    fontSans: `"Open Sans", ${sansFallback}`,
    fontMono: `Menlo, ${monoFallback}`,
    shadow: "none",
    light: {
      background: "#ffffff", foreground: "#0f1419", surface: "#f7f8f8", raised: "#e5e5e6",
      muted: "#0f1419", border: "#e1eaef", accent: "#1e9df1", accentForeground: "#ffffff",
      accentSoft: "#e3ecf6", info: "#1e9df1", success: "#00b87a", warning: "#f7b928",
      danger: "#f4212e", sidebar: "#f7f8f8", sidebarForeground: "#0f1419",
      sidebarAccent: "#e3ecf6", sidebarAccentForeground: "#1e9df1", sidebarBorder: "#e1e8ed",
    },
    dark: {
      background: "#000000", foreground: "#e7e9ea", surface: "#17181c", raised: "#181818",
      muted: "#72767a", border: "#242628", accent: "#1c9cf0", accentForeground: "#ffffff",
      accentSoft: "#061622", info: "#1e9df1", success: "#00b87a", warning: "#f7b928",
      danger: "#f4212e", sidebar: "#17181c", sidebarForeground: "#d9d9d9",
      sidebarAccent: "#061622", sidebarAccentForeground: "#1c9cf0", sidebarBorder: "#38444d",
    },
  },
  mono: {
    description: "Strict monochrome with square geometry",
    radius: "0rem",
    fontSans: `"Geist Mono", ${monoFallback}`,
    fontMono: `"Geist Mono", ${monoFallback}`,
    shadow: "none",
    light: {
      background: "#ffffff", foreground: "#0a0a0a", surface: "#ffffff", raised: "#f5f5f5",
      muted: "#717171", border: "#e5e5e5", accent: "#737373", accentForeground: "#fafafa",
      accentSoft: "#f5f5f5", info: "#737373", success: "#525252", warning: "#a1a1a1",
      danger: "#e7000b", sidebar: "#fafafa", sidebarForeground: "#0a0a0a",
      sidebarAccent: "#f5f5f5", sidebarAccentForeground: "#171717", sidebarBorder: "#e5e5e5",
    },
    dark: {
      background: "#0a0a0a", foreground: "#fafafa", surface: "#191919", raised: "#262626",
      muted: "#a1a1a1", border: "#383838", accent: "#737373", accentForeground: "#fafafa",
      accentSoft: "#404040", info: "#a1a1a1", success: "#737373", warning: "#d4d4d4",
      danger: "#ff6467", sidebar: "#171717", sidebarForeground: "#fafafa",
      sidebarAccent: "#262626", sidebarAccentForeground: "#fafafa", sidebarBorder: "#ffffff",
    },
  },
};

function modeCss(mode: ThemeMode, dark: boolean): string {
  const info = mode.info ?? mode.accent;
  const success = mode.success ?? (dark ? "#55d6a5" : "#16805a");
  const warning = mode.warning ?? (dark ? "#f3b45d" : "#a15c00");
  const softMix = dark ? "24%" : "18%";
  const textMix = dark ? "55%" : "50%";
  return `
  --bg: ${mode.background};
  --surface: ${mode.surface};
  --surface-raised: ${mode.raised};
  --text: ${mode.foreground};
  --muted: ${mode.muted};
  --border: ${mode.border};
  --accent: ${mode.accent};
  --accent-foreground: ${mode.accentForeground};
  --accent-soft: ${mode.accentSoft};
  --sidebar: ${mode.sidebar ?? mode.surface};
  --sidebar-text: ${mode.sidebarForeground ?? mode.foreground};
  --sidebar-muted: color-mix(in srgb, ${mode.sidebarForeground ?? mode.foreground} 67%, ${mode.sidebar ?? mode.surface});
  --sidebar-accent: ${mode.sidebarAccent ?? mode.accentSoft};
  --sidebar-accent-text: ${mode.sidebarAccentForeground ?? mode.foreground};
  --sidebar-border: ${mode.sidebarBorder ?? mode.border};
  --code-bg: ${dark
    ? `color-mix(in srgb, ${mode.background} 72%, black)`
    : `color-mix(in srgb, ${mode.surface} 90%, ${mode.foreground})`};
  --code-text: ${mode.foreground};
  --code-muted: color-mix(in srgb, ${mode.foreground} 68%, var(--code-bg));
  --code-border: color-mix(in srgb, ${mode.foreground} ${dark ? "18%" : "14%"}, var(--code-bg));
  --code-highlight: color-mix(in srgb, ${mode.accent} ${dark ? "22%" : "11%"}, var(--code-bg));
  --accent-readable: color-mix(in srgb, ${mode.accent} 50%, ${mode.foreground});
  --secondary-text: color-mix(in srgb, ${mode.foreground} 67%, ${mode.background});
  --rule: color-mix(in srgb, ${mode.border} 72%, transparent);
  --info: ${info};
  --info-soft: color-mix(in srgb, var(--info) ${softMix}, ${mode.surface});
  --info-text: color-mix(in srgb, var(--info) ${textMix}, ${mode.foreground});
  --info-border: color-mix(in srgb, var(--info) 58%, ${mode.border});
  --success: ${success};
  --success-soft: color-mix(in srgb, var(--success) ${softMix}, ${mode.surface});
  --success-text: color-mix(in srgb, var(--success) ${textMix}, ${mode.foreground});
  --success-border: color-mix(in srgb, var(--success) 58%, ${mode.border});
  --warning: ${warning};
  --warning-soft: color-mix(in srgb, var(--warning) ${softMix}, ${mode.surface});
  --warning-text: color-mix(in srgb, var(--warning) ${textMix}, ${mode.foreground});
  --warning-border: color-mix(in srgb, var(--warning) 58%, ${mode.border});
  --danger: ${mode.danger};
  --danger-soft: color-mix(in srgb, var(--danger) ${softMix}, ${mode.surface});
  --danger-text: color-mix(in srgb, var(--danger) ${textMix}, ${mode.foreground});
  --danger-border: color-mix(in srgb, var(--danger) 58%, ${mode.border});`;
}

export function themeCss(theme: ThemeName | ThemeDefinition): string {
  assertValidTheme(theme);
  const definition = typeof theme === "string" ? themes[theme] : theme;
  return `
:root {
  color-scheme: light;
  --radius: ${definition.radius};
  --font-sans: ${definition.fontSans};
  --font-mono: ${definition.fontMono};
  --shadow: ${definition.shadow};
  ${modeCss(definition.light, false)}
}
:root[data-mode="dark"] {
  color-scheme: dark;
  ${modeCss(definition.dark, true)}
}`;
}

export const themeDescriptions = Object.fromEntries(
  Object.entries(themes).map(([name, definition]) => [name, definition.description]),
) as Record<ThemeName, string>;
