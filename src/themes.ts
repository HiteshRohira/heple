import type { ThemeName } from "./schema.js";

interface ThemeMode {
  background: string;
  foreground: string;
  surface: string;
  raised: string;
  muted: string;
  border: string;
  accent: string;
  accentForeground: string;
  accentSoft: string;
  danger: string;
}

interface ThemeDefinition {
  description: string;
  radius: string;
  fontSans: string;
  fontMono: string;
  shadow: string;
  light: ThemeMode;
  dark: ThemeMode;
}

const sansFallback = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
const monoFallback = 'ui-monospace, "SFMono-Regular", Consolas, monospace';

const themes: Record<ThemeName, ThemeDefinition> = {
  default: {
    description: "The balanced tweakcn default",
    radius: "0.625rem",
    fontSans: sansFallback,
    fontMono: monoFallback,
    shadow: "0 1px 3px color-mix(in srgb, black 10%, transparent)",
    light: {
      background: "oklch(1 0 0)", foreground: "oklch(0.145 0 0)", surface: "oklch(1 0 0)",
      raised: "oklch(0.97 0 0)", muted: "oklch(0.556 0 0)", border: "oklch(0.922 0 0)",
      accent: "oklch(0.205 0 0)", accentForeground: "oklch(0.985 0 0)", accentSoft: "oklch(0.97 0 0)",
      danger: "oklch(0.577 0.245 27.325)",
    },
    dark: {
      background: "oklch(0.145 0 0)", foreground: "oklch(0.985 0 0)", surface: "oklch(0.205 0 0)",
      raised: "oklch(0.269 0 0)", muted: "oklch(0.708 0 0)", border: "oklch(0.275 0 0)",
      accent: "oklch(0.922 0 0)", accentForeground: "oklch(0.205 0 0)", accentSoft: "oklch(0.371 0 0)",
      danger: "oklch(0.704 0.191 22.216)",
    },
  },
  bubblegum: {
    description: "Playful candy colors with crisp shadows",
    radius: "0.4rem",
    fontSans: `Poppins, ${sansFallback}`,
    fontMono: `"Fira Code", ${monoFallback}`,
    shadow: "3px 3px 0 hsl(325.78 58.18% 56.86% / 0.5)",
    light: {
      background: "#f6e6ee", foreground: "#5b5b5b", surface: "#fdedc9", raised: "#b2e1eb",
      muted: "#7a7a7a", border: "#d04f99", accent: "#d04f99", accentForeground: "#ffffff",
      accentSoft: "#fbe2a7", danger: "#f96f70",
    },
    dark: {
      background: "#12242e", foreground: "#f3e3ea", surface: "#1c2e38", raised: "#24272b",
      muted: "#e4a2b1", border: "#324859", accent: "#fbe2a7", accentForeground: "#12242e",
      accentSoft: "#c67b96", danger: "#e35ea4",
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
      accentSoft: "#e8e8e8", danger: "#e54d2e",
    },
    dark: {
      background: "#111111", foreground: "#eeeeee", surface: "#191919", raised: "#222222",
      muted: "#b4b4b4", border: "#201e18", accent: "#ffe0c2", accentForeground: "#081a1b",
      accentSoft: "#2a2a2a", danger: "#e54d2e",
    },
  },
  claude: {
    description: "Warm editorial neutrals with terracotta accents",
    radius: "0.5rem",
    fontSans: sansFallback,
    fontMono: monoFallback,
    shadow: "0 1px 3px color-mix(in srgb, black 10%, transparent)",
    light: {
      background: "#faf9f5", foreground: "#3d3929", surface: "#faf9f5", raised: "#ede9de",
      muted: "#83827d", border: "#dad9d4", accent: "#c96442", accentForeground: "#ffffff",
      accentSoft: "#e9e6dc", danger: "#141413",
    },
    dark: {
      background: "#262624", foreground: "#c3c0b6", surface: "#262624", raised: "#1b1b19",
      muted: "#b7b5a9", border: "#3e3e38", accent: "#d97757", accentForeground: "#ffffff",
      accentSoft: "#1a1915", danger: "#ef4444",
    },
  },
  claymorphism: {
    description: "Rounded clay surfaces with soft dimensional shadows",
    radius: "1.25rem",
    fontSans: `"Plus Jakarta Sans", ${sansFallback}`,
    fontMono: `"Roboto Mono", ${monoFallback}`,
    shadow: "2px 2px 10px 4px hsl(240 4% 60% / 0.18)",
    light: {
      background: "#e7e5e4", foreground: "#1e293b", surface: "#f5f5f4", raised: "#e7e5e4",
      muted: "#6b7280", border: "#d6d3d1", accent: "#6366f1", accentForeground: "#ffffff",
      accentSoft: "#f3e5f5", danger: "#ef4444",
    },
    dark: {
      background: "#1e1b18", foreground: "#e2e8f0", surface: "#2c2825", raised: "#1f1c19",
      muted: "#9ca3af", border: "#3a3633", accent: "#818cf8", accentForeground: "#1e1b18",
      accentSoft: "#484441", danger: "#ef4444",
    },
  },
  neobrutalism: {
    description: "Hard edges, primary colors, and offset shadows",
    radius: "0px",
    fontSans: `"DM Sans", ${sansFallback}`,
    fontMono: `"Space Mono", ${monoFallback}`,
    shadow: "4px 4px 0 currentColor",
    light: {
      background: "#ffffff", foreground: "#000000", surface: "#ffffff", raised: "#f0f0f0",
      muted: "#333333", border: "#000000", accent: "#ff3333", accentForeground: "#ffffff",
      accentSoft: "#ffff00", danger: "#000000",
    },
    dark: {
      background: "#000000", foreground: "#ffffff", surface: "#333333", raised: "#1a1a1a",
      muted: "#cccccc", border: "#ffffff", accent: "#ff6666", accentForeground: "#000000",
      accentSoft: "#3399ff", danger: "#ffffff",
    },
  },
  "sage-garden": {
    description: "Quiet botanical neutrals with sage accents",
    radius: "0.35rem",
    fontSans: `Antic, ${sansFallback}`,
    fontMono: `"JetBrains Mono", ${monoFallback}`,
    shadow: "0 1px 2px color-mix(in srgb, #1a1f2e 4%, transparent)",
    light: {
      background: "#f8f7f4", foreground: "#1a1f2e", surface: "#ffffff", raised: "#e8e6e1",
      muted: "#6b7280", border: "#e8e6e1", accent: "#7c9082", accentForeground: "#ffffff",
      accentSoft: "#bfc9bb", danger: "#c73e3a",
    },
    dark: {
      background: "#0a0a0a", foreground: "#f5f5f5", surface: "#121212", raised: "#1a1a1a",
      muted: "#a0a0a0", border: "#2a2a2a", accent: "#7c9082", accentForeground: "#000000",
      accentSoft: "#36443a", danger: "#ef4444",
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
      accentSoft: "#ededed", danger: "#ca3214",
    },
    dark: {
      background: "#121212", foreground: "#e2e8f0", surface: "#171717", raised: "#1f1f1f",
      muted: "#a2a2a2", border: "#292929", accent: "#006239", accentForeground: "#dde8e3",
      accentSoft: "#313131", danger: "#541c15",
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
      accentSoft: "#e3ecf6", danger: "#f4212e",
    },
    dark: {
      background: "#000000", foreground: "#e7e9ea", surface: "#17181c", raised: "#181818",
      muted: "#72767a", border: "#242628", accent: "#1c9cf0", accentForeground: "#ffffff",
      accentSoft: "#061622", danger: "#f4212e",
    },
  },
  vercel: {
    description: "Sharp monochrome product surfaces",
    radius: "0.5rem",
    fontSans: `Geist, ${sansFallback}`,
    fontMono: `"Geist Mono", ${monoFallback}`,
    shadow: "0 1px 2px color-mix(in srgb, black 18%, transparent)",
    light: {
      background: "oklch(0.99 0 0)", foreground: "oklch(0 0 0)", surface: "oklch(1 0 0)",
      raised: "oklch(0.97 0 0)", muted: "oklch(0.44 0 0)", border: "oklch(0.92 0 0)",
      accent: "oklch(0 0 0)", accentForeground: "oklch(1 0 0)", accentSoft: "oklch(0.94 0 0)",
      danger: "oklch(0.63 0.19 23.03)",
    },
    dark: {
      background: "oklch(0 0 0)", foreground: "oklch(1 0 0)", surface: "oklch(0.14 0 0)",
      raised: "oklch(0.23 0 0)", muted: "oklch(0.72 0 0)", border: "oklch(0.26 0 0)",
      accent: "oklch(1 0 0)", accentForeground: "oklch(0 0 0)", accentSoft: "oklch(0.32 0 0)",
      danger: "oklch(0.69 0.20 23.91)",
    },
  },
  "violet-bloom": {
    description: "Expressive violet accents and pillowy surfaces",
    radius: "1.4rem",
    fontSans: `"Plus Jakarta Sans", ${sansFallback}`,
    fontMono: `"IBM Plex Mono", ${monoFallback}`,
    shadow: "0 2px 3px color-mix(in srgb, black 16%, transparent)",
    light: {
      background: "#fdfdfd", foreground: "#000000", surface: "#fdfdfd", raised: "#f5f5f5",
      muted: "#525252", border: "#e7e7ee", accent: "#7033ff", accentForeground: "#ffffff",
      accentSoft: "#e2ebff", danger: "#e54b4f",
    },
    dark: {
      background: "#1a1b1e", foreground: "#f0f0f0", surface: "#222327", raised: "#2a2c33",
      muted: "#a0a0a0", border: "#33353a", accent: "#8c5cff", accentForeground: "#ffffff",
      accentSoft: "#1e293b", danger: "#f87171",
    },
  },
  "modern-minimal": {
    description: "Minimal blue product UI with compact geometry",
    radius: "0.375rem",
    fontSans: `Inter, ${sansFallback}`,
    fontMono: `"JetBrains Mono", ${monoFallback}`,
    shadow: "0 1px 3px color-mix(in srgb, black 10%, transparent)",
    light: {
      background: "#ffffff", foreground: "#333333", surface: "#ffffff", raised: "#f9fafb",
      muted: "#6b7280", border: "#e5e7eb", accent: "#3b82f6", accentForeground: "#ffffff",
      accentSoft: "#e0f2fe", danger: "#ef4444",
    },
    dark: {
      background: "#171717", foreground: "#e5e5e5", surface: "#262626", raised: "#1f1f1f",
      muted: "#a3a3a3", border: "#404040", accent: "#3b82f6", accentForeground: "#ffffff",
      accentSoft: "#1e3a8a", danger: "#ef4444",
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
      accentSoft: "#f5f5f5", danger: "#e7000b",
    },
    dark: {
      background: "#0a0a0a", foreground: "#fafafa", surface: "#191919", raised: "#262626",
      muted: "#a1a1a1", border: "#383838", accent: "#737373", accentForeground: "#fafafa",
      accentSoft: "#404040", danger: "#ff6467",
    },
  },
};

function modeCss(mode: ThemeMode, dark: boolean): string {
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
  --code-bg: ${dark
    ? `color-mix(in srgb, ${mode.background} 72%, black)`
    : `color-mix(in srgb, ${mode.surface} 88%, ${mode.raised})`};
  --code-text: ${mode.foreground};
  --code-muted: color-mix(in srgb, ${mode.foreground} ${dark ? "62%" : "58%"}, var(--code-bg));
  --code-border: color-mix(in srgb, ${mode.foreground} ${dark ? "18%" : "14%"}, var(--code-bg));
  --code-highlight: color-mix(in srgb, ${mode.accent} ${dark ? "22%" : "11%"}, var(--code-bg));
  --info: ${mode.accent};
  --info-soft: color-mix(in srgb, ${mode.accent} ${dark ? "20%" : "12%"}, ${mode.surface});
  --success: ${dark ? "#55d6a5" : "#16805a"};
  --success-soft: color-mix(in srgb, var(--success) ${dark ? "18%" : "11%"}, ${mode.surface});
  --warning: ${dark ? "#f3b45d" : "#a15c00"};
  --warning-soft: color-mix(in srgb, var(--warning) ${dark ? "18%" : "11%"}, ${mode.surface});
  --danger: ${mode.danger};`;
}

export function themeCss(theme: ThemeName): string {
  const definition = themes[theme];
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
