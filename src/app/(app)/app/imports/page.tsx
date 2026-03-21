import { redirect } from "next/navigation";

import { CsvUploadCard } from "@/components/imports/CsvUploadCard";
import { RevorySectionHeader } from "@/components/ui/RevorySectionHeader";
import { revoryCsvTemplateDefinitions } from "@/lib/imports/csv-template-definitions";
import { getAppContext } from "@/services/app/get-app-context";
import { getCsvUploadSources } from "@/services/imports/get-csv-upload-sources";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

function toUploadSummary(
  source: {
    lastImportErrorRowCount: number;
    lastImportFileName: string | null;
    lastImportedAt: Date | null;
    lastImportSuccessRowCount: number;
    lastImportRowCount: number;
    status: string;
  } | null,
) {
  if (!source) {
    return null;
  }

  return {
    errorRows: source.lastImportErrorRowCount,
    fileName: source.lastImportFileName,
    importedAt: source.lastImportedAt?.toISOString() ?? null,
    successRows: source.lastImportSuccessRowCount,
    status: source.status,
    totalRows: source.lastImportRowCount,
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
      <section className="rev-shell-hero rounded-[30px] p-6">
        <RevorySectionHeader
          badgeLabel="Official templates only"
          badgeTone="accent"
          description="This step now receives the CSV file, validates the official structure, persists the supported rows, and keeps the import outcome explicit for the next correction pass."
          eyebrow="CSV Imports"
          title="Bring appointments and clients into REVORY with the official CSV templates."
        />
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            description:
              "The upload flow is intentionally strict and aligned to the official REVORY templates.",
            label: "Accepted file",
            title: "CSV only",
          },
          {
            description:
              "File presence, extension, structure, and row normalization are checked before rows reach the database.",
            label: "Validation",
            title: "Front, server, and persistence",
          },
          {
            description:
              "Supported rows are persisted now, while deeper deduplication and automation behavior stay out of scope on purpose.",
            label: "Current scope",
            title: "MVP import persistence",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rev-card-soft rounded-[24px] px-5 py-5"
          >
            <p className="rev-label">
              {card.label}
            </p>
            <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
              {card.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              {card.description}
            </p>
          </div>
        ))}
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
