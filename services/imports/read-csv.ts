import type { RevoryCsvColumn } from "@/types/imports";

export type RevoryCsvDocumentRow<TColumn extends string> = {
  hasUsefulData: boolean;
  hasUnclosedQuote: boolean;
  lineNumber: number;
  valueCount: number;
  values: Partial<Record<TColumn, string>>;
};

export type RevoryCsvDocument<TColumn extends string> = {
  headerColumns: TColumn[];
  headerHasUnclosedQuote: boolean;
  rows: Array<RevoryCsvDocumentRow<TColumn>>;
};

export function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = "";
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const currentCharacter = line[index];
    const nextCharacter = line[index + 1];

    if (currentCharacter === '"') {
      if (isInsideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
        continue;
      }

      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (currentCharacter === "," && !isInsideQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += currentCharacter;
  }

  values.push(currentValue);

  return {
    hasUnclosedQuote: isInsideQuotes,
    values: values.map((value) => value.trim()),
  };
}

export function readCsvDocument<TColumn extends string = RevoryCsvColumn>(
  csvText: string,
): RevoryCsvDocument<TColumn> {
  const normalizedText = csvText.replace(/^\uFEFF/, "");
  const rawLines = normalizedText.split(/\r?\n/);
  const [headerLine = ""] = rawLines;
  const parsedHeader = parseCsvLine(headerLine);
  const headerColumns = parsedHeader.values as TColumn[];
  const dataLines = rawLines.slice(1);

  while (dataLines.length > 0 && dataLines[dataLines.length - 1].trim() === "") {
    dataLines.pop();
  }

  const rows = dataLines.map((line, lineIndex) => {
    const parsedLine = parseCsvLine(line);
    const values = Object.fromEntries(
      headerColumns.map((column, columnIndex) => [
        column,
        parsedLine.values[columnIndex] ?? "",
      ]),
    ) as Partial<Record<TColumn, string>>;
    const hasUsefulData = (Object.values(values) as Array<string | undefined>).some(
      (value) => (value ?? "").trim().length > 0,
    );

    return {
      hasUsefulData,
      hasUnclosedQuote: parsedLine.hasUnclosedQuote,
      lineNumber: lineIndex + 2,
      valueCount: parsedLine.values.length,
      values,
    };
  });

  return {
    headerColumns,
    headerHasUnclosedQuote: parsedHeader.hasUnclosedQuote,
    rows,
  };
}
