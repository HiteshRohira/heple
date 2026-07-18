import { emitKeypressEvents } from "node:readline";
import { THEME_NAMES, type ThemeName } from "./schema.js";

export async function selectTheme(
  currentTheme: ThemeName,
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WriteStream = process.stdout,
): Promise<ThemeName | undefined> {
  let selectedIndex = THEME_NAMES.indexOf(currentTheme);
  let firstRender = true;
  const wasRaw = input.isRaw;

  output.write(
    "Choose your default theme. Use ↑/↓ to move, Enter to save, Esc to cancel.\n\n",
  );

  const render = () => {
    if (!firstRender) output.write(`\u001B[${THEME_NAMES.length}A`);
    for (const [index, theme] of THEME_NAMES.entries()) {
      const marker = index === selectedIndex ? "❯" : " ";
      output.write(`\u001B[2K${marker} ${theme}\n`);
    }
    firstRender = false;
  };

  render();
  output.write("\u001B[?25l");
  emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();

  return new Promise((resolve) => {
    const finish = (theme?: ThemeName) => {
      input.off("keypress", onKeypress);
      input.setRawMode(wasRaw);
      input.pause();
      output.write("\u001B[?25h");
      resolve(theme);
    };

    const onKeypress = (_character: string | undefined, key: { name?: string; ctrl?: boolean }) => {
      if (key.name === "up") {
        selectedIndex = (selectedIndex - 1 + THEME_NAMES.length) % THEME_NAMES.length;
        render();
      } else if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % THEME_NAMES.length;
        render();
      } else if (key.name === "return" || key.name === "enter") {
        finish(THEME_NAMES[selectedIndex]);
      } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        finish();
      }
    };

    input.on("keypress", onKeypress);
  });
}
