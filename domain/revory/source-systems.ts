export const revorySourceSystems = [
  ["manual-export", "Spreadsheet / manual export"],
  ["buildertrend", "Buildertrend"],
  ["jobber", "Jobber"],
  ["servicetitan", "ServiceTitan"],
  ["housecall-pro", "Housecall Pro"],
  ["jobtread", "JobTread"],
  ["acculynx", "AccuLynx"],
  ["procore", "Procore"],
  ["quickbooks", "QuickBooks"],
  ["other-system-export", "Other system export"],
] as const;

export type RevorySourceSystem = (typeof revorySourceSystems)[number][0];

export type SourceSystemDetection = {
  confidence: "HIGH" | "MEDIUM" | "LOW";
  label: string;
  matchedSignals: string[];
  sourceSystem: Exclude<RevorySourceSystem, "manual-export" | "other-system-export"> | null;
};

type DetectionInput = { fileName: string; headers: readonly string[] };

const vendorProfiles: Array<{
  fileTokens: string[];
  headerSignals: string[];
  label: string;
  sourceSystem: NonNullable<SourceSystemDetection["sourceSystem"]>;
}> = [
  { sourceSystem: "buildertrend", label: "Buildertrend", fileTokens: ["buildertrend"], headerSignals: ["proposal #", "buildertrend id", "lead opportunity id", "job #", "proposal status"] },
  { sourceSystem: "jobber", label: "Jobber", fileTokens: ["jobber"], headerSignals: ["quote #", "client #", "jobber id", "quote status", "property address"] },
  { sourceSystem: "servicetitan", label: "ServiceTitan", fileTokens: ["servicetitan", "service-titan"], headerSignals: ["estimate id", "business unit", "technician name", "sold on", "service location id"] },
  { sourceSystem: "housecall-pro", label: "Housecall Pro", fileTokens: ["housecall", "hcp-export"], headerSignals: ["estimate number", "hcp id", "employee name", "customer tags", "job tags"] },
  { sourceSystem: "jobtread", label: "JobTread", fileTokens: ["jobtread"], headerSignals: ["bid id", "jobtread id", "bid status", "bid total", "cost code"] },
  { sourceSystem: "acculynx", label: "AccuLynx", fileTokens: ["acculynx"], headerSignals: ["job file id", "acculynx id", "estimate number", "assigned sales rep", "trade type"] },
  { sourceSystem: "procore", label: "Procore", fileTokens: ["procore"], headerSignals: ["procore project id", "prime contract #", "commitment #", "contract company", "project number"] },
  { sourceSystem: "quickbooks", label: "QuickBooks", fileTokens: ["quickbooks", "qbo-export", "qbd-export"], headerSignals: ["transaction type", "txn date", "invoice no.", "customer/project", "memo/description"] },
];

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function detectSourceSystem(inputs: readonly DetectionInput[]): SourceSystemDetection {
  const normalizedFiles = inputs.map((input) => ({
    fileName: normalize(input.fileName),
    headers: input.headers.map(normalize),
  }));
  const allHeaders = new Set(normalizedFiles.flatMap((file) => file.headers));
  const ranked = vendorProfiles
    .map((profile) => {
      const matchedSignals = new Set<string>();
      let score = 0;
      for (const token of profile.fileTokens) {
        if (normalizedFiles.some((file) => file.fileName.includes(normalize(token)))) {
          score += 8;
          matchedSignals.add(`file name contains “${token}”`);
        }
      }
      for (const signal of profile.headerSignals) {
        const normalizedSignal = normalize(signal);
        if ([...allHeaders].some((header) => header === normalizedSignal || header.includes(normalizedSignal))) {
          score += 2;
          matchedSignals.add(`column “${signal}”`);
        }
      }
      return { ...profile, matchedSignals: [...matchedSignals], score };
    })
    .sort((left, right) => right.score - left.score);
  const first = ranked[0];
  const second = ranked[1];
  if (!first || first.score < 4 || first.score - (second?.score ?? 0) < 2) {
    return {
      confidence: "LOW",
      label: "Source not identified",
      matchedSignals: [],
      sourceSystem: null,
    };
  }
  return {
    confidence: first.score >= 8 ? "HIGH" : "MEDIUM",
    label: first.label,
    matchedSignals: first.matchedSignals.slice(0, 4),
    sourceSystem: first.sourceSystem,
  };
}
