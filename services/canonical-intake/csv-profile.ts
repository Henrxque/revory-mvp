export type SafeCsvDelimiter = "," | ";" | "\t";

export type ParsedDelimitedText = {
  delimiter: SafeCsvDelimiter;
  headers: string[];
  rows: string[][];
};

export class CanonicalCsvStructureError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "AMBIGUOUS_DELIMITER"
      | "DUPLICATE_HEADERS"
      | "EMPTY_FILE"
      | "INVALID_ROW_WIDTH"
      | "UNCLOSED_QUOTE",
  ) {
    super(message);
    this.name = "CanonicalCsvStructureError";
  }
}

const SAFE_DELIMITERS: readonly SafeCsvDelimiter[] = [",", ";", "\t"];

function parseWithDelimiter(text: string, delimiter: SafeCsvDelimiter) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) {
    throw new CanonicalCsvStructureError(
      "The CSV contains an unclosed quoted value.",
      "UNCLOSED_QUOTE",
    );
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function detectSafeCsvDelimiter(text: string): SafeCsvDelimiter {
  const normalized = text.replace(/^\uFEFF/, "");
  const candidates = SAFE_DELIMITERS.map((delimiter) => {
    try {
      const rows = parseWithDelimiter(normalized, delimiter).slice(0, 12);
      const widths = rows.map((row) => row.length);
      const width = widths[0] ?? 0;
      const valid = width > 1 && widths.length > 1 && widths.every((value) => value === width);
      return { delimiter, valid, width };
    } catch {
      return { delimiter, valid: false, width: 0 };
    }
  })
    .filter((candidate) => candidate.valid)
    .sort((left, right) => right.width - left.width);

  if (!candidates.length || (candidates[1] && candidates[0].width === candidates[1].width)) {
    throw new CanonicalCsvStructureError(
      "REVORY could not identify one safe, consistent CSV delimiter. Use comma, semicolon or tab with the same column count on every row.",
      "AMBIGUOUS_DELIMITER",
    );
  }

  return candidates[0].delimiter;
}

export function parseCanonicalCsv(text: string): ParsedDelimitedText {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.trim()) {
    throw new CanonicalCsvStructureError("The CSV is empty.", "EMPTY_FILE");
  }

  const delimiter = detectSafeCsvDelimiter(normalized);
  const parsed = parseWithDelimiter(normalized, delimiter);
  const headers = (parsed[0] ?? []).map((header) => header.trim());
  const rows = parsed.slice(1);

  if (!headers.length || !rows.length) {
    throw new CanonicalCsvStructureError(
      "The CSV needs one header row and at least one data row.",
      "EMPTY_FILE",
    );
  }

  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new CanonicalCsvStructureError(
      "Duplicate headers must be resolved before mapping.",
      "DUPLICATE_HEADERS",
    );
  }

  const invalidRow = rows.findIndex((row) => row.length !== headers.length);
  if (invalidRow >= 0) {
    throw new CanonicalCsvStructureError(
      `Row ${invalidRow + 2} has ${rows[invalidRow].length} values but the header has ${headers.length}.`,
      "INVALID_ROW_WIDTH",
    );
  }

  return { delimiter, headers, rows };
}
