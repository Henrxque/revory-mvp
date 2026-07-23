import Link from "next/link";

import { REVORY_LEGAL, REVORY_LEGAL_DOCUMENTS } from "@/content/revory-legal";
import type { LegalLocale } from "@/content/revory-legal-documents";
import { REVORY_SUBPROCESSORS, REVORY_SUBPROCESSORS_UPDATED } from "@/content/revory-subprocessors";

export function SubprocessorDocumentPage({ locale }: { locale: LegalLocale }) {
  const pt = locale === "pt-BR";
  return (
    <main className="legal-page min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--foreground)] md:px-6 md:py-9">
      <article className="rev-card-premium mx-auto max-w-6xl rounded-[30px] p-5 md:p-10" lang={locale}>
        <header className="border-b border-[color:var(--border)] pb-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="rev-kicker">{pt ? "Aviso de Suboperadores" : "Subprocessor Notice"}</p>
            <Link className="rev-button-ghost inline-flex min-h-10 items-center px-4 text-xs" href={pt ? "/subprocessors" : "/pt-br/subprocessors"}>
              {pt ? "Read in English" : "Ler em português"}
            </Link>
          </div>
          <h1 className="mt-4 max-w-4xl font-[family:var(--font-marketing-display)] text-[clamp(2.35rem,6vw,4.6rem)] leading-[0.98] tracking-[-0.04em]">
            {pt ? "Quem ajuda a operar o REVORY." : "Who helps operate REVORY."}
          </h1>
          <p className="mt-5 max-w-4xl text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
            {pt
              ? "Esta lista contém apenas fornecedores usados na implementação atual. Um fornecedor condicional trata dados somente quando o recurso correspondente é configurado ou usado."
              : "This list includes only providers used by the current implementation. A conditional provider processes data only when its related feature is configured or used."}
          </p>
          <p className="mt-4 text-xs text-[color:var(--text-subtle)]">
            {pt ? "Versão" : "Version"} {REVORY_LEGAL_DOCUMENTS.subprocessors.version} · {pt ? "Atualizado em" : "Updated"} {REVORY_SUBPROCESSORS_UPDATED}
          </p>
        </header>

        <div className="mt-8 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-xs leading-5">
            <thead><tr className="text-[color:var(--text-subtle)]"><th className="border-b border-[color:var(--border)] p-3">{pt ? "Provedor/status" : "Provider/status"}</th><th className="border-b border-[color:var(--border)] p-3">{pt ? "Finalidade e papel" : "Purpose and role"}</th><th className="border-b border-[color:var(--border)] p-3">{pt ? "Dados" : "Data"}</th><th className="border-b border-[color:var(--border)] p-3">{pt ? "Geografia" : "Geography"}</th><th className="border-b border-[color:var(--border)] p-3">Links</th></tr></thead>
            <tbody>{REVORY_SUBPROCESSORS.map((item) => <tr key={item.provider} className="align-top text-[color:var(--text-muted)]"><td className="border-b border-[color:var(--border)] p-3"><strong className="block text-sm text-[color:var(--foreground)]">{item.provider}</strong><span className="mt-1 inline-flex rounded-full border border-[rgba(67,179,155,.32)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-[color:var(--accent-light)]">{item.conditional ? (pt ? "Condicional" : "Conditional") : (pt ? "Ativo" : "Active")}</span></td><td className="border-b border-[color:var(--border)] p-3">{item.purpose[locale]}<span className="mt-2 block text-[color:var(--text-subtle)]">{item.role[locale]}</span></td><td className="border-b border-[color:var(--border)] p-3">{item.data[locale]}</td><td className="border-b border-[color:var(--border)] p-3">{item.geography[locale]}</td><td className="border-b border-[color:var(--border)] p-3">{item.links.map((link) => <a className="mr-3 inline-flex text-[color:var(--accent-light)] underline underline-offset-4" href={link.href} key={link.href} rel="noreferrer" target="_blank">{link.label}</a>)}</td></tr>)}</tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-4 lg:hidden">
          {REVORY_SUBPROCESSORS.map((item) => (
            <section className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(20,21,22,.58)] p-5" key={item.provider}>
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{item.provider}</h2><span className="rounded-full border border-[rgba(67,179,155,.32)] px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[color:var(--accent-light)]">{item.conditional ? (pt ? "Condicional" : "Conditional") : (pt ? "Ativo" : "Active")}</span></div>
              <dl className="mt-4 space-y-4 text-sm leading-6 text-[color:var(--text-muted)]"><div><dt className="font-bold text-[color:var(--foreground)]">{pt ? "Finalidade" : "Purpose"}</dt><dd>{item.purpose[locale]}</dd></div><div><dt className="font-bold text-[color:var(--foreground)]">{pt ? "Dados" : "Data"}</dt><dd>{item.data[locale]}</dd></div><div><dt className="font-bold text-[color:var(--foreground)]">{pt ? "Papel" : "Role"}</dt><dd>{item.role[locale]}</dd></div><div><dt className="font-bold text-[color:var(--foreground)]">{pt ? "Geografia" : "Geography"}</dt><dd>{item.geography[locale]}</dd></div></dl>
              <div className="mt-4 flex gap-3">{item.links.map((link) => <a className="text-xs font-bold text-[color:var(--accent-light)] underline underline-offset-4" href={link.href} key={link.href} rel="noreferrer" target="_blank">{link.label}</a>)}</div>
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-[color:var(--border)] pt-6 text-sm leading-7 text-[color:var(--text-muted)]">
          <p>{pt ? "Mudança material será publicada ou comunicada conforme o DPA. Dúvidas:" : "A material change will be published or communicated as described in the DPA. Questions:"} <a className="text-[color:var(--accent-light)] underline" href={`mailto:${REVORY_LEGAL.privacyEmail}`}>{REVORY_LEGAL.privacyEmail}</a>.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link className="rev-action-button inline-flex" href="/">{pt ? "Voltar ao REVORY" : "Back to REVORY"}</Link><Link className="rev-button-ghost inline-flex" href={pt ? "/pt-br/dpa" : "/dpa"}>DPA</Link><Link className="rev-button-ghost inline-flex" href={pt ? "/pt-br/privacy" : "/privacy"}>{pt ? "Privacidade" : "Privacy"}</Link></div>
        </footer>
      </article>
    </main>
  );
}
