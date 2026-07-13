import type { ThemeName } from "./schema.js";

interface ThemeDefinition {
  description: string;
  foundation: string;
  light: string;
  dark: string;
}

const themes: Record<ThemeName, ThemeDefinition> = {
  signal: {
    description: "Crisp product UI with cobalt accents",
    foundation: `
      --radius: 12px;
      --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    `,
    light: `
      --bg: #f6f7fb;
      --surface: #ffffff;
      --surface-raised: #eef1f7;
      --text: #151821;
      --muted: #657083;
      --border: #d9deea;
      --accent: #315efb;
      --accent-foreground: #ffffff;
      --accent-soft: #e8edff;
      --code-bg: #121722;
      --code-text: #e9efff;
      --success: #16805a;
      --warning: #a15c00;
      --danger: #c33748;
      --shadow: 0 1px 2px rgba(20, 27, 45, 0.06), 0 8px 24px rgba(20, 27, 45, 0.05);
    `,
    dark: `
      --bg: #0d1017;
      --surface: #151a24;
      --surface-raised: #1b2230;
      --text: #f0f3fa;
      --muted: #9ca8ba;
      --border: #2b3546;
      --accent: #7c9cff;
      --accent-foreground: #0b1020;
      --accent-soft: #1e2c59;
      --code-bg: #080b11;
      --code-text: #e9efff;
      --success: #55d6a5;
      --warning: #f3b45d;
      --danger: #ff8291;
      --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 30px rgba(0, 0, 0, 0.24);
    `,
  },
  orchid: {
    description: "Soft expressive surfaces with violet contrast",
    foundation: `
      --radius: 22px;
      --font-sans: ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif;
      --font-mono: "SFMono-Regular", Consolas, monospace;
    `,
    light: `
      --bg: #faf7ff;
      --surface: #ffffff;
      --surface-raised: #f2ecff;
      --text: #30243a;
      --muted: #75667f;
      --border: #e3d7ed;
      --accent: #7951d6;
      --accent-foreground: #ffffff;
      --accent-soft: #eee5ff;
      --code-bg: #251c2e;
      --code-text: #faefff;
      --success: #2f8664;
      --warning: #a96518;
      --danger: #c74767;
      --shadow: 0 18px 50px rgba(83, 49, 113, 0.11);
    `,
    dark: `
      --bg: #17121c;
      --surface: #211927;
      --surface-raised: #2d2235;
      --text: #f6eef8;
      --muted: #b8a5c0;
      --border: #44334e;
      --accent: #b99aff;
      --accent-foreground: #1d1327;
      --accent-soft: #3a2850;
      --code-bg: #0e0a12;
      --code-text: #f8efff;
      --success: #66d5a8;
      --warning: #efb967;
      --danger: #ff86a1;
      --shadow: 0 22px 60px rgba(0, 0, 0, 0.35);
    `,
  },
  circuit: {
    description: "Compact mono layout with hard-edged contrast",
    foundation: `
      --radius: 4px;
      --font-sans: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    `,
    light: `
      --bg: #f2f6ec;
      --surface: #fbfff5;
      --surface-raised: #e8efdc;
      --text: #172018;
      --muted: #566358;
      --border: #344237;
      --accent: #087944;
      --accent-foreground: #f5fff8;
      --accent-soft: #ccefd6;
      --code-bg: #101610;
      --code-text: #ddffbd;
      --success: #087944;
      --warning: #8a5c00;
      --danger: #a62d3b;
      --shadow: 4px 4px 0 #344237;
    `,
    dark: `
      --bg: #0d120e;
      --surface: #151c16;
      --surface-raised: #202a20;
      --text: #efffe3;
      --muted: #9eae99;
      --border: #5b6d5c;
      --accent: #b8f35a;
      --accent-foreground: #142009;
      --accent-soft: #30451f;
      --code-bg: #080c08;
      --code-text: #dfffad;
      --success: #8ee8a7;
      --warning: #eac66c;
      --danger: #ff8a97;
      --shadow: 4px 4px 0 #6f8a70;
    `,
  },
};

export function themeCss(theme: ThemeName): string {
  const definition = themes[theme];
  return `
:root {
  color-scheme: light;
  ${definition.foundation}
  ${definition.light}
}
:root[data-mode="dark"] {
  color-scheme: dark;
  ${definition.dark}
}`;
}

export const themeDescriptions = Object.fromEntries(
  Object.entries(themes).map(([name, definition]) => [name, definition.description]),
) as Record<ThemeName, string>;
