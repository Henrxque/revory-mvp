export function evaluateEntries(input: { entries: Record<string, unknown>[]; job: string; marker: string; window: string }): { passed: boolean; observed: boolean; timestampUtc: string | null };
