import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pixelmatch from "pixelmatch";
import { chromium, type Page } from "playwright-core";
import { PNG } from "pngjs";
import { normalizePlan } from "../src/normalize.js";
import { renderPlan } from "../src/render.js";
import type { PlanDocument } from "../src/schema.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(repositoryRoot, "artifacts/renderer-visual");
const baselineDirectory = resolve(repositoryRoot, "tests/visual-baselines");
const updateBaselines = process.argv.includes("--update");
const pixelThreshold = 0.2;
const maximumDiffRatio = 0.05;
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

async function freezeVisualState(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
    `,
  });
  await page.evaluate(() => {
    window.scrollTo(window.scrollX, window.scrollY);
    return new Promise<void>((resolveFrame) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolveFrame());
      });
    });
  });
}

async function captureAndCompare(page: Page, name: string): Promise<void> {
  await freezeVisualState(page);
  const actualPath = resolve(outputDirectory, `${name}.png`);
  const baselinePath = resolve(baselineDirectory, `${name}.png`);
  const actualBuffer = await page.screenshot({
    path: actualPath,
    animations: "disabled",
    caret: "hide",
  });

  if (updateBaselines) {
    await mkdir(baselineDirectory, { recursive: true });
    await writeFile(baselinePath, actualBuffer);
    console.log(`Updated visual baseline: ${baselinePath}`);
    return;
  }

  assert(
    existsSync(baselinePath),
    `Missing visual baseline ${baselinePath}; run pnpm test:visual:update`,
  );
  const baseline = PNG.sync.read(await readFile(baselinePath));
  const actual = PNG.sync.read(actualBuffer);
  assert(
    baseline.width === actual.width && baseline.height === actual.height,
    `${name} dimensions changed from ${baseline.width}x${baseline.height} `
      + `to ${actual.width}x${actual.height}`,
  );

  const diff = new PNG({ width: actual.width, height: actual.height });
  const differingPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    actual.width,
    actual.height,
    { threshold: pixelThreshold },
  );
  const diffRatio = differingPixels / (actual.width * actual.height);
  if (diffRatio > maximumDiffRatio) {
    const diffPath = resolve(outputDirectory, `${name}.diff.png`);
    await writeFile(diffPath, PNG.sync.write(diff));
    throw new Error(
      `${name} differs from its baseline by ${(diffRatio * 100).toFixed(2)}% `
        + `(allowed ${(maximumDiffRatio * 100).toFixed(2)}%); diff: ${diffPath}`,
    );
  }
  console.log(`${name}: ${(diffRatio * 100).toFixed(2)}% pixel difference`);
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
  JSON.parse(
    await readFile(
      resolve(repositoryRoot, "fixtures/implementation-plan.json"),
      "utf8",
    ),
  ) as PlanDocument,
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
      deviceScaleFactor: 1,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await page.goto(pathToFileURL(implementationPath).href);
    await assertResponsiveLayout(page, viewport.name);
    await captureAndCompare(
      page,
      `${viewport.name}-${viewport.width}x${viewport.height}`,
    );
    await page.close();
  }

  const fragmentPage = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const fragmentUrl = pathToFileURL(fragmentPath).href;
  await fragmentPage.goto(`${fragmentUrl}#section-2-1`);
  assert(
    await fragmentPage.locator("details").evaluate((details) => details.open),
    "direct fragment navigation must reveal a section inside closed details",
  );
  await fragmentPage.goto(fragmentUrl);
  await fragmentPage.evaluate(() => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Object.defineProperty(window, "__hepleScrollIntoViewCalls", {
      configurable: true,
      value: 0,
      writable: true,
    });
    Element.prototype.scrollIntoView = function (...args) {
      const count = Reflect.get(window, "__hepleScrollIntoViewCalls");
      Reflect.set(window, "__hepleScrollIntoViewCalls", Number(count) + 1);
      return originalScrollIntoView.apply(this, args);
    };
  });
  await fragmentPage.locator("details").evaluate((details) => {
    details.open = false;
  });
  await fragmentPage.locator(".toc").hover();
  await fragmentPage.locator('.toc a[href="#section-2-1"]').click();
  assert(
    await fragmentPage.locator("details").evaluate((details) => details.open),
    "navigation entries must reveal section targets inside closed details",
  );
  await fragmentPage.waitForFunction(() => window.location.hash === "#section-2-1");
  assert(
    await fragmentPage.evaluate(() =>
      Reflect.get(window, "__hepleScrollIntoViewCalls") === 0
    ),
    "click navigation must rely on one native scroll instead of scrolling again",
  );
  await fragmentPage.goBack();
  await fragmentPage.waitForFunction(() => window.location.hash === "");
  await fragmentPage.locator("details").evaluate((details) => {
    details.open = false;
  });
  await fragmentPage.evaluate(() => {
    Reflect.set(window, "__hepleScrollIntoViewCalls", 0);
  });
  await fragmentPage.goForward();
  await fragmentPage.waitForFunction(() => {
    return window.location.hash === "#section-2-1"
      && Reflect.get(window, "__hepleScrollIntoViewCalls") === 1;
  });
  assert(
    await fragmentPage.locator("details").evaluate((details) => details.open),
    "forward navigation must reveal the fragment target inside closed details",
  );
  await fragmentPage.goBack();
  await fragmentPage.waitForFunction(() => window.location.hash === "");
  await fragmentPage.locator("details").evaluate((details) => {
    details.open = false;
  });
  await fragmentPage.evaluate(() => {
    Reflect.set(window, "__hepleScrollIntoViewCalls", 0);
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
  assert(
    await fragmentPage.evaluate(() =>
      Reflect.get(window, "__hepleScrollIntoViewCalls") === 0
    ),
    "inline fragment clicks must not trigger a second scripted scroll",
  );
  await captureAndCompare(fragmentPage, "fragment-revealed-1024x768");
  await fragmentPage.close();
} finally {
  await browser.close();
}

console.log(
  updateBaselines
    ? `Renderer visual baselines updated: ${baselineDirectory}`
    : `Renderer visual checks passed; actuals: ${outputDirectory}`,
);
