import { DataSourceType } from "@prisma/client";

import type { RevoryCsvTemplateKey } from "@/types/imports";

export const csvUploadSourceNames: Record<RevoryCsvTemplateKey, string> = {
  appointments: "appointments-csv-upload",
  clients: "clients-csv-upload",
};

export const csvUploadSourceTypes: Record<RevoryCsvTemplateKey, DataSourceType> = {
  appointments: DataSourceType.APPOINTMENTS_CSV,
  clients: DataSourceType.CLIENTS_CSV,
};
