import {
  getRevoryCsvTemplateColumns,
  revoryCsvTemplateDefinitions,
} from "@/lib/imports/csv-template-definitions";
import { readCsvDocument } from "@/services/imports/read-csv";
import type {
  RevoryAssistedImportConfirmationDraft,
  RevoryAssistedImportConfidence,
  RevoryAssistedImportDecision,
  RevoryAssistedImportExecutionMappingSummary,
  RevoryAssistedImportMapping,
  RevoryAssistedImportMappingOption,
  RevoryAssistedImportMatchStatus,
  RevoryAssistedImportPayload,
  RevoryAssistedImportPreview,
  RevoryAssistedImportReasonCode,
  RevoryAssistedImportTargetOption,
  RevoryCsvColumn,
  RevoryCsvTemplateKey,
} from "@/types/imports";

type MatchLabel = {
  compact: string;
  kind: "official" | "alias";
  normalized: string;
};

type MatchCandidate = {
  confidence: RevoryAssistedImportConfidence;
  reasonCode: RevoryAssistedImportReasonCode;
  score: number;
  sourceHeader: string;
  targetColumn: RevoryCsvColumn;
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactHeader(value: string) {
  return normalizeHeader(value).replaceAll(" ", "");
}

function buildReasonText(reasonCode: RevoryAssistedImportReasonCode) {
  switch (reasonCode) {
    case "exact_official_header":
      return "Header matches the official REVORY field name exactly.";
    case "exact_alias_match":
      return "Header matches a known safe alias for this REVORY field.";
    case "inclusive_alias_match":
      return "Header partially matches an official field or known alias and should be confirmed.";
    case "shared_token_match":
      return "Header shares key tokens with the REVORY field and needs confirmation.";
    default:
      return "REVORY could not map this header safely yet.";
  }
}

function getMatchStatus(
  confidence: RevoryAssistedImportConfidence,
): RevoryAssistedImportMatchStatus {
  if (confidence === "high") {
    return "matched_with_confidence";
  }

  if (confidence === "medium" || confidence === "low") {
    return "suggested_needs_confirmation";
  }

  return "unresolved";
}

function buildTargetLabels(targetColumn: RevoryCsvColumn, aliases: readonly string[] = []) {
  const labelEntries: MatchLabel[] = [
    {
      compact: compactHeader(targetColumn),
      kind: "official",
      normalized: normalizeHeader(targetColumn),
    },
  ];

  aliases.forEach((alias) => {
    labelEntries.push({
      compact: compactHeader(alias),
      kind: "alias",
      normalized: normalizeHeader(alias),
    });
  });

  return labelEntries.filter(
    (entry, index, entries) =>
      entry.normalized.length > 0 &&
      entries.findIndex(
        (candidate) =>
          candidate.normalized === entry.normalized &&
          candidate.compact === entry.compact &&
          candidate.kind === entry.kind,
      ) === index,
  );
}

function getTemplateAliases(templateKey: RevoryCsvTemplateKey) {
  return (revoryCsvTemplateDefinitions[templateKey].aliases ??
    {}) as Partial<Record<RevoryCsvColumn, readonly string[]>>;
}

function getMatchCandidate(
  sourceHeader: string,
  targetColumn: RevoryCsvColumn,
  aliases: readonly string[] = [],
): MatchCandidate | null {
  const normalizedSource = normalizeHeader(sourceHeader);
  const compactSource = compactHeader(sourceHeader);
  const labelEntries = buildTargetLabels(targetColumn, aliases);

  const exactOfficialMatch = labelEntries.find(
    (entry) =>
      entry.kind === "official" &&
      (entry.normalized === normalizedSource || entry.compact === compactSource),
  );

  if (exactOfficialMatch) {
    return {
      confidence: "high",
      reasonCode: "exact_official_header",
      score: 100,
      sourceHeader,
      targetColumn,
    };
  }

  const exactAliasMatch = labelEntries.find(
    (entry) =>
      entry.kind === "alias" &&
      (entry.normalized === normalizedSource || entry.compact === compactSource),
  );

  if (exactAliasMatch) {
    return {
      confidence: "high",
      reasonCode: "exact_alias_match",
      score: 96,
      sourceHeader,
      targetColumn,
    };
  }

  const inclusiveMatch = labelEntries.find((entry) => {
    if (entry.normalized.length < 4) {
      return false;
    }

    return (
      normalizedSource.includes(entry.normalized) ||
      entry.normalized.includes(normalizedSource) ||
      compactSource.includes(entry.compact) ||
      entry.compact.includes(compactSource)
    );
  });

  if (inclusiveMatch) {
    return {
      confidence: "medium",
      reasonCode: "inclusive_alias_match",
      score: inclusiveMatch.kind === "official" ? 76 : 72,
      sourceHeader,
      targetColumn,
    };
  }

  const sourceTokens = new Set(normalizedSource.split(" ").filter(Boolean));
  const targetTokens = new Set(normalizeHeader(targetColumn).split(" ").filter(Boolean));
  const sharedTokenCount = [...sourceTokens].filter((token) => targetTokens.has(token)).length;

  if (sharedTokenCount > 0) {
    return {
      confidence: "low",
      reasonCode: "shared_token_match",
      score: 40 + sharedTokenCount * 8,
      sourceHeader,
      targetColumn,
    };
  }

  return null;
}

function buildUnresolvedOption(sourceHeader: string): RevoryAssistedImportMappingOption {
  return {
    confidence: "none",
    matchStatus: "unresolved",
    normalizedSourceHeader: normalizeHeader(sourceHeader),
    reason: buildReasonText("unresolved_header"),
    reasonCode: "unresolved_header",
    sourceHeader,
    targetColumn: null,
  };
}

function getDuplicateSourceHeaders(detectedHeaders: readonly string[]) {
  const counts = new Map<string, number>();

  detectedHeaders.forEach((header) => {
    counts.set(header, (counts.get(header) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([header]) => header);
}

function getDuplicateTargets(mapping: RevoryAssistedImportMapping): RevoryCsvColumn[] {
  const counts = new Map<RevoryCsvColumn, number>();

  Object.values(mapping).forEach((targetColumn) => {
    if (!targetColumn) {
      return;
    }

    counts.set(targetColumn, (counts.get(targetColumn) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([targetColumn]) => targetColumn);
}

export function formatImportColumnLabel(value: string) {
  return value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function getAssistedImportTargetOptions(
  templateKey: RevoryCsvTemplateKey,
): RevoryAssistedImportTargetOption[] {
  const definition = revoryCsvTemplateDefinitions[templateKey];
  const requiredSet = new Set<string>(definition.requiredColumns as readonly string[]);
  const identitySet = new Set<string>((definition.atLeastOneOf ?? []) as readonly string[]);

  return getRevoryCsvTemplateColumns(templateKey).map((column) => ({
    column,
    isIdentity: identitySet.has(column),
    isRequired: requiredSet.has(column),
    label: formatImportColumnLabel(column),
  }));
}

export function extractDetectedCsvHeaders(csvText: string) {
  return readCsvDocument<string>(csvText).headerColumns
    .map((header) => header.trim())
    .filter((header) => header.length > 0);
}

export function buildAssistedImportSuggestions(
  templateKey: RevoryCsvTemplateKey,
  detectedHeaders: readonly string[],
): RevoryAssistedImportMapping {
  const aliases = getTemplateAliases(templateKey);
  const targetColumns = getRevoryCsvTemplateColumns(templateKey);
  const candidates: MatchCandidate[] = [];

  detectedHeaders.forEach((sourceHeader) => {
    targetColumns.forEach((targetColumn) => {
      const candidate = getMatchCandidate(sourceHeader, targetColumn, aliases[targetColumn] ?? []);

      if (candidate) {
        candidates.push(candidate);
      }
    });
  });

  candidates.sort((left, right) => right.score - left.score);

  const mapping: RevoryAssistedImportMapping = Object.fromEntries(
    detectedHeaders.map((header) => [header, null]),
  );
  const assignedHeaders = new Set<string>();
  const assignedTargets = new Set<RevoryCsvColumn>();

  candidates.forEach((candidate) => {
    if (assignedHeaders.has(candidate.sourceHeader) || assignedTargets.has(candidate.targetColumn)) {
      return;
    }

    mapping[candidate.sourceHeader] = candidate.targetColumn;
    assignedHeaders.add(candidate.sourceHeader);
    assignedTargets.add(candidate.targetColumn);
  });

  return mapping;
}

export function buildAssistedImportPreview(
  templateKey: RevoryCsvTemplateKey,
  detectedHeaders: readonly string[],
  mapping: RevoryAssistedImportMapping,
): RevoryAssistedImportPreview {
  const definition = revoryCsvTemplateDefinitions[templateKey];
  const aliases = getTemplateAliases(templateKey);
  const duplicateSourceHeaders = getDuplicateSourceHeaders(detectedHeaders);
  const duplicateTargets = getDuplicateTargets(mapping);
  const mappingOptions = detectedHeaders.map((sourceHeader) => {
    const targetColumn = mapping[sourceHeader] ?? null;

    if (!targetColumn) {
      return buildUnresolvedOption(sourceHeader);
    }

    const candidate = getMatchCandidate(
      sourceHeader,
      targetColumn,
      aliases[targetColumn] ?? [],
    );

    const confidence = candidate?.confidence ?? "low";
    const reasonCode = candidate?.reasonCode ?? "shared_token_match";

    return {
      confidence,
      matchStatus: getMatchStatus(confidence),
      normalizedSourceHeader: normalizeHeader(sourceHeader),
      reason: buildReasonText(reasonCode),
      reasonCode,
      sourceHeader,
      targetColumn,
    } satisfies RevoryAssistedImportMappingOption;
  });

  const matchedTargets = [...new Set(Object.values(mapping).filter(Boolean))] as RevoryCsvColumn[];
  const requiredColumns = [...definition.requiredColumns] as RevoryCsvColumn[];
  const missingRequiredColumns = requiredColumns.filter(
    (requiredColumn) => !matchedTargets.includes(requiredColumn),
  );
  const identityColumns = [...(definition.atLeastOneOf ?? [])] as RevoryCsvColumn[];
  const missingIdentityPath =
    identityColumns.length > 0 &&
    !identityColumns.some((identityColumn) => matchedTargets.includes(identityColumn));
  const exactTemplateColumns = getRevoryCsvTemplateColumns(templateKey);
  const exactTemplateMatch =
    detectedHeaders.length === exactTemplateColumns.length &&
    exactTemplateColumns.every((header) => detectedHeaders.includes(header));
  const matchedWithConfidenceCount = mappingOptions.filter(
    (option) => option.matchStatus === "matched_with_confidence",
  ).length;
  const suggestedCount = mappingOptions.filter(
    (option) => option.matchStatus === "suggested_needs_confirmation",
  ).length;
  const unresolvedCount = mappingOptions.filter(
    (option) => option.matchStatus === "unresolved",
  ).length;

  return {
    canImport:
      detectedHeaders.length > 0 &&
      duplicateSourceHeaders.length === 0 &&
      duplicateTargets.length === 0 &&
      missingRequiredColumns.length === 0 &&
      !missingIdentityPath,
    detectedHeaders: [...detectedHeaders],
    duplicateSourceHeaders,
    duplicateTargets,
    exactTemplateMatch,
    hasDuplicateSourceHeaders: duplicateSourceHeaders.length > 0,
    identityColumns,
    mappingOptions,
    matchedTargets,
    matchedWithConfidenceCount,
    missingIdentityPath,
    missingRequiredColumns,
    requiredColumns,
    requiredMatchedCount: requiredColumns.length - missingRequiredColumns.length,
    suggestedCount,
    templateKey,
    totalHeaderCount: detectedHeaders.length,
    unresolvedCount,
    unmappedHeaders: mappingOptions
      .filter((option) => option.targetColumn === null)
      .map((option) => option.sourceHeader),
  };
}

export function buildAssistedImportConfirmationDraft(
  initialPreview: RevoryAssistedImportPreview,
  currentPreview: RevoryAssistedImportPreview,
): RevoryAssistedImportConfirmationDraft {
  const currentOptionsBySourceHeader = new Map(
    currentPreview.mappingOptions.map((option) => [option.sourceHeader, option]),
  );

  const decisions = initialPreview.mappingOptions.map((initialOption) => {
    const currentOption =
      currentOptionsBySourceHeader.get(initialOption.sourceHeader) ?? initialOption;
    const finalTargetColumn = currentOption.targetColumn;
    let decisionState: RevoryAssistedImportDecision["decisionState"] = "unmapped";

    if (finalTargetColumn === null) {
      decisionState = "unmapped";
    } else if (initialOption.targetColumn !== finalTargetColumn) {
      decisionState = "mapped_by_user";
    } else if (initialOption.matchStatus === "matched_with_confidence") {
      decisionState = "kept_confident_match";
    } else {
      decisionState = "suggested_pending_confirmation";
    }

    return {
      decisionState,
      finalTargetColumn,
      normalizedSourceHeader: initialOption.normalizedSourceHeader,
      sourceHeader: initialOption.sourceHeader,
      systemConfidence: initialOption.confidence,
      systemMatchStatus: initialOption.matchStatus,
      systemReason: initialOption.reason,
      systemReasonCode: initialOption.reasonCode,
      systemSuggestedColumn: initialOption.targetColumn,
    } satisfies RevoryAssistedImportDecision;
  });

  return {
    canProceed:
      currentPreview.duplicateSourceHeaders.length === 0 &&
      currentPreview.duplicateTargets.length === 0 &&
      currentPreview.missingRequiredColumns.length === 0 &&
      !currentPreview.missingIdentityPath,
    decisions,
    duplicateSourceHeaders: currentPreview.duplicateSourceHeaders,
    duplicateTargets: currentPreview.duplicateTargets,
    keptConfidentMatchCount: decisions.filter(
      (decision) => decision.decisionState === "kept_confident_match",
    ).length,
    mappedByUserCount: decisions.filter(
      (decision) => decision.decisionState === "mapped_by_user",
    ).length,
    missingIdentityPath: currentPreview.missingIdentityPath,
    missingRequiredColumns: currentPreview.missingRequiredColumns,
    requiredMatchedCount: currentPreview.requiredMatchedCount,
    requiredTotalCount: currentPreview.requiredColumns.length,
    suggestedPendingConfirmationCount: decisions.filter(
      (decision) => decision.decisionState === "suggested_pending_confirmation",
    ).length,
    templateKey: currentPreview.templateKey,
    unmappedCount: decisions.filter((decision) => decision.decisionState === "unmapped")
      .length,
  };
}

export function buildAssistedImportMappingFromConfirmationDraft(
  templateKey: RevoryCsvTemplateKey,
  draft: RevoryAssistedImportConfirmationDraft,
): RevoryAssistedImportMapping {
  const validTargetColumns = new Set(getRevoryCsvTemplateColumns(templateKey));

  return Object.fromEntries(
    draft.decisions.map((decision) => [
      decision.sourceHeader,
      decision.finalTargetColumn && validTargetColumns.has(decision.finalTargetColumn)
        ? decision.finalTargetColumn
        : null,
    ]),
  );
}

export function buildAssistedImportExecutionMappingSummary(
  draft: RevoryAssistedImportConfirmationDraft,
): RevoryAssistedImportExecutionMappingSummary {
  return {
    keptConfidentMatchCount: draft.keptConfidentMatchCount,
    mappedByUserCount: draft.mappedByUserCount,
    suggestedPendingConfirmationCount: draft.suggestedPendingConfirmationCount,
    unmappedCount: draft.unmappedCount,
  };
}

function escapeCsvValue(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function createMappedCsvText(
  templateKey: RevoryCsvTemplateKey,
  csvText: string,
  mapping: RevoryAssistedImportMapping,
) {
  const document = readCsvDocument<string>(csvText);
  const targetColumns = getRevoryCsvTemplateColumns(templateKey);
  const sourceHeaderByTarget = new Map<RevoryCsvColumn, string>();

  Object.entries(mapping).forEach(([sourceHeader, targetColumn]) => {
    if (targetColumn && !sourceHeaderByTarget.has(targetColumn)) {
      sourceHeaderByTarget.set(targetColumn, sourceHeader);
    }
  });

  const lines = [
    targetColumns.map((targetColumn) => escapeCsvValue(targetColumn)).join(","),
    ...document.rows.map((row) =>
      targetColumns
        .map((targetColumn) => {
          const sourceHeader = sourceHeaderByTarget.get(targetColumn);
          const value = sourceHeader ? row.values[sourceHeader] ?? "" : "";

          return escapeCsvValue(value);
        })
        .join(","),
    ),
  ];

  return lines.join("\n");
}

export function buildAssistedImportPayloadFromCsv(
  templateKey: RevoryCsvTemplateKey,
  csvText: string,
): RevoryAssistedImportPayload {
  const detectedHeaders = extractDetectedCsvHeaders(csvText);
  const mapping = buildAssistedImportSuggestions(templateKey, detectedHeaders);

  return {
    detectedHeaders,
    mapping,
    preview: buildAssistedImportPreview(templateKey, detectedHeaders, mapping),
    templateKey,
  };
}
