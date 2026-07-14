import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { getQuoteRecoveryRead } from "@/services/quote-recovery/read-model";

type QuoteRecoveryRead = Awaited<ReturnType<typeof getQuoteRecoveryRead>>;

type PdfInput = {
  generatedAt: Date;
  read: QuoteRecoveryRead;
  workspaceName: string;
};

const pageWidth = 612;
const pageHeight = 792;
const margin = 46;
const background = rgb(20 / 255, 21 / 255, 22 / 255);
const surface = rgb(29 / 255, 32 / 255, 32 / 255);
const surfaceStrong = rgb(37 / 255, 39 / 255, 41 / 255);
const accent = rgb(67 / 255, 179 / 255, 155 / 255);
const warning = rgb(217 / 255, 173 / 255, 87 / 255);
const danger = rgb(223 / 255, 108 / 255, 114 / 255);
const foreground = rgb(242 / 255, 245 / 255, 244 / 255);
const muted = rgb(159 / 255, 171 / 255, 168 / 255);
const border = rgb(49 / 255, 57 / 255, 55 / 255);

function ascii(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = ascii(text).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function money(cents: number | null) {
  if (cents === null) return "Operational";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function addBackground(page: PDFPage) {
  page.drawRectangle({ color: background, height: pageHeight, width: pageWidth, x: 0, y: 0 });
  page.drawCircle({ color: rgb(25 / 255, 71 / 255, 62 / 255), opacity: 0.24, size: 210, x: 475, y: 720 });
}

export async function generateQuoteRecoveryExecutivePdf(input: PdfInput) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await readFile(path.join(process.cwd(), "public", "brand", "revory-logo-43b39b-transparent.png"));
  const logo = await document.embedPng(logoBytes);

  const cover = document.addPage([pageWidth, pageHeight]);
  addBackground(cover);
  const logoSize = 54;
  cover.drawImage(logo, { height: logoSize, width: logoSize, x: margin, y: pageHeight - margin - logoSize });
  cover.drawText("REVORY", { color: foreground, font: bold, size: 13, x: margin + 67, y: pageHeight - margin - 32 });
  cover.drawText("EXECUTIVE QUOTE RECOVERY READ", { color: accent, font: bold, size: 9, x: margin, y: 630 });
  for (const [index, line] of wrap("See what may still be recoverable - and why.", bold, 34, 470).entries()) {
    cover.drawText(line, { color: foreground, font: bold, size: 34, x: margin, y: 580 - index * 39 });
  }
  cover.drawText(ascii(input.workspaceName), { color: muted, font: regular, size: 12, x: margin, y: 470 });
  cover.drawText(`Generated ${input.generatedAt.toISOString().slice(0, 10)} from committed workspace evidence.`, { color: muted, font: regular, size: 9, x: margin, y: 450 });

  const panelWidth = (pageWidth - margin * 2 - 12) / 2;
  const drawMetric = (x: number, y: number, label: string, value: string, note: string) => {
    cover.drawRectangle({ borderColor: border, borderWidth: 1, color: surface, height: 104, width: panelWidth, x, y });
    cover.drawText(ascii(label).toUpperCase(), { color: accent, font: bold, size: 8, x: x + 15, y: y + 78 });
    cover.drawText(ascii(value), { color: foreground, font: bold, size: 23, x: x + 15, y: y + 46 });
    for (const [index, line] of wrap(note, regular, 8, panelWidth - 30).slice(0, 2).entries()) {
      cover.drawText(line, { color: muted, font: regular, size: 8, x: x + 15, y: y + 25 - index * 11 });
    }
  };
  drawMetric(margin, 310, "Estimated recoverable", money(input.read.summary.estimatedValueCents), "Modeled opportunity, not guaranteed revenue.");
  drawMetric(margin + panelWidth + 12, 310, "Active findings", String(input.read.summary.activeCount), "Open and acknowledged findings.");
  drawMetric(margin, 194, "Financial findings", String(input.read.summary.financialCount), "Estimate value is available as an estimated basis.");
  drawMetric(margin + panelWidth + 12, 194, "Operational risks", String(input.read.summary.operationalCount), "Never counted as confirmed financial loss.");
  cover.drawLine({ color: border, end: { x: pageWidth - margin, y: 118 }, start: { x: margin, y: 118 }, thickness: 1 });
  for (const [index, line] of wrap("REVORY prioritizes review candidates from imported evidence. It does not guarantee recovery or certify accounting loss.", regular, 9, pageWidth - margin * 2).entries()) {
    cover.drawText(line, { color: muted, font: regular, size: 9, x: margin, y: 94 - index * 13 });
  }

  let page = document.addPage([pageWidth, pageHeight]);
  addBackground(page);
  let y = pageHeight - margin;
  const addPage = () => {
    page = document.addPage([pageWidth, pageHeight]);
    addBackground(page);
    y = pageHeight - margin;
  };
  const ensure = (height: number) => {
    if (y - height < 52) addPage();
  };
  const text = (value: string, options?: { color?: ReturnType<typeof rgb>; font?: PDFFont; size?: number; gap?: number; maxWidth?: number }) => {
    const font = options?.font ?? regular;
    const size = options?.size ?? 10;
    const lines = wrap(value, font, size, options?.maxWidth ?? pageWidth - margin * 2);
    ensure(lines.length * (size + 4));
    for (const line of lines) {
      page.drawText(line, { color: options?.color ?? foreground, font, size, x: margin, y });
      y -= size + 4;
    }
    y -= options?.gap ?? 4;
  };

  text("PRIORITY REVIEW", { color: accent, font: bold, size: 8, gap: 8 });
  text("Top opportunities", { font: bold, size: 24, gap: 16 });
  for (const [index, finding] of input.read.findings.slice(0, 12).entries()) {
    const reasonLines = wrap(finding.reason, regular, 9, pageWidth - margin * 2 - 28).slice(0, 2);
    const panelHeight = 82 + reasonLines.length * 10;
    ensure(panelHeight + 12);
    page.drawRectangle({ borderColor: border, borderWidth: 1, color: surface, height: panelHeight, width: pageWidth - margin * 2, x: margin, y: y - panelHeight });
    page.drawText(`${String(index + 1).padStart(2, "0")}  ${ascii(finding.findingType.replaceAll("_", " "))}`, { color: accent, font: bold, size: 8, x: margin + 14, y: y - 20 });
    page.drawText(`Estimate ${ascii(finding.estimateExternalId)}`, { color: foreground, font: bold, size: 12, x: margin + 14, y: y - 40 });
    const value = money(finding.valueCents);
    page.drawText(value, { color: foreground, font: bold, size: 12, x: pageWidth - margin - 14 - bold.widthOfTextAtSize(value, 12), y: y - 40 });
    reasonLines.forEach((line, lineIndex) => page.drawText(line, { color: muted, font: regular, size: 9, x: margin + 14, y: y - 60 - lineIndex * 11 }));
    y -= panelHeight + 12;
  }

  ensure(200);
  text("DATA QUALITY", { color: accent, font: bold, size: 8, gap: 8 });
  text("Evidence coverage", { font: bold, size: 22, gap: 12 });
  const eligible = Object.values(input.read.dataQuality.eligibility).filter((item) => item.eligible).length;
  const metrics = [
    ["Canonical records", input.read.dataQuality.recordCount, input.read.dataQuality.recordCount ? accent : danger],
    ["Explicit links", input.read.dataQuality.linkCoverage.linked, input.read.dataQuality.linkCoverage.linked ? accent : warning],
    ["Unmatched links", input.read.dataQuality.linkCoverage.unmatched, input.read.dataQuality.linkCoverage.unmatched ? warning : accent],
    ["Eligible rules", eligible, eligible ? accent : danger],
  ] as const;
  metrics.forEach(([label, value, color], index) => {
    const rowY = y - index * 34;
    page.drawRectangle({ borderColor: border, borderWidth: 1, color: surfaceStrong, height: 27, width: pageWidth - margin * 2, x: margin, y: rowY - 23 });
    page.drawCircle({ color, size: 4, x: margin + 14, y: rowY - 10 });
    page.drawText(label, { color: muted, font: regular, size: 9, x: margin + 27, y: rowY - 14 });
    page.drawText(String(value), { color: foreground, font: bold, size: 10, x: pageWidth - margin - 25, y: rowY - 14 });
  });
  y -= metrics.length * 34 + 18;
  text(
    input.read.dataQuality.issues.length
      ? `${input.read.dataQuality.issues.length} import issue(s) remain visible for review.`
      : input.read.dataQuality.linkCoverage.unmatched
        ? "Unmatched records remain visible and suppress unsupported links."
        : "No blocking issue exists in the latest committed batch.",
    { color: input.read.dataQuality.issues.length ? danger : input.read.dataQuality.linkCoverage.unmatched ? warning : accent, size: 9 },
  );

  const pages = document.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawText(`REVORY  |  ${index + 1} / ${pages.length}`, { color: muted, font: regular, size: 8, x: margin, y: 23 });
  });
  return document.save();
}
