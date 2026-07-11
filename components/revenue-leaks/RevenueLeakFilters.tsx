import Link from "next/link";

import type { RevenueLeakListFilter } from "@/services/revenue-leaks/get-revenue-leak-list";

type RevenueLeakFiltersProps = Readonly<{
  activeFilter: RevenueLeakListFilter;
}>;

const filters = [
  {
    key: "ALL_ACTIVE",
    label: "Active",
  },
  {
    key: "FINANCIAL",
    label: "Financial",
  },
  {
    key: "OPERATIONAL",
    label: "Operational",
  },
  {
    key: "DATA_QUALITY",
    label: "Data quality",
  },
  {
    key: "HIGH_SEVERITY",
    label: "High severity",
  },
  {
    key: "LOW_CONFIDENCE",
    label: "Low confidence",
  },
  {
    key: "RESOLVED",
    label: "Resolved",
  },
  {
    key: "DISMISSED",
    label: "Dismissed",
  },
] as const satisfies ReadonlyArray<{
  key: RevenueLeakListFilter;
  label: string;
}>;

export function RevenueLeakFilters({ activeFilter }: RevenueLeakFiltersProps) {
  return (
    <nav
      aria-label="Revenue leak filters"
      className="flex flex-wrap gap-2"
    >
      {filters.map((filter) => {
        const isActive = filter.key === activeFilter;
        const href =
          filter.key === "ALL_ACTIVE"
            ? "/app/revenue-leaks"
            : `/app/revenue-leaks?filter=${filter.key}`;

        return (
          <Link
            key={filter.key}
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${
              isActive
                ? "border-[rgba(67,179,155,0.38)] bg-[rgba(67,179,155,0.15)] text-[color:var(--accent-light)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-[color:var(--border)] bg-[rgba(255,255,255,0.022)] text-[color:var(--text-muted)] hover:border-[rgba(255,255,255,0.16)] hover:text-[color:var(--foreground)]"
            }`}
            href={href}
            prefetch={false}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}
