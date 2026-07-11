import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
const artifactsDirectory = path.join(process.cwd(), "artifacts");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function inspectPage(page) {
  return page.evaluate(() => ({
    ctaHref: Array.from(document.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Start with REVORY"),
    )?.getAttribute("href"),
    downloadHref: document.querySelector("a[download]")?.getAttribute("href"),
    fileInputs: document.querySelectorAll('input[type="file"]').length,
    forms: document.querySelectorAll("form").length,
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    importActions: Array.from(document.querySelectorAll("a,button")).filter(
      (element) => element.textContent?.trim().toLowerCase() === "import",
    ).length,
    mutationButtons: document.querySelectorAll("button").length,
    protectedAppLinks: Array.from(document.querySelectorAll("a")).filter((element) =>
      element.getAttribute("href")?.startsWith("/app"),
    ).length,
    sampleDisclosureVisible: document.body.innerText
      .toLowerCase()
      .includes("sample data — not a live clinic account"),
    title: document.title,
  }));
}

async function main() {
  await fs.mkdir(artifactsDirectory, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const desktopPage = await browser.newPage({
      viewport: { height: 1000, width: 1440 },
    });
    const desktopErrors = [];

    desktopPage.on("console", (message) => {
      if (message.type() === "error") {
        desktopErrors.push(message.text());
      }
    });
    desktopPage.on("pageerror", (error) => desktopErrors.push(error.message));

    const desktopResponse = await desktopPage.goto(`${appUrl}/demo`, {
      waitUntil: "networkidle",
    });
    const desktopRead = await inspectPage(desktopPage);

    await desktopPage.screenshot({
      fullPage: true,
      path: path.join(artifactsDirectory, "revory-demo-desktop.png"),
    });

    assert(desktopResponse?.status() === 200, "/demo should return HTTP 200.");
    assert(desktopRead.fileInputs === 0, "/demo must not expose file input.");
    assert(desktopRead.forms === 0, "/demo must not expose a form.");
    assert(desktopRead.importActions === 0, "/demo must not expose Import action.");
    assert(
      desktopRead.mutationButtons === 0,
      "/demo must not expose action buttons that suggest live mutations.",
    );
    assert(
      desktopRead.protectedAppLinks === 0,
      "/demo must not link visitors into protected /app routes.",
    );
    assert(
      desktopRead.downloadHref === "/demo/revory-demo-appointments.csv",
      "Sample CSV download should point to the public fixture.",
    );
    assert(desktopRead.ctaHref === "/start", "Paid CTA should point to /start.");
    assert(
      desktopRead.sampleDisclosureVisible,
      "Sample-data disclosure should be visible.",
    );
    assert(
      !desktopRead.hasHorizontalOverflow,
      "Desktop demo should not overflow horizontally.",
    );
    assert(desktopErrors.length === 0, `Desktop console errors: ${desktopErrors.join(" | ")}`);

    const csvResponse = await desktopPage.request.get(
      `${appUrl}/demo/revory-demo-appointments.csv`,
    );
    const csvText = await csvResponse.text();

    assert(csvResponse.status() === 200, "Sample CSV should return HTTP 200.");
    assert(
      csvText.trim().split(/\r?\n/).length - 1 === 14,
      "Sample CSV should contain 14 records.",
    );

    const paidFlowPage = await browser.newPage();

    await paidFlowPage.goto(`${appUrl}/demo`, { waitUntil: "networkidle" });
    await paidFlowPage.getByRole("link", { name: "Start with REVORY" }).click();
    await paidFlowPage.waitForURL(/\/sign-up/);

    const paidFlowUrl = new URL(paidFlowPage.url());

    assert(
      paidFlowUrl.pathname.startsWith("/sign-up"),
      "Unauthenticated paid CTA should enter the sign-up flow.",
    );
    assert(
      paidFlowUrl.searchParams.get("redirect_url") === "/start",
      "Sign-up flow should return to the paid /start route.",
    );

    await paidFlowPage.close();

    const mobilePage = await browser.newPage({
      viewport: { height: 844, width: 390 },
    });
    const mobileErrors = [];

    mobilePage.on("console", (message) => {
      if (message.type() === "error") {
        mobileErrors.push(message.text());
      }
    });
    mobilePage.on("pageerror", (error) => mobileErrors.push(error.message));

    const mobileResponse = await mobilePage.goto(`${appUrl}/demo`, {
      waitUntil: "networkidle",
    });
    const mobileRead = await inspectPage(mobilePage);

    await mobilePage.screenshot({
      fullPage: true,
      path: path.join(artifactsDirectory, "revory-demo-mobile.png"),
    });

    assert(mobileResponse?.status() === 200, "Mobile /demo should return HTTP 200.");
    assert(
      !mobileRead.hasHorizontalOverflow,
      "Mobile demo should not overflow horizontally.",
    );
    assert(mobileErrors.length === 0, `Mobile console errors: ${mobileErrors.join(" | ")}`);

    console.log("[public-demo-browser] Desktop and mobile checks passed.");
    console.log(`[public-demo-browser] Title: ${desktopRead.title}`);
    console.log("[public-demo-browser] CSV: HTTP 200 with 14 records.");
    console.log(`[public-demo-browser] Screenshots: ${artifactsDirectory}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
