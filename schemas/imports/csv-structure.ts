import { revoryCsvTemplateDefinitions } from "@/lib/imports/csv-template-definitions";
import type {
  RevoryAppointmentCsvColumn,
  RevoryClientCsvColumn,
  RevoryCsvStructureSchema,
} from "@/types/imports";

export const revoryAppointmentsCsvStructureSchema = {
  atLeastOneOf: revoryCsvTemplateDefinitions.appointments.atLeastOneOf,
  optionalDateColumns: ["booked_at", "canceled_at"],
  requiredColumns: revoryCsvTemplateDefinitions.appointments.requiredColumns,
  requiredDateColumns: ["scheduled_at"],
} satisfies RevoryCsvStructureSchema<RevoryAppointmentCsvColumn>;

export const revoryClientsCsvStructureSchema = {
  atLeastOneOf: revoryCsvTemplateDefinitions.clients.atLeastOneOf,
  optionalDateColumns: ["last_visit_at"],
  requiredColumns: revoryCsvTemplateDefinitions.clients.requiredColumns,
  requiredDateColumns: [],
} satisfies RevoryCsvStructureSchema<RevoryClientCsvColumn>;
