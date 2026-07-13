import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { selectTheme } from "../src/theme-selector.js";

class FakeInput extends EventEmitter {
  isRaw = false;
  paused = true;

  isPaused() {
    return this.paused;
  }

  setRawMode(raw: boolean) {
    this.isRaw = raw;
    return this;
  }

  resume() {
    this.paused = false;
    return this;
  }

  pause() {
    this.paused = true;
    return this;
  }
}

describe("theme selector", () => {
  it("pauses stdin after a theme is selected so the command can exit", async () => {
    const input = new FakeInput();
    const output = { write: () => true };
    const selection = selectTheme(
      "default",
      input as unknown as NodeJS.ReadStream,
      output as unknown as NodeJS.WriteStream,
    );

    input.emit("keypress", undefined, { name: "return" });

    expect(await selection).toBe("default");
    expect(input.paused).toBe(true);
    expect(input.isRaw).toBe(false);
  });
});
