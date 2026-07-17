import type { Block, Inline, PlanDocument, ThemeName } from "./schema.js";
import { themeCss, type ThemeDefinition } from "./themes.js";

export interface RenderOptions {
  theme: ThemeName | ThemeDefinition;
  navigation?: boolean;
}

interface TocItem {
  id: string;
  title: string;
  depth: number;
}

function sectionId(path: number[]): string {
  return `section-${path.join("-")}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(inline: Inline): string {
  switch (inline.type) {
    case "text":
      return escapeHtml(inline.text);
    case "link": {
      const href = escapeHtml(inline.href);
      const behavior = inline.href.startsWith("#")
        ? ' data-fragment-link'
        : ' target="_blank" rel="noopener noreferrer"';
      return `<a href="${href}"${behavior}>${escapeHtml(inline.text)}</a>`;
    }
    case "strong":
      return `<strong>${escapeHtml(inline.text)}</strong>`;
    case "emphasis":
      return `<em>${escapeHtml(inline.text)}</em>`;
    case "code":
      return `<code>${escapeHtml(inline.text)}</code>`;
    case "status":
      return `<span class="badge status-${inline.value}">${escapeHtml(inline.value.replace("_", " "))}</span>`;
    case "severity":
      return `<span class="badge severity-${inline.value}">${escapeHtml(inline.value)}</span>`;
  }
}

function renderInlineContent(content: Inline[]): string {
  return content.map(renderInline).join("");
}

function renderMetadata(items: Array<{ label: string; value: string }>): string {
  return `<div class="step-meta">${items
    .map(
      ({ label, value }) =>
        `<div class="fact"><span class="fact-label">${escapeHtml(label)}</span><span class="fact-value">${escapeHtml(value)}</span></div>`,
    )
    .join("")}</div>`;
}

function collectToc(blocks: Block[], path: number[] = [], depth = 0): TocItem[] {
  const items: TocItem[] = [];
  blocks.forEach((block, index) => {
    const nextPath = [...path, index + 1];
    if (block.type === "section") {
      items.push({ id: sectionId(nextPath), title: block.title, depth });
      items.push(...collectToc(block.blocks, nextPath, depth + 1));
    } else if (block.type === "details") {
      items.push(...collectToc(block.blocks, nextPath, depth));
    }
  });
  return items;
}

function renderBlocks(blocks: Block[], path: number[] = [], sectionHeadingLevel = 2): string {
  return blocks
    .map((block, index) =>
      renderBlock(block, [...path, index + 1], sectionHeadingLevel),
    )
    .join("\n");
}

function renderBlock(block: Block, path: number[], sectionHeadingLevel: number): string {
  switch (block.type) {
    case "section": {
      const headingLevel = Math.min(sectionHeadingLevel, 6);
      const id = sectionId(path);
      const headingId = `${id}-title`;
      return `<section class="section" id="${id}" aria-labelledby="${headingId}">
  <h${headingLevel} class="section-title" id="${headingId}">${escapeHtml(block.title)}</h${headingLevel}>
  ${renderBlocks(block.blocks, path, sectionHeadingLevel + 1)}
</section>`;
    }
    case "paragraph":
      return `<p>${renderInlineContent(block.content)}</p>`;
    case "list": {
      const style = block.style ?? "unordered";
      const tag = style === "ordered" ? "ol" : "ul";
      const items = block.items
        .map((item) => `<li>${renderInlineContent(item.content)}</li>`)
        .join("");
      return `<${tag}>${items}</${tag}>`;
    }
    case "callout": {
      const tone = block.tone ?? "info";
      const title = block.title
        ? `<strong class="callout-title">${escapeHtml(block.title)}</strong>`
        : "";
      return `<aside class="callout callout-${tone}">${title}<p>${renderInlineContent(block.content)}</p></aside>`;
    }
    case "steps":
      return `<ol class="steps">${block.items
        .map((step, index) => {
          const status = step.status
            ? `<span class="badge status-${step.status}">${escapeHtml(step.status)}</span>`
            : "";
          const description = step.description
            ? `<p>${escapeHtml(step.description)}</p>`
            : "";
          const meta = step.meta?.length ? renderMetadata(step.meta) : "";
          return `<li><span class="step-number" aria-hidden="true">${index + 1}</span><div><strong class="step-title">${escapeHtml(step.title)} ${status}</strong>${description}${meta}</div></li>`;
        })
        .join("")}</ol>`;
    case "table":
      return `<div class="table-wrap"><table>${block.caption ? `<caption>${escapeHtml(block.caption)}</caption>` : ""}<thead><tr>${block.columns
        .map(
          (column) =>
            `<th class="align-${column.align ?? "left"}" scope="col">${escapeHtml(column.label)}</th>`,
        )
        .join("")}</tr></thead><tbody>${block.rows
        .map(
          (row) =>
            `<tr>${row.cells
              .map(
                (cell, cellIndex) =>
                  `<td class="align-${block.columns[cellIndex]?.align ?? "left"}">${renderInlineContent(cell)}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("")}</tbody></table></div>`;
    case "code": {
      const label = block.filename ?? block.language;
      const codeLabel = label ? `<span class="code-label">${escapeHtml(label)}</span>` : "";
      const header = `<div class="code-toolbar">${codeLabel}<button class="copy-code" type="button" data-copy-code>Copy</button></div>`;
      const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "";
      const highlighted = new Set(block.highlightLines ?? []);
      const lines = block.code.split("\n");
      const code = lines
        .map(
          (line, index) =>
            `<span class="code-line${highlighted.has(index + 1) ? " highlighted" : ""}"><span class="line-number" aria-hidden="true">${index + 1}</span><span class="code-text">${escapeHtml(line)}</span></span>`,
        )
        .join("\n");
      return `<figure class="code-block">${header}<pre><code>${code}</code></pre>${caption}</figure>`;
    }
    case "details":
      return `<details${block.open ? " open" : ""}><summary>${escapeHtml(block.summary)}</summary><div class="details-body">${renderBlocks(block.blocks, path, sectionHeadingLevel)}</div></details>`;
  }
}

const baseCss = `
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 15.5px;
  line-height: 1.68;
  transition: background-color .2s ease, color .2s ease;
}
a { color: var(--text); text-decoration-color: var(--accent-readable); text-decoration-thickness: .1em; text-underline-offset: .18em; }
a:hover { text-decoration-color: currentColor; text-decoration-thickness: .14em; }
a:focus-visible, summary:focus-visible { outline: 3px solid var(--text); outline-offset: 3px; border-radius: 3px; }
.shell { width: min(760px, calc(100% - 40px)); margin: 0 auto; padding: 64px 0 96px; }
.mode-toggle { position: fixed; z-index: 30; top: 16px; right: 16px; display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); box-shadow: none; cursor: pointer; transition: background-color .2s ease, border-color .2s ease, color .2s ease, transform .2s ease; }
.mode-toggle:hover { transform: translateY(-1px); }
.mode-toggle:focus-visible { outline: 3px solid var(--text); outline-offset: 3px; }
.mode-icon { width: 18px; height: 18px; }
.mode-icon-dark { display: none; }
:root[data-mode="dark"] .mode-icon-light { display: none; }
:root[data-mode="dark"] .mode-icon-dark { display: block; }
.hero { max-width: none; margin: 0 0 42px; padding: 0 0 32px; border-bottom: 1px solid var(--rule); }
h1, h2, h3, h4, h5, h6 { line-height: 1.18; letter-spacing: -.025em; text-wrap: balance; }
.hero h1 { max-width: 18ch; margin: 0; font-size: clamp(2.2rem, 5vw, 3.2rem); letter-spacing: -.035em; }
main > .section > .section-title { margin: 0 0 18px; font-size: clamp(1.45rem, 3vw, 1.85rem); }
.section .section > .section-title { margin-top: 0; font-size: 1.12rem; }
.summary { max-width: 64ch; margin: 16px 0 0; color: var(--secondary-text); font-size: 1.02rem; }
main { min-width: 0; }
main > .section { margin: 0; padding: 34px 0 40px; scroll-margin-top: 28px; border: 0; border-top: 1px solid var(--rule); border-radius: 0; background: transparent; box-shadow: none; }
main > .section:first-child { border-top: 0; }
.section .section { margin: 28px 0 0; padding: 0 0 0 18px; scroll-margin-top: 28px; border: 0; border-left: 2px solid var(--rule); border-radius: 0; background: transparent; box-shadow: none; }
p { max-width: 75ch; }
code:not(pre code) { padding: .12em .36em; background: var(--accent-soft); border-radius: max(3px, calc(var(--radius) / 3)); font-family: var(--font-mono); font-size: .9em; }
.step-meta div { padding: 14px 16px; background: color-mix(in srgb, var(--surface-raised) 36%, var(--surface)); border: 1px solid var(--rule); border-radius: max(4px, calc(var(--radius) * .7)); }
.fact-label { display: block; color: var(--secondary-text); font-size: .73rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.fact-value { display: block; margin-top: 3px; font-weight: 700; }
ul, ol { padding-left: 1.4rem; }
li + li { margin-top: .55rem; }
.callout { margin: 22px 0; padding: 18px 20px; border: 1px solid var(--rule); border-left-width: 3px; border-radius: 4px; }
.callout p { margin: 4px 0 0; }
.callout-title { display: block; }
.callout-info { border-left-color: var(--info); background: var(--info-soft); }
.callout-warning { border-left-color: var(--warning); background: var(--warning-soft); }
.callout-success { border-left-color: var(--success); background: var(--success-soft); }
.steps { margin: 24px 0; padding: 0; list-style: none; counter-reset: none; }
.steps > li { display: grid; grid-template-columns: 38px 1fr; gap: 14px; margin: 0; padding: 0 0 28px; position: relative; }
.steps > li:not(:last-child)::before { content: ""; position: absolute; left: 18px; top: 38px; bottom: 0; width: 1px; background: var(--rule); }
.step-number { z-index: 1; display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid var(--info-border); border-radius: 50%; background: var(--info-soft); color: var(--info-text); font-weight: 750; }
.step-title { display: block; margin: 5px 0 4px; line-height: 1.18; }
.steps p { margin: 0; color: var(--secondary-text); }
.step-meta { display: flex; flex-wrap: wrap; gap: 7px; margin: 12px 0 0; }
.step-meta div { padding: 6px 9px; }
.badge { display: inline-flex; align-items: center; padding: .2em .55em; border: 1px solid var(--rule); border-radius: 999px; font-size: .72em; font-weight: 720; letter-spacing: .025em; text-transform: uppercase; vertical-align: .12em; }
.status-done, .severity-low { color: var(--success-text); border-color: var(--success-border); background: var(--success-soft); }
.status-active, .severity-medium { color: var(--warning-text); border-color: var(--warning-border); background: var(--warning-soft); }
.status-blocked, .severity-critical { color: var(--danger-text); border-color: var(--danger-border); background: var(--danger-soft); }
.status-planned, .severity-high { color: var(--info-text); border-color: var(--info-border); background: var(--info-soft); }
.table-wrap { max-width: 100%; margin: 24px 0; overflow-x: auto; border: 1px solid var(--rule); border-radius: 4px; box-shadow: none; }
table { width: 100%; border-collapse: collapse; background: transparent; font-size: .92rem; }
thead { background: color-mix(in srgb, var(--surface-raised) 48%, var(--surface)); }
caption { padding: 14px 16px; text-align: left; font-weight: 750; }
th, td { padding: 12px 14px; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { color: var(--secondary-text); font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; }
tbody tr:last-child td { border-bottom: 0; }
.align-center { text-align: center; }
.align-right { text-align: right; }
.code-block { margin: 24px 0; overflow: hidden; border: 1px solid var(--code-border); border-radius: 4px; background: var(--code-bg); color: var(--code-text); box-shadow: none; }
.code-toolbar { min-height: 40px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 10px 6px 14px; border-bottom: 1px solid var(--code-border); }
.code-label { overflow: hidden; font-family: var(--font-mono); font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
.copy-code { flex: 0 0 auto; margin-left: auto; padding: 5px 9px; border: 1px solid var(--code-border); border-radius: 6px; background: transparent; color: inherit; font: 700 .72rem/1 var(--font-sans); cursor: pointer; }
.copy-code:hover { background: var(--code-highlight); }
.copy-code:focus-visible { outline: 2px solid var(--code-text); outline-offset: 2px; }
pre { margin: 0; padding: 10px 0; overflow-x: auto; font: .84rem/.75rem var(--font-mono); }
.code-line { display: grid; grid-template-columns: 3.2rem max-content; min-width: 100%; padding: 0 18px 0 0; }
.code-line.highlighted { background: var(--code-highlight); box-shadow: inset 3px 0 var(--accent); }
.line-number { padding-right: 14px; color: var(--code-muted); text-align: right; user-select: none; }
figcaption { padding: 9px 14px; border-top: 1px solid var(--code-border); color: var(--code-muted); font-size: .78rem; }
details { margin: 20px 0; border: 1px solid var(--border); border-radius: 4px; background: var(--surface-raised); box-shadow: none; }
summary { padding: 15px 18px; cursor: pointer; font-weight: 750; }
.details-body { padding: 0 18px 18px; }
.toc { position: fixed; z-index: 20; top: clamp(100px, 22vh, 220px); right: 0; width: min(280px, 86vw); transform: translateX(calc(100% - 38px)); transition: transform .42s cubic-bezier(.22, 1, .36, 1); }
.toc:hover, .toc:focus-within { transform: translateX(0); }
.toc-dots { position: absolute; top: 12px; left: 0; display: grid; place-items: center; width: 38px; height: 44px; color: var(--sidebar-muted); font-weight: 900; letter-spacing: 2px; transform: rotate(90deg); transform-origin: center; transition: opacity .24s ease, translate .42s cubic-bezier(.22, 1, .36, 1); }
.toc:hover .toc-dots, .toc:focus-within .toc-dots { opacity: 0; translate: 12px 0; }
.toc-panel { margin-left: 38px; padding: 18px 20px 20px; border: 1px solid var(--sidebar-border); border-right: 0; border-radius: var(--radius) 0 0 var(--radius); background: color-mix(in srgb, var(--sidebar) 94%, transparent); color: var(--sidebar-text); box-shadow: var(--shadow); backdrop-filter: blur(14px); }
.toc-title { display: block; margin-bottom: 10px; color: var(--sidebar-text); font-size: .72rem; letter-spacing: .09em; text-transform: uppercase; }
.toc a { display: block; padding: 6px 10px; overflow: hidden; border-radius: var(--radius); color: var(--sidebar-muted); font-size: .84rem; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
.toc a:hover, .toc a:focus-visible { color: var(--sidebar-accent-text); background: var(--sidebar-accent); }
.toc-depth-1 { padding-left: 22px !important; }
.toc-depth-2 { padding-left: 34px !important; }
.toc-depth-3 { padding-left: 46px !important; }
.toc-depth-4, .toc-depth-5 { padding-left: 58px !important; }
@media (max-width: 700px) {
  .shell { width: min(100% - 28px, 760px); padding-top: 56px; }
  .toc { display: none !important; }
}
@media print {
  :root { --bg: #fff; --surface: #fff; --surface-raised: #fff; --text: #111; --muted: #555; --border: #ccc; --shadow: none; }
  .shell { width: 100%; padding: 0; }
  .toc, .mode-toggle { display: none; }
  .section, details { break-inside: avoid; }
}`;

const initialModeScript = `<script>
(() => {
  const devicePreference = window.matchMedia("(prefers-color-scheme: dark)");
  let mode = devicePreference.matches ? "dark" : "light";
  try {
    const saved = localStorage.getItem("heple-mode");
    mode = saved === "light" || saved === "dark"
      ? saved
      : mode;
  } catch {}
  document.documentElement.dataset.mode = mode;
})();
</script>`;

const interactionScript = `<script>
(() => {
  const modeToggle = document.querySelector("[data-mode-toggle]");
  const devicePreference = window.matchMedia("(prefers-color-scheme: dark)");
  let followsDevice = true;
  try {
    const saved = localStorage.getItem("heple-mode");
    followsDevice = saved !== "light" && saved !== "dark";
  } catch {}

  function updateModeControl() {
    if (!(modeToggle instanceof HTMLButtonElement)) return;
    const dark = document.documentElement.dataset.mode === "dark";
    const next = dark ? "light" : "dark";
    modeToggle.setAttribute("aria-label", "Switch to " + next + " mode");
    modeToggle.title = "Switch to " + next + " mode";
  }

  modeToggle?.addEventListener("click", () => {
    const next = document.documentElement.dataset.mode === "dark" ? "light" : "dark";
    document.documentElement.dataset.mode = next;
    followsDevice = false;
    try { localStorage.setItem("heple-mode", next); } catch {}
    updateModeControl();
  });
  devicePreference.addEventListener("change", (event) => {
    if (!followsDevice) return;
    document.documentElement.dataset.mode = event.matches ? "dark" : "light";
    updateModeControl();
  });
  updateModeControl();

  function fragmentTarget(hash) {
    if (!hash || hash === "#") return null;
    let id = hash.slice(1);
    try { id = decodeURIComponent(id); } catch {}
    return document.getElementById(id);
  }

  function revealFragment(hash) {
    const target = fragmentTarget(hash);
    if (!target) return null;
    let ancestor = target.parentElement;
    while (ancestor) {
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    return target;
  }

  let clickedFragmentHash = "";
  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element
      ? event.target.closest('a[href^="#"]')
      : null;
    if (!(link instanceof HTMLAnchorElement)) return;
    if (
      event.defaultPrevented
      || (
        event instanceof MouseEvent
        && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      )
    ) return;
    clickedFragmentHash = link.hash === window.location.hash ? "" : link.hash;
    revealFragment(link.hash);
  });
  window.addEventListener("hashchange", () => {
    const clicked = clickedFragmentHash === window.location.hash;
    clickedFragmentHash = "";
    const target = revealFragment(window.location.hash);
    if (target && !clicked) {
      window.requestAnimationFrame(() => target.scrollIntoView());
    }
  });
  const initialTarget = revealFragment(window.location.hash);
  if (initialTarget) {
    window.requestAnimationFrame(() => initialTarget.scrollIntoView());
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy failed");
  }

  document.addEventListener("click", async (event) => {
    const target = event.target instanceof Element
      ? event.target.closest("[data-copy-code]")
      : null;
    if (!(target instanceof HTMLButtonElement)) return;

    const figure = target.closest(".code-block");
    if (!figure) return;
    const code = Array.from(figure.querySelectorAll(".code-text"))
      .map((line) => line.textContent || "")
      .join("\\n");

    try {
      await copyText(code);
      target.textContent = "Copied";
    } catch {
      target.textContent = "Copy failed";
    }
    window.setTimeout(() => { target.textContent = "Copy"; }, 1600);
  });
})();
</script>`;

export function renderPlan(plan: PlanDocument, options: RenderOptions): string {
  const blocks = plan.blocks ?? [];
  const sectionHeadingLevel = plan.title ? 2 : 1;
  const toc = (options.navigation ?? true) ? collectToc(blocks) : [];
  const navigation = toc.length
    ? `<nav class="toc" aria-label="Plan sections"><span class="toc-dots" aria-hidden="true">•••</span><div class="toc-panel"><strong class="toc-title">On this page</strong>${toc
        .map(
          (item) =>
            `<a class="toc-depth-${Math.min(item.depth, 5)}" href="#${item.id}" data-fragment-link>${escapeHtml(item.title)}</a>`,
        )
        .join("")}</div></nav>`
    : "";
  const hero = plan.title || plan.summary
    ? `<header class="hero">${plan.title ? `<h1>${escapeHtml(plan.title)}</h1>` : ""}${plan.summary ? `<p class="summary">${escapeHtml(plan.summary)}</p>` : ""}</header>`
    : "";
  const main = blocks.length ? `<main>${renderBlocks(blocks, [], sectionHeadingLevel)}</main>` : "";
  const modeToggle = `<button class="mode-toggle" type="button" data-mode-toggle aria-label="Switch color mode"><svg class="mode-icon mode-icon-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg><svg class="mode-icon mode-icon-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></button>`;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(plan.language ?? "en")}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(plan.title ?? "heple plan")}</title>
  ${initialModeScript}
  <style>${themeCss(options.theme)}${baseCss}</style>
</head>
<body>
  ${modeToggle}
  <div class="shell">
    ${hero}
    ${main}
  </div>
  ${navigation}
  ${interactionScript}
</body>
</html>
`;
}
