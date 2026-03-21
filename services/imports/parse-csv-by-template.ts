import { parseAppointmentsCsv } from "@/services/imports/parse-appointments-csv";
import { parseClientsCsv } from "@/services/imports/parse-clients-csv";
import type {
  RevoryAppointmentCsvRawRow,
  RevoryAppointmentNormalizedRow,
  RevoryAppointmentParsedRow,
  RevoryClientCsvRawRow,
  RevoryClientNormalizedRow,
  RevoryClientParsedRow,
  RevoryCsvParseResult,
  RevoryCsvTemplateKey,
} from "@/types/imports";

type RevoryTemplateParseResultMap = {
  appointments: RevoryCsvParseResult<
    RevoryAppointmentCsvRawRow,
    RevoryAppointmentParsedRow,
    RevoryAppointmentNormalizedRow
  >;
  clients: RevoryCsvParseResult<
    RevoryClientCsvRawRow,
    RevoryClientParsedRow,
    RevoryClientNormalizedRow
  >;
};

export function parseCsvByTemplate<TKey extends RevoryCsvTemplateKey>(
  csvText: string,
  templateKey: TKey,
): RevoryTemplateParseResultMap[TKey] {
  if (templateKey === "appointments") {
    return parseAppointmentsCsv(csvText) as RevoryTemplateParseResultMap[TKey];
  }

  return parseClientsCsv(csvText) as RevoryTemplateParseResultMap[TKey];
}
