"use client";

import { useCallback, useState } from "react";

import { CsvUploadCard } from "@/components/imports/CsvUploadCard";
import { revoryCsvTemplateDefinitions } from "@/lib/imports/csv-template-definitions";

type UploadSummary = {
  errorRows: number;
  fileName: string | null;
  importedAt: string | null;
  successRows: number;
  totalRows: number;
  status: string;
} | null;

type ImportsFlowGridProps = Readonly<{
  appointmentsLastUpload: UploadSummary;
  clientsLastUpload: UploadSummary;
}>;

export function ImportsFlowGrid({
  appointmentsLastUpload,
  clientsLastUpload,
}: ImportsFlowGridProps) {
  const [activityState, setActivityState] = useState({
    appointments: false,
    clients: false,
  });

  const isFocusedLayout = activityState.appointments || activityState.clients;

  const handleAppointmentsActivityChange = useCallback((isActive: boolean) => {
    setActivityState((current) =>
      current.appointments === isActive
        ? current
        : {
            ...current,
            appointments: isActive,
          },
    );
  }, []);

  const handleClientsActivityChange = useCallback((isActive: boolean) => {
    setActivityState((current) =>
      current.clients === isActive
        ? current
        : {
            ...current,
            clients: isActive,
          },
    );
  }, []);

  return (
    <div className={isFocusedLayout ? "grid min-w-0 gap-6" : "grid min-w-0 gap-6"}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[rgba(194,9,90,0.18)] bg-[rgba(194,9,90,0.06)] px-4 py-3">
          <div>
            <p className="rev-label">Primary lane</p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
              Appointment evidence comes first.
            </p>
          </div>
          <p className="max-w-[22rem] text-right text-xs leading-[1.45] text-[color:var(--text-muted)]">
            Appointments help REVORY identify no-shows, cancellations, service patterns and data freshness.
          </p>
        </div>

        <CsvUploadCard
          helperText="Upload appointment data first so REVORY can read status, schedule, estimated value and freshness signals."
          lastUpload={appointmentsLastUpload}
          laneSummary="Primary evidence lane"
          onActivityChange={handleAppointmentsActivityChange}
          templateHref={`/templates/${revoryCsvTemplateDefinitions.appointments.fileName}`}
          templateKey="appointments"
          templateName={revoryCsvTemplateDefinitions.appointments.name}
          tone="primary"
        />
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
          <div>
            <p className="rev-label">Secondary lane</p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
              Client context supports the leak read.
            </p>
          </div>
          <p className="max-w-[22rem] text-right text-xs leading-[1.45] text-[color:var(--text-muted)]">
            Add client context when the clinic needs cleaner contact evidence behind blocked booking risks.
          </p>
        </div>

        <CsvUploadCard
          helperText="Add client context only when appointment evidence is already clear or blocked booking risks need support."
          lastUpload={clientsLastUpload}
          laneSummary="Context support lane"
          onActivityChange={handleClientsActivityChange}
          templateHref={`/templates/${revoryCsvTemplateDefinitions.clients.fileName}`}
          templateKey="clients"
          templateName={revoryCsvTemplateDefinitions.clients.name}
          tone="secondary"
        />
      </div>
    </div>
  );
}
