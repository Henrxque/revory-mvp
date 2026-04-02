import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), '.tmp', 'final-flow-smoke-2026-04-01');
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto('http://localhost:3000/app', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, 'app-redirect-signin.png'), fullPage: true });
  console.log(JSON.stringify({ url: page.url(), title: await page.title() }, null, 2));
} finally {
  await browser.close();
}
