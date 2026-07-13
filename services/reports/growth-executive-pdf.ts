import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { GuardedSegmentation, WeeklyManagementDecision } from "@/domain/revory/growth-intelligence";

type SnapshotRow = {
  approvedChangeReviewCents: number | null;
  calculatedBillingGapCents: number | null;
  createdAt: Date;
  marginAtRiskCents: number | null;
  quoteEstimatedValueCents: number;
};

type PdfInput = {
  decision: WeeklyManagementDecision;
  generatedAt: Date;
  segmentation: GuardedSegmentation;
  snapshots: SnapshotRow[];
  workspaceName: string;
};

const pageWidth = 612;
const pageHeight = 792;
const margin = 48;
const background = rgb(20 / 255, 21 / 255, 22 / 255);
const surface = rgb(30 / 255, 33 / 255, 33 / 255);
const accent = rgb(67 / 255, 179 / 255, 155 / 255);
const foreground = rgb(242 / 255, 245 / 255, 244 / 255);
const muted = rgb(160 / 255, 172 / 255, 169 / 255);

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

function money(cents: number | null, currency = "USD") {
  if (cents === null) return "Suppressed";
  return new Intl.NumberFormat("en-US", { currency, maximumFractionDigits: 0, style: "currency" }).format(cents / 100);
}

export async function generateGrowthExecutivePdf(input: PdfInput) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = document.addPage([pageWidth, pageHeight]);
  page.drawRectangle({ color: background, height: pageHeight, width: pageWidth, x: 0, y: 0 });
  let y = pageHeight - margin;

  const addPage = () => {
    page = document.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ color: background, height: pageHeight, width: pageWidth, x: 0, y: 0 });
    y = pageHeight - margin;
    return page;
  };
  const ensure = (height: number) => {
    if (y - height < margin) addPage();
  };
  const text = (value: string, options?: { color?: ReturnType<typeof rgb>; font?: PDFFont; size?: number; gap?: number }) => {
    const font = options?.font ?? regular;
    const size = options?.size ?? 10;
    const lines = wrap(value, font, size, pageWidth - margin * 2);
    ensure(lines.length * (size + 4));
    for (const line of lines) {
      page.drawText(line, { color: options?.color ?? foreground, font, size, x: margin, y });
      y -= size + 4;
    }
    y -= options?.gap ?? 4;
  };
  const panel = (label: string, value: string, note: string, x: number, width: number) => {
    page.drawRectangle({ borderColor: rgb(50 / 255, 60 / 255, 58 / 255), borderWidth: 1, color: surface, height: 92, width, x, y: y - 92 });
    page.drawText(ascii(label).toUpperCase(), { color: accent, font: bold, size: 8, x: x + 14, y: y - 21 });
    page.drawText(ascii(value), { color: foreground, font: bold, size: 19, x: x + 14, y: y - 49 });
    for (const [index, line] of wrap(note, regular, 8, width - 28).slice(0, 2).entries()) {
      page.drawText(line, { color: muted, font: regular, size: 8, x: x + 14, y: y - 67 - index * 11 });
    }
  };

  page.drawText("REVORY", { color: accent, font: bold, size: 10, x: margin, y });
  page.drawText(ascii(input.workspaceName), { color: muted, font: regular, size: 9, x: pageWidth - margin - Math.min(220, regular.widthOfTextAtSize(ascii(input.workspaceName), 9)), y });
  y -= 34;
  text("Growth executive intelligence", { font: bold, size: 28, gap: 7 });
  text(`Generated ${input.generatedAt.toISOString().slice(0, 10)} from workspace-scoped imported evidence. Values remain separated by basis.`, { color: muted, size: 9, gap: 18 });
  text("WEEKLY MANAGEMENT DECISION", { color: accent, font: bold, size: 8, gap: 6 });
  text(input.decision.headline, { font: bold, size: 18, gap: 5 });
  text(input.decision.rationale, { color: muted, size: 10, gap: 18 });

  const latest = input.snapshots.at(-1);
  ensure(110);
  const panelWidth = (pageWidth - margin * 2 - 12) / 2;
  panel("Estimated quote opportunity", money(latest?.quoteEstimatedValueCents ?? 0), "Modeled opportunity, not guaranteed revenue.", margin, panelWidth);
  panel("Calculated billing gap", money(latest?.calculatedBillingGapCents ?? null), "Deterministic additive reconciliation only.", margin + panelWidth + 12, panelWidth);
  y -= 112;

  text("12-MONTH MOVEMENT", { color: accent, font: bold, size: 8, gap: 8 });
  if (!input.snapshots.length) text("No committed Growth snapshot exists yet.", { color: muted, size: 10, gap: 14 });
  for (const snapshot of input.snapshots.slice(-12)) {
    ensure(34);
    const date = snapshot.createdAt.toISOString().slice(0, 10);
    page.drawText(date, { color: foreground, font: bold, size: 9, x: margin, y });
    page.drawText(`Quote est. ${money(snapshot.quoteEstimatedValueCents)} | Billing gap ${money(snapshot.calculatedBillingGapCents)}`, { color: muted, font: regular, size: 8, x: margin + 82, y });
    y -= 17;
    page.drawText(`Approved CO review ${money(snapshot.approvedChangeReviewCents)} | Margin basis ${money(snapshot.marginAtRiskCents)}`, { color: muted, font: regular, size: 8, x: margin + 82, y });
    y -= 22;
  }

  text("GUARDED SEGMENT REVIEW", { color: accent, font: bold, size: 8, gap: 8 });
  const eligible = input.segmentation.segments.filter((segment) => segment.eligibleForRanking).slice(0, 8);
  if (!eligible.length) text(`No ranking shown. Cohorts require at least ${input.segmentation.minimumRecords} comparable records and findings on ${input.segmentation.minimumFindingRecords} records.`, { color: muted, size: 10 });
  for (const segment of eligible) {
    ensure(38);
    text(`${segment.dimension.replace("_", " ")} / ${segment.label}`, { font: bold, size: 10, gap: 1 });
    text(`${segment.layer.replace("_", " ")} | ${segment.findingRecordCount} finding records of ${segment.recordCount} | ${money(segment.financialValueCents, segment.currency ?? "USD")}`, { color: muted, size: 8, gap: 8 });
  }

  ensure(50);
  y -= 10;
  page.drawLine({ color: rgb(50 / 255, 60 / 255, 58 / 255), end: { x: pageWidth - margin, y }, start: { x: margin, y }, thickness: 1 });
  y -= 18;
  text("REVORY findings support review decisions. They do not certify accounting loss, guarantee recovery, or judge rep/source performance from thin cohorts.", { color: muted, size: 8 });

  const pages = document.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawText(`${index + 1} / ${pages.length}`, { color: muted, font: regular, size: 8, x: pageWidth - margin - 22, y: 24 });
  });
  return document.save();
}
