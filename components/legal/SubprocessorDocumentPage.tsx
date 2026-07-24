import Link from "next/link";

import { REVORY_LEGAL, REVORY_LEGAL_DOCUMENTS } from "@/content/revory-legal";
import { REVORY_SUBPROCESSORS, REVORY_SUBPROCESSORS_UPDATED } from "@/content/revory-subprocessors";

export function SubprocessorDocumentPage() {
  const locale = "en" as const;
  return (
    <main className="legal-page min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--foreground)] md:px-6 md:py-9">
      <article className="rev-card-premium mx-auto max-w-6xl rounded-[30px] p-5 md:p-10" lang={locale}>
        <header className="border-b border-[color:var(--border)] pb-7">
          <p className="rev-kicker">Subprocessor Notice</p>
          <h1 className="mt-4 max-w-4xl font-[family:var(--font-marketing-display)] text-[clamp(2.35rem,6vw,4.6rem)] leading-[0.98] tracking-[-0.04em]">
            Who helps operate REVORY.
          </h1>
          <p className="mt-5 max-w-4xl text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
            This list includes only providers used by the current implementation. A conditional
            provider processes data only when its related feature is configured or used.
          </p>
          <p className="mt-4 text-xs text-[color:var(--text-subtle)]">
            Version {REVORY_LEGAL_DOCUMENTS.subprocessors.version} · Updated {REVORY_SUBPROCESSORS_UPDATED}
          </p>
        </header>

        <div className="mt-8 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-xs leading-5">
            <thead><tr className="text-[color:var(--text-subtle)]"><th className="border-b border-[color:var(--border)] p-3">Provider/status</th><th className="border-b border-[color:var(--border)] p-3">Purpose and role</th><th className="border-b border-[color:var(--border)] p-3">Data</th><th className="border-b border-[color:var(--border)] p-3">Geography</th><th className="border-b border-[color:var(--border)] p-3">Links</th></tr></thead>
            <tbody>{REVORY_SUBPROCESSORS.map((item) => <tr key={item.provider} className="align-top text-[color:var(--text-muted)]"><td className="border-b border-[color:var(--border)] p-3"><strong className="block text-sm text-[color:var(--foreground)]">{item.provider}</strong><span className="mt-1 inline-flex rounded-full border border-[rgba(67,179,155,.32)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-[color:var(--accent-light)]">{item.conditional ? "Conditional" : "Active"}</span></td><td className="border-b border-[color:var(--border)] p-3">{item.purpose[locale]}<span className="mt-2 block text-[color:var(--text-subtle)]">{item.role[locale]}</span></td><td className="border-b border-[color:var(--border)] p-3">{item.data[locale]}</td><td className="border-b border-[color:var(--border)] p-3">{item.geography[locale]}</td><td className="border-b border-[color:var(--border)] p-3">{item.links.map((link) => <a className="mr-3 inline-flex text-[color:var(--accent-light)] underline underline-offset-4" href={link.href} key={link.href} rel="noreferrer" target="_blank">{link.label}</a>)}</td></tr>)}</tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-4 lg:hidden">
          {REVORY_SUBPROCESSORS.map((item) => (
            <section className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(20,21,22,.58)] p-5" key={item.provider}>
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{item.provider}</h2><span className="rounded-full border border-[rgba(67,179,155,.32)] px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[color:var(--accent-light)]">{item.conditional ? "Conditional" : "Active"}</span></div>
              <dl className="mt-4 space-y-4 text-sm leading-6 text-[color:var(--text-muted)]"><div><dt className="font-bold text-[color:var(--foreground)]">Purpose</dt><dd>{item.purpose[locale]}</dd></div><div><dt className="font-bold text-[color:var(--foreground)]">Data</dt><dd>{item.data[locale]}</dd></div><div><dt className="font-bold text-[color:var(--foreground)]">Role</dt><dd>{item.role[locale]}</dd></div><div><dt className="font-bold text-[color:var(--foreground)]">Geography</dt><dd>{item.geography[locale]}</dd></div></dl>
              <div className="mt-4 flex gap-3">{item.links.map((link) => <a className="text-xs font-bold text-[color:var(--accent-light)] underline underline-offset-4" href={link.href} key={link.href} rel="noreferrer" target="_blank">{link.label}</a>)}</div>
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-[color:var(--border)] pt-6 text-sm leading-7 text-[color:var(--text-muted)]">
          <p>A material change will be published or communicated as described in the DPA. Questions: <a className="text-[color:var(--accent-light)] underline" href={`mailto:${REVORY_LEGAL.privacyEmail}`}>{REVORY_LEGAL.privacyEmail}</a>.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link className="rev-action-button inline-flex" href="/">Back to REVORY</Link><Link className="rev-button-ghost inline-flex" href="/dpa">DPA</Link><Link className="rev-button-ghost inline-flex" href="/privacy">Privacy</Link></div>
        </footer>
      </article>
    </main>
  );
}
