import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright-core";
import { normalizePlan } from "../src/normalize.js";
import { renderPlan } from "../src/render.js";
import type { PlanDocument } from "../src/schema.js";

const outputDirectory = "artifacts/renderer-visual";
const chromeCandidates = [
  process.env["HEPLE_CHROME_PATH"],
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((candidate): candidate is string => Boolean(candidate));

const chromePath = chromeCandidates.find(existsSync);
if (!chromePath) {
  throw new Error(
    "A local Chrome or Chromium executable is required. Set HEPLE_CHROME_PATH to its path.",
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertResponsiveLayout(
  page: Page,
  name: "mobile" | "desktop",
): Promise<void> {
  const layout = await page.evaluate(() => {
    const shell = document.querySelector(".shell");
    const toc = document.querySelector(".toc");
    if (!(shell instanceof HTMLElement) || !(toc instanceof HTMLElement)) {
      throw new Error("Expected the shell and navigation to render");
    }
    const shellBounds = shell.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      shellLeft: shellBounds.left,
      shellRight: shellBounds.right,
      tocDisplay: getComputedStyle(toc).display,
    };
  });

  assert(
    layout.documentWidth <= layout.viewportWidth,
    `${name} layout must not overflow horizontally`,
  );
  assert(layout.shellLeft >= 0, `${name} shell must remain inside the viewport`);
  assert(
    layout.shellRight <= layout.viewportWidth,
    `${name} shell must remain inside the viewport`,
  );
  assert(
    name === "mobile" ? layout.tocDisplay === "none" : layout.tocDisplay !== "none",
    `${name} navigation visibility must match the responsive contract`,
  );
}

const implementationPlan = normalizePlan(
  JSON.parse(await readFile("fixtures/implementation-plan.json", "utf8")) as PlanDocument,
);
const implementationPath = `${outputDirectory}/implementation-plan.html`;

const fragmentPlan: PlanDocument = {
  version: "1",
  title: "Fragment navigation",
  blocks: [
    {
      type: "paragraph",
      content: [{ type: "link", text: "Open hidden section", href: "#section-2-1" }],
    },
    {
      type: "details",
      summary: "Closed supporting material",
      blocks: [
        {
          type: "section",
          title: "Hidden section",
          blocks: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "This target starts inside closed details." }],
            },
          ],
        },
      ],
    },
  ],
};
const fragmentPath = `${outputDirectory}/fragment-navigation.html`;

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  implementationPath,
  renderPlan(implementationPlan, { theme: "default" }),
  "utf8",
);
await writeFile(fragmentPath, renderPlan(fragmentPlan, { theme: "default" }), "utf8");

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  const viewports = [
    { name: "mobile" as const, width: 390, height: 844 },
    { name: "desktop" as const, width: 1440, height: 1000 },
  ];

  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await page.goto(pathToFileURL(implementationPath).href);
    await assertResponsiveLayout(page, viewport.name);
    await page.screenshot({
      path: `${outputDirectory}/${viewport.name}-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
    await page.close();
  }

  const fragmentPage = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await fragmentPage.goto(`${pathToFileURL(fragmentPath).href}#section-2-1`);
  assert(
    await fragmentPage.locator("details").evaluate((details) => details.open),
    "direct fragment navigation must reveal a section inside closed details",
  );
  await fragmentPage.locator("details").evaluate((details) => {
    details.open = false;
  });
  await fragmentPage.locator(".toc").hover();
  await fragmentPage.locator('.toc a[href="#section-2-1"]').click();
  assert(
    await fragmentPage.locator("details").evaluate((details) => details.open),
    "navigation entries must reveal section targets inside closed details",
  );
  await fragmentPage.locator("details").evaluate((details) => {
    details.open = false;
  });
  const internalLink = fragmentPage.locator("main p a");
  assert(
    await internalLink.getAttribute("target") === null,
    "internal fragment links must stay in the current document",
  );
  await internalLink.click();
  assert(
    await fragmentPage.locator("details").evaluate((details) => details.open),
    "activating an internal fragment link must reveal its closed details ancestor",
  );
  await fragmentPage.screenshot({
    path: `${outputDirectory}/fragment-revealed-1024x768.png`,
    fullPage: true,
  });
  await fragmentPage.close();
} finally {
  await browser.close();
}

console.log(`Renderer visual checks passed; screenshots: ${outputDirectory}`);
