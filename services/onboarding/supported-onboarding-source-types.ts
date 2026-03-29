import { DataSourceType } from "@prisma/client";

export const supportedOnboardingSourceTypes = [
  DataSourceType.APPOINTMENTS_CSV,
  DataSourceType.CLIENTS_CSV,
  DataSourceType.MANUAL_IMPORT,
] as const;

export function isSupportedOnboardingSourceType(
  value: DataSourceType | null | undefined,
): value is (typeof supportedOnboardingSourceTypes)[number] {
  if (!value) {
    return false;
  }

  return supportedOnboardingSourceTypes.includes(
    value as (typeof supportedOnboardingSourceTypes)[number],
  );
}
