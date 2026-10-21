import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const base = "http://localhost:3000";

try {
  for (const [route, path] of [["landing", "/"], ["demo", "/demo"], ["start", "/start"]]) {
    for (const [name, width, height] of [
      ["desktop", 1440, 900],
      ["mobile", 390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
      const file = `docs/qa/ai-saas-sprint0-${route}-${name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      const result = await page.evaluate(() => ({
        title: document.title,
        textLength: document.body.innerText.trim().length,
        overlay: Boolean(document.querySelector("[data-nextjs-dialog]")),
        logoSources: [...document.images].map((image) => image.getAttribute("src")).filter((src) => src?.includes("revory")),
      }));
      console.log(JSON.stringify({ route, viewport: name, status: response?.status(), file, ...result, errors }));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
