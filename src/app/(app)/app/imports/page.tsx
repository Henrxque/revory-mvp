import { redirect } from "next/navigation";

import { CanonicalImportPanel } from "@/components/imports/CanonicalImportPanel";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";

export default async function ImportsPage() {
  const appContext = await getAppContext();
  if (!appContext) redirect(buildSignInRedirectPath("/app/imports"));

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="max-w-[46rem] space-y-3">
          <p className="rev-kicker">Canonical contractor intake</p>
          <h1 className="rev-display-hero max-w-[34rem]">
            Bring the commercial and billing evidence your team already owns.
          </h1>
          <p className="max-w-[42rem] text-sm leading-7 text-[color:var(--text-muted)]">
            Profile Quote Recovery or Revenue Realization exports, review every suggested
            field mapping and commit only after Data Quality accepts the complete batch.
            Unmatched links remain visible; uncertain data never becomes a financial claim.
          </p>
          <p className="max-w-[42rem] text-xs leading-6 text-[color:var(--text-subtle)]">Each entity type and source system is treated as a complete current snapshot. A later import replaces the active scope while preserving omitted records as inactive history; use a new source-system label only for a genuinely different system.</p>
        </div>
      </section>
      <CanonicalImportPanel />
    </div>
  );
}
