export type RevoryCsvTemplateKey = "appointments" | "clients";

export type RevoryCsvUploadStatus = "idle" | "success" | "error";

export type RevoryAppointmentCsvRequiredColumn =
  | "appointment_external_id"
  | "client_full_name"
  | "scheduled_at"
  | "status";

export type RevoryAppointmentCsvClientIdentifierColumn =
  | "client_external_id"
  | "client_email"
  | "client_phone";

export type RevoryAppointmentCsvOptionalColumn =
  | RevoryAppointmentCsvClientIdentifierColumn
  | "service_name"
  | "provider_name"
  | "estimated_revenue"
  | "booked_at"
  | "canceled_at"
  | "location_name"
  | "source_notes";

export type RevoryAppointmentCsvColumn =
  | RevoryAppointmentCsvRequiredColumn
  | RevoryAppointmentCsvOptionalColumn;

export type RevoryClientCsvRequiredColumn = "full_name";

export type RevoryClientCsvIdentifierColumn =
  | "external_id"
  | "email"
  | "phone";

export type RevoryClientCsvOptionalColumn =
  | RevoryClientCsvIdentifierColumn
  | "last_visit_at"
  | "total_visits"
  | "tags"
  | "notes";

export type RevoryClientCsvColumn =
  | RevoryClientCsvRequiredColumn
  | RevoryClientCsvOptionalColumn;

export type RevoryCsvColumn = RevoryAppointmentCsvColumn | RevoryClientCsvColumn;

export type RevoryCsvColumnAliases<TColumn extends string> = Partial<
  Record<TColumn, readonly string[]>
>;

export type RevoryCsvTemplateDefinition<
  TKey extends RevoryCsvTemplateKey,
  TColumn extends string,
> = {
  atLeastOneOf?: readonly TColumn[];
  key: TKey;
  fileName: string;
  name: string;
  optionalColumns: readonly TColumn[];
  requiredColumns: readonly TColumn[];
  aliases?: RevoryCsvColumnAliases<TColumn>;
};

export type RevoryCsvUploadActionState = {
  fileName?: string;
  message?: string;
  receivedAt?: string;
  status: RevoryCsvUploadStatus;
};
