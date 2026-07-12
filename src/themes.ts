import type { ThemeName } from "./schema.js";

const paper = `
  --bg: #f4f0e8;
  --surface: #fffdf8;
  --surface-raised: #ffffff;
  --text: #27241f;
  --muted: #716b61;
  --border: #d9d1c3;
  --accent: #b34b2d;
  --accent-soft: #f5ded3;
  --code-bg: #24211d;
  --code-text: #f7f1e7;
  --shadow: 0 18px 45px rgba(58, 46, 33, 0.08);
`;

const midnight = `
  --bg: #11151c;
  --surface: #181e27;
  --surface-raised: #1e2632;
  --text: #edf2f7;
  --muted: #9ba9b8;
  --border: #334052;
  --accent: #78c7d8;
  --accent-soft: #173b45;
  --code-bg: #0a0d12;
  --code-text: #e7edf5;
  --shadow: 0 18px 45px rgba(0, 0, 0, 0.28);
`;

export function themeCss(theme: ThemeName): string {
  if (theme === "paper") return `:root {${paper}}`;
  if (theme === "midnight") return `:root {${midnight}}`;
  return `
:root {${paper}}
@media (prefers-color-scheme: dark) {
  :root {${midnight}}
}`;
}

export const themeDescriptions: Record<ThemeName, string> = {
  paper: "Warm editorial light theme",
  midnight: "Dark technical theme",
  system: "Paper or midnight based on the browser preference",
};
