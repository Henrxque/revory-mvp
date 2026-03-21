import type {
  RevoryAppointmentCsvColumn,
  RevoryClientCsvColumn,
  RevoryCsvTemplateDefinition,
} from "@/types/imports";

export const revoryAppointmentsCsvTemplateDefinition = {
  key: "appointments",
  fileName: "revory-appointments-template.csv",
  name: "REVORY Appointments Template",
  requiredColumns: [
    "appointment_external_id",
    "client_full_name",
    "scheduled_at",
    "status",
  ],
  atLeastOneOf: ["client_external_id", "client_email", "client_phone"],
  optionalColumns: [
    "client_external_id",
    "client_email",
    "client_phone",
    "service_name",
    "provider_name",
    "estimated_revenue",
    "booked_at",
    "canceled_at",
    "location_name",
    "source_notes",
  ],
} satisfies RevoryCsvTemplateDefinition<"appointments", RevoryAppointmentCsvColumn>;

export const revoryClientsCsvTemplateDefinition = {
  key: "clients",
  fileName: "revory-clients-template.csv",
  name: "REVORY Clients Template",
  requiredColumns: ["full_name"],
  atLeastOneOf: ["external_id", "email", "phone"],
  optionalColumns: [
    "external_id",
    "email",
    "phone",
    "last_visit_at",
    "total_visits",
    "tags",
    "notes",
  ],
} satisfies RevoryCsvTemplateDefinition<"clients", RevoryClientCsvColumn>;

export const revoryCsvTemplateDefinitions = {
  appointments: revoryAppointmentsCsvTemplateDefinition,
  clients: revoryClientsCsvTemplateDefinition,
} as const;
