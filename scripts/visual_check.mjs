import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1");
const outputDir = `${root}/.tmp/playwright`;
await mkdir(outputDir, { recursive: true });

const server = await createServer({
  root,
  logLevel: "error",
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
});
await server.listen();

const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "desktop-1024", width: 1024, height: 900 },
  { name: "tablet-768", width: 768, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375-reduced", width: 375, height: 812, reducedMotion: "reduce" },
  { name: "mobile-landscape", width: 844, height: 390 },
];
const reports = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: viewport.reducedMotion,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
    await page.waitForSelector(".scene-wrap canvas", { timeout: 30_000 });
    await page.waitForFunction(() => document.querySelector(".workspace")?.getAttribute("aria-busy") === "false");

    const layout = await page.evaluate(() => {
      const workspace = document.querySelector(".workspace")?.getBoundingClientRect();
      const scene = document.querySelector(".scene-wrap")?.getBoundingClientRect();
      return {
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        workspaceTop: Math.round(workspace?.top || 0),
        sceneTop: Math.round(scene?.top || 0),
        sceneHeight: Math.round(scene?.height || 0),
      };
    });

    await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });

    if (viewport.name === "desktop-1440") {
      const search = page.getByRole("combobox", { name: /搜索岗位|Search jobs/ });
      await search.fill("后端");
      await search.press("ArrowDown");
      await search.press("Enter");
      await page.getByRole("button", { name: "技能", exact: true }).click();
      await page.getByRole("button", { name: /加点 DAG|Skill DAG/ }).click();
      await page.waitForSelector(".skill-dag-shell");
      await page.getByRole("button", { name: "EN", exact: true }).click();
      await page.waitForFunction(() => document.documentElement.lang === "en");
    }

    reports.push({
      viewport: viewport.name,
      ...layout,
      horizontalOverflow: Math.max(layout.documentWidth, layout.bodyWidth) > layout.viewportWidth + 1,
      workspaceVisibleInitially: layout.workspaceTop < viewport.height,
      consoleErrors,
    });
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

console.log(JSON.stringify(reports, null, 2));
