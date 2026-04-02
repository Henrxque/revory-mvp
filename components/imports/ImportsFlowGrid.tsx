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
    <div className={isFocusedLayout ? "grid min-w-0 gap-6" : "grid min-w-0 gap-6 2xl:grid-cols-2"}>
      <CsvUploadCard
        helperText="Booked proof for revenue."
        lastUpload={appointmentsLastUpload}
        onActivityChange={handleAppointmentsActivityChange}
        templateHref={`/templates/${revoryCsvTemplateDefinitions.appointments.fileName}`}
        templateKey="appointments"
        templateName={revoryCsvTemplateDefinitions.appointments.name}
      />

      <CsvUploadCard
        helperText="Support after booked proof."
        lastUpload={clientsLastUpload}
        onActivityChange={handleClientsActivityChange}
        templateHref={`/templates/${revoryCsvTemplateDefinitions.clients.fileName}`}
        templateKey="clients"
        templateName={revoryCsvTemplateDefinitions.clients.name}
      />
    </div>
  );
}
