import { redirect } from "next/navigation";

import { CanonicalImportPanel } from "@/components/imports/CanonicalImportPanel";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getCanonicalImportAccessNotice } from "@/services/billing/canonical-import-access";

export default async function ImportsPage() {
  const appContext = await getAppContext();
  if (!appContext) redirect(buildSignInRedirectPath("/app/imports"));
  const accessNotice = await getCanonicalImportAccessNotice(appContext.workspace.id);

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="max-w-[46rem] space-y-3">
          <p className="rev-kicker">Contractor data import</p>
          <h1 className="rev-display-hero max-w-[34rem]">
            Bring the estimates, follow-ups and job records your team already owns.
          </h1>
          <p className="max-w-[42rem] text-sm leading-7 text-[color:var(--text-muted)]">
            Upload Quote Recovery or Revenue Realization exports, check each suggested
            column match and import only after REVORY validates the complete batch.
            Records that do not match stay visible; uncertain data never becomes a financial claim.
          </p>
          <p className="max-w-[42rem] text-xs leading-6 text-[color:var(--text-subtle)]">Each file type and source is treated as the current complete export. A later import refreshes that active dataset while preserving older records in history; choose a different source only when the files truly came from another system.</p>
        </div>
      </section>
      <CanonicalImportPanel accessNotice={accessNotice} defaultCurrency={appContext.workspace.defaultCurrency} />
    </div>
  );
}
