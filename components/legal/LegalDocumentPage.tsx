import type { Metadata } from "next";
import Link from "next/link";

import { REVORY_LEGAL, REVORY_LEGAL_DOCUMENTS, type RevoryLegalDocumentKey } from "@/content/revory-legal";
import type { LegalDocument, LegalLocale } from "@/content/revory-legal-documents";

const legalLinks = [
  ["terms", "Terms"],
  ["privacy", "Privacy"],
  ["refunds", "Refunds"],
  ["dpa", "DPA"],
  ["security", "Security"],
  ["subprocessors", "Subprocessors"],
  ["cookies", "Cookies"],
  ["responsibleDisclosure", "Disclosure"],
] as const satisfies readonly [RevoryLegalDocumentKey, string][];

export function buildLegalMetadata(input: {
  description: string;
  documentKey: RevoryLegalDocumentKey;
  locale: LegalLocale;
  title: string;
}): Metadata {
  const canonical = REVORY_LEGAL_DOCUMENTS[input.documentKey].path;
  return {
    alternates: {
      canonical,
      languages: {
        en: canonical,
      },
    },
    description: input.description,
    robots: { follow: true, index: true },
    title: `${input.title} | REVORY`,
  };
}

export function LegalDocumentPage({
  document,
  documentKey,
  locale,
}: {
  document: LegalDocument;
  documentKey: RevoryLegalDocumentKey;
  locale: LegalLocale;
}) {
  const documentVersion = REVORY_LEGAL_DOCUMENTS[documentKey].version;

  return (
    <main className="legal-page min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--foreground)] md:px-6 md:py-9">
      <article className="rev-card-premium mx-auto max-w-4xl rounded-[30px] p-5 md:p-10" lang={locale}>
        <header className="border-b border-[color:var(--border)] pb-7">
          <p className="rev-kicker">{document.kicker}</p>
          <h1 className="mt-4 max-w-3xl font-[family:var(--font-marketing-display)] text-[clamp(2.35rem,6vw,4.6rem)] leading-[0.98] tracking-[-0.04em]">
            {document.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
            {document.description}
          </p>
          <dl className="mt-6 grid gap-3 text-xs text-[color:var(--text-subtle)] sm:grid-cols-3">
            <div><dt className="font-bold uppercase tracking-[0.12em]">Version</dt><dd className="mt-1">{documentVersion}</dd></div>
            <div><dt className="font-bold uppercase tracking-[0.12em]">Effective</dt><dd className="mt-1">{REVORY_LEGAL.effectiveDate}</dd></div>
            <div><dt className="font-bold uppercase tracking-[0.12em]">Provider</dt><dd className="mt-1">{REVORY_LEGAL.shortLegalName}</dd></div>
          </dl>
        </header>

        <div className="mt-8 space-y-8 text-sm leading-7 text-[color:var(--text-muted)] md:text-[15px]">
          {document.sections.map((section) => (
            <section className="legal-section scroll-mt-24" key={section.title}>
              <h2 className="text-lg font-bold tracking-[-0.02em] text-[color:var(--foreground)] md:text-xl">{section.title}</h2>
              <div className="mt-2 space-y-3">
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-[color:var(--border)] pt-7">
          <nav aria-label="Legal documents" className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-[color:var(--text-muted)]">
            {legalLinks.map(([key, label]) => (
              <Link className="transition hover:text-[color:var(--accent-light)]" href={REVORY_LEGAL_DOCUMENTS[key].path} key={key}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--text-subtle)]">
            <p>© 2026 {REVORY_LEGAL.legalName} · CNPJ {REVORY_LEGAL.taxId}</p>
            <Link className="rev-action-button inline-flex" href="/">Back to REVORY</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
