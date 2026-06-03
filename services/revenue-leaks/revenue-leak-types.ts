import type { RevenueLeakType } from "@prisma/client";

export const REVENUE_LEAK_TYPES = [
  "NO_SHOW_REVENUE",
  "CANCELED_NOT_RECOVERED",
  "STALE_BOOKED_PROOF",
  "MISSING_CONTACT",
  "BOOKING_PATH_BLOCKED",
] as const satisfies readonly RevenueLeakType[];

export function assertNeverRevenueLeakType(value: never): never {
  throw new Error(`Unhandled revenue leak type: ${String(value)}`);
}
