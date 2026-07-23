import Link from "next/link";

import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { REVORY_LEGAL, REVORY_LEGAL_DOCUMENTS } from "@/content/revory-legal";
import { acceptCurrentLegalDocuments } from "@/src/app/(app)/app/legal-actions";

export function LegalReacceptGate({ userEmail }: { userEmail: string }) {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-8 font-[family:var(--font-app)] text-[color:var(--foreground)] md:py-14">
      <section className="rev-card-premium rev-accent-mist mx-auto max-w-2xl rounded-[32px] p-6 md:p-9">
        <RevoryLogo compact />
        <p className="rev-kicker mt-10">Legal update · {REVORY_LEGAL.legalRevision}</p>
        <h1 className="mt-3 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-[.98] tracking-[-.055em]">
          Review the current Terms and Privacy Notice.
        </h1>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">
          We updated REVORY&apos;s provider identity, product boundaries, data-processing roles,
          retention controls and liability terms. We cannot treat an older account as if it had
          accepted version {REVORY_LEGAL_DOCUMENTS.terms.version}.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link className="rev-button-ghost justify-center" href="/terms" target="_blank">Read Terms of Service</Link>
          <Link className="rev-button-ghost justify-center" href="/privacy" target="_blank">Read Privacy Notice</Link>
        </div>
        <form action={acceptCurrentLegalDocuments} className="mt-7">
          <label className="flex cursor-pointer items-start gap-3 rounded-[20px] border border-[color:var(--border)] bg-[rgba(20,21,22,.58)] p-4 text-sm leading-6 text-[color:var(--text-muted)]">
            <input className="mt-1 h-4 w-4 accent-[#43B39B]" name="legalAccepted" required type="checkbox" value="yes" />
            <span>I agree to the Terms of Service and acknowledge the Privacy Notice for the REVORY account registered to <strong className="text-[color:var(--foreground)]">{userEmail}</strong>.</span>
          </label>
          <button className="rev-button-primary mt-4 w-full justify-center" type="submit">Accept and continue to REVORY</button>
        </form>
        <p className="mt-5 text-xs leading-5 text-[color:var(--text-subtle)]">
          The acceptance record stores your account, workspace, document versions, event context and timestamp. It does not collect your IP address for this purpose.
        </p>
      </section>
    </main>
  );
}
