import { redirect } from "next/navigation";

import { CsvUploadCard } from "@/components/imports/CsvUploadCard";
import { revoryCsvTemplateDefinitions } from "@/lib/imports/csv-template-definitions";
import { getAppContext } from "@/services/app/get-app-context";
import { getCsvUploadSources } from "@/services/imports/get-csv-upload-sources";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

function toUploadSummary(
  source: {
    lastImportFileName: string | null;
    lastImportedAt: Date | null;
    status: string;
  } | null,
) {
  if (!source) {
    return null;
  }

  return {
    fileName: source.lastImportFileName,
    receivedAt: source.lastImportedAt?.toISOString() ?? null,
    status: source.status,
  };
}

export default async function ImportsPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
  }

  if (!appContext.activationSetup.isCompleted) {
    redirect(
      getOnboardingStepPath(
        resolveOnboardingStepKey(appContext.activationSetup.currentStep),
      ),
    );
  }

  const uploadSources = await getCsvUploadSources(appContext.workspace.id);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[color:var(--border)] bg-white/85 p-6 shadow-[0_18px_50px_rgba(32,26,24,0.05)]">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
          CSV Imports
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold text-[color:var(--foreground)] md:text-4xl">
          Bring appointments and clients into REVORY with the official CSV
          templates.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-black/70 md:text-base">
          This step receives the CSV file, validates the basics, and registers
          the initial upload metadata. Parsing, row mapping, and import results
          land next.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-white/85 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Accepted file
          </p>
          <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
            CSV only
          </p>
          <p className="mt-2 text-sm leading-6 text-black/65">
            The upload flow is intentionally strict and aligned to the official
            REVORY templates.
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-white/85 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Validation
          </p>
          <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
            Front and server
          </p>
          <p className="mt-2 text-sm leading-6 text-black/65">
            File presence, extension, and size are checked before metadata is
            registered.
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-white/85 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Current scope
          </p>
          <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
            Upload metadata only
          </p>
          <p className="mt-2 text-sm leading-6 text-black/65">
            Parsing and row-level import logic stay out of this stage on
            purpose.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CsvUploadCard
          helperText="Use the appointments template when the export already includes appointment-level scheduling rows and a client identifier path."
          lastUpload={toUploadSummary(uploadSources.appointments)}
          templateHref={`/templates/${revoryCsvTemplateDefinitions.appointments.fileName}`}
          templateKey="appointments"
          templateName={revoryCsvTemplateDefinitions.appointments.name}
        />

        <CsvUploadCard
          helperText="Use the clients template when the export is centered on patient records and visit history before appointment import begins."
          lastUpload={toUploadSummary(uploadSources.clients)}
          templateHref={`/templates/${revoryCsvTemplateDefinitions.clients.fileName}`}
          templateKey="clients"
          templateName={revoryCsvTemplateDefinitions.clients.name}
        />
      </div>
    </div>
  );
}
