export type RevoryCsvTemplateKey = "appointments" | "clients";

export type RevoryCsvUploadStatus = "idle" | "imported" | "error";
export type RevoryCsvValidationSeverity = "error" | "warning";
export type RevoryCsvValidationIssueCode =
  | "file_empty"
  | "invalid_structure"
  | "missing_required_columns"
  | "missing_required_value"
  | "missing_identifier"
  | "empty_data_rows"
  | "invalid_date";
export type RevoryCsvParserWarningCode =
  | "normalized_email"
  | "normalized_phone"
  | "normalized_name"
  | "invalid_optional_date"
  | "invalid_estimated_revenue"
  | "invalid_total_visits"
  | "missing_usable_identifier"
  | "invalid_appointment_status";

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

export type RevoryAssistedImportConfidence = "high" | "medium" | "low" | "none";

export type RevoryAssistedImportMatchStatus =
  | "matched_with_confidence"
  | "suggested_needs_confirmation"
  | "unresolved";

export type RevoryAssistedImportReasonCode =
  | "exact_official_header"
  | "exact_alias_match"
  | "inclusive_alias_match"
  | "shared_token_match"
  | "unresolved_header";

export type RevoryAssistedImportMapping = Record<string, RevoryCsvColumn | null>;

export type RevoryAssistedImportMappingOption = {
  confidence: RevoryAssistedImportConfidence;
  matchStatus: RevoryAssistedImportMatchStatus;
  normalizedSourceHeader: string;
  reason: string;
  reasonCode: RevoryAssistedImportReasonCode;
  sourceHeader: string;
  targetColumn: RevoryCsvColumn | null;
};

export type RevoryAssistedImportTargetOption = {
  column: RevoryCsvColumn;
  isIdentity: boolean;
  isRequired: boolean;
  label: string;
};

export type RevoryAssistedImportPreview = {
  canImport: boolean;
  detectedHeaders: string[];
  duplicateSourceHeaders: string[];
  duplicateTargets: RevoryCsvColumn[];
  exactTemplateMatch: boolean;
  hasDuplicateSourceHeaders: boolean;
  identityColumns: RevoryCsvColumn[];
  mappingOptions: RevoryAssistedImportMappingOption[];
  matchedTargets: RevoryCsvColumn[];
  matchedWithConfidenceCount: number;
  missingIdentityPath: boolean;
  missingRequiredColumns: RevoryCsvColumn[];
  requiredColumns: RevoryCsvColumn[];
  requiredMatchedCount: number;
  suggestedCount: number;
  templateKey: RevoryCsvTemplateKey;
  totalHeaderCount: number;
  unresolvedCount: number;
  unmappedHeaders: string[];
};

export type RevoryAssistedImportDecisionState =
  | "kept_confident_match"
  | "suggested_pending_confirmation"
  | "mapped_by_user"
  | "unmapped";

export type RevoryAssistedImportDecision = {
  decisionState: RevoryAssistedImportDecisionState;
  finalTargetColumn: RevoryCsvColumn | null;
  normalizedSourceHeader: string;
  sourceHeader: string;
  systemConfidence: RevoryAssistedImportConfidence;
  systemMatchStatus: RevoryAssistedImportMatchStatus;
  systemReason: string;
  systemReasonCode: RevoryAssistedImportReasonCode;
  systemSuggestedColumn: RevoryCsvColumn | null;
};

export type RevoryAssistedImportConfirmationDraft = {
  canProceed: boolean;
  decisions: RevoryAssistedImportDecision[];
  duplicateSourceHeaders: string[];
  duplicateTargets: RevoryCsvColumn[];
  keptConfidentMatchCount: number;
  mappedByUserCount: number;
  missingIdentityPath: boolean;
  missingRequiredColumns: RevoryCsvColumn[];
  requiredMatchedCount: number;
  requiredTotalCount: number;
  suggestedPendingConfirmationCount: number;
  templateKey: RevoryCsvTemplateKey;
  unmappedCount: number;
};

export type RevoryAssistedImportExecutionMappingSummary = {
  keptConfidentMatchCount: number;
  mappedByUserCount: number;
  suggestedPendingConfirmationCount: number;
  unmappedCount: number;
};

export type RevoryAssistedImportPayload = {
  detectedHeaders: string[];
  mapping: RevoryAssistedImportMapping;
  preview: RevoryAssistedImportPreview;
  templateKey: RevoryCsvTemplateKey;
};

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

export type RevoryCsvValidationIssue = {
  code: RevoryCsvValidationIssueCode;
  column?: string;
  lineNumber?: number;
  message: string;
  severity: RevoryCsvValidationSeverity;
};

export type RevoryCsvStructureSchema<TColumn extends string> = {
  atLeastOneOf?: readonly TColumn[];
  optionalDateColumns?: readonly TColumn[];
  requiredColumns: readonly TColumn[];
  requiredDateColumns?: readonly TColumn[];
};

export type RevoryCsvStructuralValidationResult = {
  accepted: boolean;
  detectedRowCount: number;
  errors: RevoryCsvValidationIssue[];
  headerColumns: string[];
  usefulRowCount: number;
  warnings: RevoryCsvValidationIssue[];
};

export type RevoryCsvUploadActionState = {
  fileName?: string;
  failedRows?: Array<{
    lineNumber: number;
    reasons: string[];
  }>;
  importSummary?: {
    createdAppointmentCount: number;
    createdClientCount: number;
    errorRows: number;
    persistedAppointmentCount: number;
    persistedClientCount: number;
    successRows: number;
    totalRows: number;
    updatedAppointmentCount: number;
    updatedClientCount: number;
  };
  mappingExecutionSummary?: RevoryAssistedImportExecutionMappingSummary;
  message?: string;
  importedAt?: string;
  requiresReauth?: boolean;
  warnings?: string[];
  status: RevoryCsvUploadStatus;
};

export const initialRevoryCsvUploadActionState: RevoryCsvUploadActionState = {
  status: "idle",
};

export type RevoryCsvRawRow<TColumn extends string> = {
  lineNumber: number;
  values: Partial<Record<TColumn, string>>;
};

export type RevoryCsvParserWarning = {
  code: RevoryCsvParserWarningCode;
  lineNumber?: number;
  message: string;
};

export type RevoryCsvInvalidRow<TRawRow, TParsedRow> = {
  lineNumber: number;
  parsedRow: TParsedRow;
  rawRow: TRawRow;
  reasons: string[];
};

export type RevoryCsvValidRow<TRawRow, TParsedRow, TNormalizedRow> = {
  lineNumber: number;
  normalizedRow: TNormalizedRow;
  parsedRow: TParsedRow;
  rawRow: TRawRow;
  warnings: string[];
};

export type RevoryCsvParseResult<TRawRow, TParsedRow, TNormalizedRow> = {
  invalidRowCount: number;
  invalidRows: Array<RevoryCsvInvalidRow<TRawRow, TParsedRow>>;
  validRowCount: number;
  validRows: Array<RevoryCsvValidRow<TRawRow, TParsedRow, TNormalizedRow>>;
  warnings: RevoryCsvParserWarning[];
};

export type RevoryAppointmentCsvRawRow = RevoryCsvRawRow<RevoryAppointmentCsvColumn>;

export type RevoryAppointmentParsedRow = {
  appointmentExternalId: string | null;
  bookedAt: string | null;
  canceledAt: string | null;
  clientEmail: string | null;
  clientExternalId: string | null;
  clientFullName: string | null;
  clientPhone: string | null;
  estimatedRevenue: string | null;
  locationName: string | null;
  providerName: string | null;
  scheduledAt: string | null;
  serviceName: string | null;
  sourceNotes: string | null;
  status: string | null;
};

export type RevoryAppointmentNormalizedRow = {
  appointmentExternalId: string;
  bookedAt: Date | null;
  canceledAt: Date | null;
  clientEmail: string | null;
  clientExternalId: string | null;
  clientFullName: string;
  clientPhone: string | null;
  estimatedRevenue: number | null;
  locationName: string | null;
  providerName: string | null;
  scheduledAt: Date;
  serviceName: string | null;
  sourceNotes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW";
};

export type RevoryClientCsvRawRow = RevoryCsvRawRow<RevoryClientCsvColumn>;

export type RevoryClientParsedRow = {
  email: string | null;
  externalId: string | null;
  fullName: string | null;
  lastVisitAt: string | null;
  notes: string | null;
  phone: string | null;
  tags: string | null;
  totalVisits: string | null;
};

export type RevoryClientNormalizedRow = {
  email: string | null;
  externalId: string | null;
  fullName: string;
  lastVisitAt: Date | null;
  notes: string | null;
  phone: string | null;
  tags: string[];
  totalVisits: number | null;
};
