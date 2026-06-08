import {
  buildCsvColumnProfiles,
  calculateCsvMappingConfidence,
  suggestDeterministicCsvColumnMappings,
  type CsvColumnProfile,
} from "@/services/imports/csv-column-mapping";
import {
  classifyCsvDatasetType,
  type CsvDatasetClassification,
} from "@/services/imports/csv-dataset-type";
import {
  buildCsvDataQualityCheck,
  type CsvDataQualityCheck,
} from "@/services/imports/csv-data-quality-check";
import { parseCsvLine } from "@/services/imports/read-csv";

export type CsvDelimiter = "," | ";" | "\t" | "|";

export type CsvDeterministicProfile = {
  columns: string[];
  delimiter: CsvDelimiter;
  rowCount: number;
  sampleRows: Array<Record<string, string>>;
};

export type CsvMappingFallbackResult = {
  classification: CsvDatasetClassification;
  dataQuality: CsvDataQualityCheck;
  mappingConfidence: number;
  mappingSuggestions: ReturnType<typeof suggestDeterministicCsvColumnMappings>;
  profile: CsvDeterministicProfile;
  columnProfiles: CsvColumnProfile[];
};

const DELIMITERS: readonly CsvDelimiter[] = [",", ";", "\t", "|"];
const DEFAULT_SAMPLE_ROW_LIMIT = 25;

function countDelimiterOutsideQuotes(line: string, delimiter: CsvDelimiter) {
  let count = 0;
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && character === delimiter) {
      count += 1;
    }
  }

  return count;
}

export function inferCsvDelimiter(csvText: string): CsvDelimiter {
  const candidateLines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 5);

  if (candidateLines.length === 0) {
    return ",";
  }

  const ranked = DELIMITERS.map((delimiter) => {
    const counts = candidateLines.map((line) =>
      countDelimiterOutsideQuotes(line, delimiter),
    );
    const positiveCounts = counts.filter((count) => count > 0);
    const consistent =
      positiveCounts.length > 0 &&
      positiveCounts.every((count) => count === positiveCounts[0]);

    return {
      delimiter,
      score:
        positiveCounts.reduce((total, count) => total + count, 0) +
        (consistent ? 10 : 0),
    };
  }).sort((left, right) => right.score - left.score);

  return ranked[0]?.score > 0 ? ranked[0].delimiter : ",";
}

function normalizeLineForExistingParser(
  line: string,
  delimiter: CsvDelimiter,
) {
  if (delimiter === ",") {
    return line;
  }

  let normalized = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      normalized += character;

      if (insideQuotes && nextCharacter === '"') {
        normalized += nextCharacter;
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    normalized += !insideQuotes && character === delimiter ? "," : character;
  }

  return normalized;
}

export function profileCsvDataset(
  csvText: string,
  sampleRowLimit = DEFAULT_SAMPLE_ROW_LIMIT,
): CsvDeterministicProfile {
  const normalizedText = csvText.replace(/^\uFEFF/, "");
  const lines = normalizedText.split(/\r?\n/);
  const delimiter = inferCsvDelimiter(normalizedText);
  const [headerLine = "", ...dataLines] = lines;
  const parsedHeader = parseCsvLine(
    normalizeLineForExistingParser(headerLine, delimiter),
  );
  const columns = parsedHeader.values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const usefulLines = dataLines.filter((line) => line.trim().length > 0);
  const sampleRows = usefulLines.slice(0, sampleRowLimit).map((line) => {
    const parsed = parseCsvLine(normalizeLineForExistingParser(line, delimiter));

    return Object.fromEntries(
      columns.map((column, index) => [column, parsed.values[index] ?? ""]),
    );
  });

  return {
    columns,
    delimiter,
    rowCount: usefulLines.length,
    sampleRows,
  };
}

export function buildDeterministicCsvMappingFallback(
  csvText: string,
): CsvMappingFallbackResult {
  const profile = profileCsvDataset(csvText);
  const columnProfiles = buildCsvColumnProfiles(
    profile.columns,
    profile.sampleRows,
  );
  const mappingSuggestions =
    suggestDeterministicCsvColumnMappings(columnProfiles);
  const mappingConfidence =
    calculateCsvMappingConfidence(mappingSuggestions);
  const classification = classifyCsvDatasetType({
    headers: profile.columns,
    mappingSuggestions,
  });
  const dataQuality = buildCsvDataQualityCheck({
    classification,
    mappingConfidence,
    mappingSuggestions,
    profiles: columnProfiles,
  });

  return {
    classification,
    columnProfiles,
    dataQuality,
    mappingConfidence,
    mappingSuggestions,
    profile,
  };
}
