import { readFile } from "node:fs/promises";
import path from "node:path";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";

const LANDING_REFERENCE_PATH = path.join(
  process.cwd(),
  "src",
  "content",
  "revory-landing-reference.html",
);

const FOOTER_YEAR = 2026;

function extractBetween(content: string, startMarker: string, endMarker: string) {
  const startIndex = content.indexOf(startMarker);

  if (startIndex < 0) {
    return "";
  }

  const contentStart = startIndex + startMarker.length;
  const endIndex = content.indexOf(endMarker, contentStart);

  if (endIndex < 0) {
    return content.slice(contentStart);
  }

  return content.slice(contentStart, endIndex);
}

function extractLandingMarkup(content: string) {
  const startIndex = content.indexOf("<nav");
  const footerIndex = content.indexOf("<footer");

  if (startIndex < 0) {
    return "";
  }

  if (footerIndex < 0) {
    return content.slice(startIndex);
  }

  return content.slice(startIndex, footerIndex);
}

function normalizeReferenceText(content: string) {
  const replacements: Array<[string, string]> = [
    ["â€”", "\u2014"],
    ["â€“", "\u2013"],
    ["â€˜", "\u2018"],
    ["â€™", "\u2019"],
    ["â€œ", "\u201c"],
    ["â€\u009d", "\u201d"],
    ["â€¦", "\u2026"],
    ["â†’", "\u2192"],
    ["âœ“", "\u2713"],
    ["â˜…", "\u2605"],
    ["Â·", "\u00b7"],
    ["Â©", "\u00a9"],
    ["Â", ""],
  ];

  return replacements.reduce(
    (normalizedContent, [from, to]) => normalizedContent.replaceAll(from, to),
    content,
  );
}

function applyBrandText(content: string) {
  const replacements: Array<[string, string]> = [
    ["QuoteSignal", "REVORY"],
    ["REVORY", "REVORY"],
    ["Revory", "REVORY"],
    ["hello@revory.com", "hello@revory.com"],
    ["premium MedSpas", "premium home service companies"],
    ["premium MedSpa", "premium home service company"],
    ["MedSpas", "home service companies"],
    ["MedSpa", "home services"],
    ["clinic data", "quote data"],
    ["Clinic Data", "Quote Data"],
    ["clinics", "home service teams"],
    ["clinic", "home service team"],
    ["appointments", "estimates"],
    ["appointment", "estimate"],
    ["booking", "quote"],
    ["bookings", "quotes"],
    ["no-shows", "stale quotes"],
    ["cancellations", "overdue follow-ups"],
    ["No-Show And Cancellation Signals", "Stale Estimate And Follow-Up Signals"],
    ["No-show signal", "Stale estimate signal"],
    ["Unrecovered cancellation signal", "Overdue follow-up signal"],
    ["Blocked Booking Opportunities", "Blocked Close Opportunities"],
    ["Blocked booking opportunities", "Blocked close opportunities"],
    ["Appointments booked", "Quotes in view"],
    ["Email Default � SMS Optional", "CSV First, Guided Review"],
    ["Revenue Leak Detector for premium home service companies", "Estimate Revenue Leak Detector for home services"],
    ["Revenue Leak Detector for premium home services", "Estimate Revenue Leak Detector for home services"],
    ["Revenue Leak Detector for home service companies", "Estimate Revenue Leak Detector for home services"],
    ["Complete Revenue Leak Detector", "Complete Estimate Revenue Leak Detector"],
    ["Revenue Leaks Page", "Quote Leaks Page"],
    ["Revenue Leak Summary", "Quote Leak Summary"],
    ["Daily Leak Brief", "Daily Quote Leak Brief"],
    ["Dashboard leak read", "Dashboard quote leak read"],
    ["revenue leak detector", "quote leak detector"],
    ["revenue leaks", "quote leaks"],
    ["Revenue leaks", "Quote leaks"],
    ["Start With Your Quote Data", "Start With Quote Data"],
    ["Start With Quote Data \u2192", "Start With Quote Data \u2192"],
  ];

  return replacements.reduce(
    (brandedContent, [from, to]) => brandedContent.replaceAll(from, to),
    content,
  );
}

function applyREVORYTheme(css: string) {
  return css
    .replaceAll("--crimson: #C2095A;", "--crimson: #43B39B;")
    .replaceAll("--crimson-light: #E0106A;", "--crimson-light: #43B39B;")
    .replaceAll("--crimson-dim: rgba(194, 9, 90, 0.15);", "--crimson-dim: rgba(67, 179, 155, 0.13);")
    .replaceAll("--crimson-glow: rgba(194, 9, 90, 0.35);", "--crimson-glow: rgba(67, 179, 155, 0.28);")
    .replaceAll("--bg-primary: #0C0B0F;", "--bg-primary: #141516;")
    .replaceAll("--bg-secondary: #111018;", "--bg-secondary: #252729;")
    .replaceAll("--bg-card: #15141C;", "--bg-card: color-mix(in srgb, #252729 32%, #141516);")
    .replaceAll("--bg-card-hover: #1C1B26;", "--bg-card-hover: color-mix(in srgb, #252729 48%, #141516);")
    .replaceAll("--border-crimson: rgba(194,9,90,0.3);", "--border-crimson: rgba(67,179,155,0.28);")
    .replaceAll("--text-muted: #7A7890;", "--text-muted: #88A6B8;")
    .replaceAll("--text-subtle: #4A4860;", "--text-subtle: #48677C;")
    .replaceAll("#C2095A", "#43B39B")
    .replaceAll("#E0106A", "#43B39B")
    .replaceAll("rgba(194,9,90", "rgba(67,179,155")
    .replaceAll("rgba(194, 9, 90", "rgba(67, 179, 155")
    .replaceAll("rgba(12,11,15,0.85)", "rgba(20,21,22,0.94)")
    .replaceAll("#0C0B0F", "#141516")
    .replaceAll("#111018", "#252729")
    .replaceAll("#15141C", "#1A1B1C")
    .replaceAll("#1C1B26", "#1D1F20");
}

function adaptReferenceCss(css: string) {
  const themedCss = applyREVORYTheme(normalizeReferenceText(css));

  return `${themedCss
    .replace(/body\s*\{/g, ".revory-landing-page {")
    .replace(/html\s*\{/g, ".revory-landing-page-root {")
    .replace(/nav\s*\{/g, ".revory-landing-page nav {")
    .replace(/section\s*\{/g, ".revory-landing-page section {")
    .replace(/footer\s*\{/g, ".revory-landing-page-root footer {")}

    .revory-landing-page {
      --font-display: var(--font-instrument-serif), "Instrument Serif", Georgia, serif;
      --font-italic: var(--font-instrument-serif), "Instrument Serif", Georgia, serif;
      --font-body: var(--font-dm-sans), "DM Sans", sans-serif;
      background:
        radial-gradient(ellipse at 50% 18%, rgba(67, 179, 155, 0.1) 0%, transparent 42%),
        #141516;
    }

    .revory-landing-page nav {
      background: rgba(20, 21, 22, 0.94);
    }

    .revory-landing-page .prelaunch-notice {
      border-bottom: 1px solid rgba(67, 179, 155, 0.2);
      background: color-mix(in srgb, #43B39B 8%, #141516);
      padding: 0.7rem 1rem;
      color: #9ed7ca;
      font-family: var(--font-body);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      line-height: 1.5;
      text-align: center;
      text-transform: uppercase;
    }

    .revory-landing-page .logo {
      gap: 0.72rem;
    }

    .revory-landing-page .logo-icon,
    .revory-landing-page .logo-icon img {
      height: 56px !important;
      width: auto !important;
    }

    .revory-landing-page .logo-icon img {
      object-fit: contain;
    }

    .revory-landing-page .logo-wordmark {
      font-family: var(--font-display) !important;
      font-size: 1.22rem !important;
      font-weight: 400 !important;
      letter-spacing: 0 !important;
      text-transform: none !important;
    }

    .revory-landing-page h1,
    .revory-landing-page h2 {
      font-family: var(--font-display);
      font-weight: 400;
      letter-spacing: 0;
    }

    .revory-landing-page h3,
    .revory-landing-page h4 {
      font-family: var(--font-body);
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .revory-landing-page h1 {
      font-size: clamp(2.95rem, 6.35vw, 5.7rem);
      line-height: 0.98;
    }

    .revory-landing-page h2 {
      letter-spacing: 0;
      line-height: 0.98;
    }

    .revory-landing-page em,
    .revory-landing-page .italic-accent {
      font-family: var(--font-display);
      font-style: italic;
      font-weight: 400;
      letter-spacing: 0;
      color: #43b39b;
    }

    .revory-landing-page .hero-sub {
      max-width: 700px;
      font-size: 1.08rem;
      line-height: 1.72;
    }

    .revory-landing-page .section-label,
    .revory-landing-page .hero-badge,
    .revory-landing-page .trust-label,
    .revory-landing-page .price-tag {
      font-family: var(--font-body);
      font-weight: 700;
      letter-spacing: 0.08em;
    }

    .revory-landing-page .hero-glow {
      background: radial-gradient(ellipse at center, rgba(67, 179, 155, 0.16) 0%, transparent 70%);
    }

    .revory-landing-page .hero-badge {
      background: rgba(67, 179, 155, 0.075);
      border-color: rgba(67, 179, 155, 0.24);
      color: #43b39b;
    }

    .revory-landing-page #trust {
      padding: 0 2rem 2.25rem;
      border: 0;
      background: transparent;
    }

    .revory-landing-page .trust-inner {
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.075);
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.008)),
        color-mix(in srgb, #252729 32%, #141516);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.2);
    }

    .revory-landing-page .trust-item {
      padding: 1.75rem 1.25rem;
      border-color: rgba(255, 255, 255, 0.055);
    }

    .revory-landing-page #solution,
    .revory-landing-page #features,
    .revory-landing-page #self-service {
      background:
        radial-gradient(circle at 18% 12%, rgba(67, 179, 155, 0.045), transparent 28%),
        color-mix(in srgb, #252729 36%, #141516);
      border-block: 1px solid rgba(255, 255, 255, 0.04);
    }

    .revory-landing-page .solution-visual {
      padding: 2.15rem;
      border-color: rgba(255, 255, 255, 0.09);
      border-radius: 22px;
      background:
        linear-gradient(145deg, rgba(67, 179, 155, 0.045), transparent 42%),
        #181a1b;
      box-shadow: 0 28px 70px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.035);
    }

    .revory-landing-page .solution-visual::before {
      height: 1px;
      background: linear-gradient(90deg, transparent 8%, rgba(67, 179, 155, 0.78), transparent 92%);
    }

    .revory-landing-page .mock-dashboard {
      gap: 1.05rem;
    }

    .revory-landing-page .mock-stat {
      min-height: 112px;
      padding: 1.35rem 1rem;
      border-color: rgba(255, 255, 255, 0.08);
      border-radius: 13px;
      background: rgba(20, 21, 22, 0.86);
    }

    .revory-landing-page .mock-stat-val {
      font-size: 1.72rem;
      letter-spacing: -0.035em;
    }

    .revory-landing-page .mock-stat-lbl {
      display: block;
      margin-top: 0.35rem;
      line-height: 1.35;
    }

    .revory-landing-page .mock-row {
      min-height: 54px;
      padding: 0.95rem 1.15rem;
      border-color: rgba(255, 255, 255, 0.075);
      border-radius: 11px;
      background: rgba(20, 21, 22, 0.72);
    }

    .revory-landing-page .mock-label {
      color: color-mix(in srgb, white 58%, #43b39b);
    }

    .revory-landing-page .mock-value {
      font-size: 0.94rem;
      font-weight: 700;
    }

    .revory-landing-page .btn-primary,
    .revory-landing-page .nav-cta {
      background: #43b39b;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 18px 46px rgba(67, 179, 155, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.16);
      color: #ffffff !important;
    }

    .revory-landing-page .btn-primary:hover,
    .revory-landing-page .nav-cta:hover {
      background: color-mix(in srgb, #43b39b 84%, white) !important;
      box-shadow: 0 0 30px rgba(67, 179, 155, 0.28);
    }

    .revory-landing-page .roi-stats {
      align-items: stretch;
    }

    .revory-landing-page .roi-card {
      display: flex;
      min-height: 236px;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 2.15rem 1.35rem;
    }

    .revory-landing-page .roi-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
      margin: 0 0 0.95rem;
      padding: 0.32rem 0.7rem;
      border: 1px solid rgba(67, 179, 155, 0.18);
      border-radius: 999px;
      background: rgba(67, 179, 155, 0.075);
      color: #43b39b;
      font-family: var(--font-body);
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .revory-landing-page .roi-card h4 {
      font-family: var(--font-body);
      font-size: 1rem;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .revory-landing-page .roi-card p {
      max-width: 230px;
      margin: 0 auto;
      font-size: 0.88rem;
      line-height: 1.68;
    }

    .revory-landing-page .price-card.featured {
      border-color: rgba(67, 179, 155, 0.28);
      box-shadow: 0 0 80px rgba(67, 179, 155, 0.11);
    }

    .revory-landing-page-root footer {
      background: #141516;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .revory-landing-page-root footer .footer-logo {
      display: inline-flex;
      align-items: center;
      gap: 0.72rem;
    }

    .revory-landing-page-root footer .logo-icon,
    .revory-landing-page-root footer .logo-icon img {
      height: 50px !important;
      width: auto !important;
    }

    .revory-landing-page-root footer .logo-icon img {
      display: block;
      object-fit: contain;
    }

    .revory-landing-page-root footer .logo-wordmark {
      font-family: var(--font-instrument-serif), "Instrument Serif", Georgia, serif !important;
      font-size: 1.22rem !important;
      font-weight: 400 !important;
      letter-spacing: 0 !important;
      line-height: 1 !important;
      text-transform: none !important;
      color: #f5f4f8 !important;
    }

    @media (max-width: 640px) {
      .revory-landing-page #trust {
        padding-inline: 1rem;
      }

      .revory-landing-page .trust-inner {
        border-radius: 18px;
      }

      .revory-landing-page .logo-icon,
      .revory-landing-page .logo-icon img {
        height: 50px !important;
      }

      .revory-landing-page h1 {
        font-size: clamp(2.35rem, 11.5vw, 3.05rem);
        line-height: 1.02;
        letter-spacing: 0;
      }

      .revory-landing-page .hero-sub {
        font-size: 1rem;
        line-height: 1.68;
      }

      .revory-landing-page .roi-card {
        min-height: auto;
        padding: 2rem 1.35rem;
      }
    }
  `;
}

function replaceFirst(content: string, pattern: RegExp, replacement: string) {
  return content.replace(pattern, replacement);
}

const REVORY_PROBLEM_GRID = `
  <div class="problem-grid">
    <div class="problem-card">
      <span class="problem-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg></span>
      <h3>Stale estimates hide close risk</h3>
      <p>Open quotes age quietly until high-value jobs stop getting inspected.</p>
    </div>
    <div class="problem-card">
      <span class="problem-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
      <h3>Follow-ups lose urgency</h3>
      <p>Aging quotes need visible priority before the office team has to guess what still deserves action.</p>
    </div>
    <div class="problem-card">
      <span class="problem-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 18v3"/></svg></span>
      <h3>Quote paths get blocked</h3>
      <p>Missing contact details, owner gaps, or unclear next steps keep demand stuck before the team sees the risk.</p>
    </div>
    <div class="problem-card">
      <span class="problem-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5"/><path d="M5 11v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6"/></svg></span>
      <h3>Estimate evidence gets stale</h3>
      <p>A revenue read loses trust when quote amount, status, activity, or customer evidence has not been refreshed.</p>
    </div>
    <div class="problem-card">
      <span class="problem-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
      <h3>High-ticket jobs blur together</h3>
      <p>Without value, age, and confidence signals, expensive jobs compete with low-value noise.</p>
    </div>
    <div class="problem-card">
      <span class="problem-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 20 7v5c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V7l8-4Z"/><path d="m9 12 2 2 4-5"/></svg></span>
      <h3>Revenue risk needs confidence</h3>
      <p>REVORY separates operational risk from confirmed financial loss so teams know what to inspect first.</p>
    </div>
  </div>`;

function adaptReferenceMarkup(markup: string) {
  const logoMarkup = [
    '<div class="logo-icon">',
    '<img src="/brand/revory-logo-43b39b-transparent.png" alt="REVORY" style="height:56px;width:auto;display:block;" />',
    "</div>",
  ].join("");

  let adaptedMarkup = applyBrandText(normalizeReferenceText(markup))
    .replace(
      /<div class="logo-icon"><img src="data:image\/png;base64,[\s\S]*?<\/div>/g,
      logoMarkup,
    )
    .replace(
      /<span class="logo-wordmark"[^>]*>[^<]+<\/span>/g,
      '<span class="logo-wordmark">REVORY</span>',
    )
    .replaceAll('href="#pricing" class="btn-primary"', 'href="/start" class="btn-primary"')
    .replaceAll('href="#pricing" class="nav-cta"', 'href="/start" class="nav-cta"')
    .replaceAll('href="#" class="btn-primary"', 'href="/start" class="btn-primary"')
    .replaceAll('href="/start?plan=growth"', 'href="/start"')
    .replaceAll('href="#"', 'href="/"')
    .replaceAll('href="#how"', 'href="#how"')
    .replaceAll('href="#pricing"', 'href="#pricing"');

  adaptedMarkup = adaptedMarkup.replace(
    "</nav>",
    '</nav><div class="prelaunch-notice">Private build — the US$799 Quote Recovery Audit opens only after its product and security gates pass.</div>',
  );

  adaptedMarkup = replaceFirst(
    adaptedMarkup,
    /<div class="hero-badge">[\s\S]*?<\/div>/,
    '<div class="hero-badge">Quote Recovery Audit — launch gate in progress</div>',
  );

  adaptedMarkup = replaceFirst(
    adaptedMarkup,
    /<h1>[\s\S]*?<\/h1>/,
    "<h1>Detect quote leaks hidden in your <em>estimate data.</em></h1>",
  );

  adaptedMarkup = replaceFirst(
    adaptedMarkup,
    /<p class="hero-sub">[\s\S]*?<\/p>/,
    '<p class="hero-sub">REVORY is being built to help HVAC, roofing and home service teams inspect revenue still at risk from stale estimates, overdue follow-ups and weak next-step evidence without turning into a CRM, inbox, dispatch or BI tool.</p>',
  );

  adaptedMarkup = replaceFirst(
    adaptedMarkup,
    /<section id="problem">[\s\S]*?<div class="problem-grid">[\s\S]*?<\/div>\s*<\/section>/,
    `<section id="problem">
  <div class="problem-header">
    <span class="section-label">The Problem</span>
    <h2>Your quote data already shows where <em>revenue is at risk.</em></h2>
    <p style="margin-top:1rem;">Most home service companies do not need another bloated operating system to see the problem. They need a clear read on stale estimates, overdue follow-ups, blocked close opportunities, aging evidence, high-ticket noise and revenue confidence before those leaks become invisible.</p>
  </div>${REVORY_PROBLEM_GRID}
</section>`,
  );

  adaptedMarkup = adaptedMarkup
    .replaceAll("CSV-first", "CSV-first")
    .replaceAll("Self-service", "Self-service")
    .replaceAll("Estimated revenue at risk", "Estimated quote revenue at risk")
    .replaceAll("one main offer", "one main quote motion")
    .replaceAll("patient", "customer")
    .replaceAll("patients", "customers")
    .replaceAll("treatment", "job")
    .replaceAll("treatments", "jobs")
    .replaceAll("aesthetics", "home services")
    .replaceAll("lead source", "estimate source")
    .replaceAll("lead sources", "estimate sources")
    .replaceAll("blocked quote opportunities", "blocked close opportunities")
    .replaceAll("structured estimate and quote data", "structured estimate and customer data")
    .replaceAll("structured estimate data", "structured estimate and customer data")
    .replaceAll("Estimate Data", "Quote Data")
    .replaceAll("quote systems", "field service systems")
    .replaceAll("quote team", "office team")
    .replaceAll("quote teams", "office teams")
    .replaceAll("Start With Your Quote Data", "Start With Quote Data")
    .replaceAll("Start With Quote Data ?", "Start With Quote Data \u2192")
    .replaceAll("Start With Quote Data \u2192", "Preview $799 Audit \u2192")
    .replaceAll("Start With Quote Data", "Preview $799 Audit")
    .replaceAll("Start with Growth ?", "Start with Growth")
    .replaceAll("Email us ?", "Email us")
    .replaceAll("? CSV-first.", "\u2713 CSV-first.")
    .replaceAll("? Self-service.", "\u2713 Self-service.")
    .replaceAll("? Estimated quote revenue at risk.", "\u2713 Estimated quote revenue at risk.")
    .replaceAll("What home service teams usually ask before they start.", "What teams usually ask before they start.")
    .replaceAll("add the quote data you need", "upload the estimate data you need")
    .replaceAll("structured estimate and quote data", "structured estimate and customer data")
    .replaceAll("structured quote and estimate data", "structured estimate and customer data")
    .replaceAll("No Manual Quick Add", "No manual quick add")
    .replaceAll("No Executive Summary copy/share/print", "No executive summary copy/share/print");

  return adaptedMarkup;
}

export default async function HomePage() {
  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect("/app");
  }

  const referenceHtml = await readFile(LANDING_REFERENCE_PATH, "utf8");
  const rawCss = extractBetween(referenceHtml, "<style>", "</style>");
  const landingCss = adaptReferenceCss(rawCss);
  const landingMarkup = adaptReferenceMarkup(extractLandingMarkup(referenceHtml));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: landingCss }} />
      <Script id="revory-landing-faq" strategy="afterInteractive">
        {`
          window.toggleFaq = function toggleFaq(element) {
            const item = element && element.closest ? element.closest('.faq-item') : null;
            if (!item) return;
            item.classList.toggle('open');
          };
        `}
      </Script>

      <main className="revory-landing-page-root">
        <div
          className="revory-landing-page"
          dangerouslySetInnerHTML={{ __html: landingMarkup }}
        />

        <footer>
          <div className="footer-logo">
            <div className="logo-icon">
              <Image
                alt="REVORY"
                height={50}
                src="/brand/revory-logo-43b39b-transparent.png"
                width={62}
              />
            </div>
            <span className="logo-wordmark">REVORY</span>
          </div>
          <span className="footer-copy">
            {"\u00a9"} {FOOTER_YEAR} REVORY. Estimate Revenue Leak Detector for home services.
          </span>
          <ul className="footer-links">
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
            <li>
              <Link href="/sign-in">Sign in</Link>
            </li>
          </ul>
        </footer>
      </main>
    </>
  );
}
