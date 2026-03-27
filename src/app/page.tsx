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

function adaptReferenceCss(css: string) {
  return css
    .replace(/body\s*\{/g, ".revory-landing-page {")
    .replace(/html\s*\{/g, ".revory-landing-page-root {")
    .replace(/nav\s*\{/g, ".revory-landing-page nav {")
    .replace(/section\s*\{/g, ".revory-landing-page section {")
    .replace(/footer\s*\{/g, ".revory-landing-page-root footer {");
}

function adaptReferenceMarkup(markup: string) {
  return markup
    .replaceAll('href="#pricing" class="btn-primary"', 'href="/start" class="btn-primary"')
    .replaceAll('href="#pricing" class="nav-cta"', 'href="/start" class="nav-cta"')
    .replaceAll('href="#" class="btn-primary"', 'href="/start" class="btn-primary"')
    .replaceAll('href="#"', 'href="/"')
    .replaceAll("Â©", "©");
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
                height={36}
                src="/brand/revory-logo-mark.png"
                width={53}
              />
            </div>
            <span className="logo-wordmark">REVORY</span>
          </div>
          <span className="footer-copy">
            © 2025 REVORY. Appointment recovery software for modern businesses.
          </span>
          <ul className="footer-links">
            <li>
              <Link href="/">Privacy</Link>
            </li>
            <li>
              <Link href="/">Terms</Link>
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
