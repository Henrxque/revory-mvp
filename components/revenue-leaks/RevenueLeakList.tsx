import { RevenueLeakCard } from "@/components/revenue-leaks/RevenueLeakCard";
import type {
  RevenueLeakListFilter,
  RevenueLeakListItem,
} from "@/services/revenue-leaks/get-revenue-leak-list";
import type { RevenueLeakCategory } from "@/types/revenue-leak";

type RevenueLeakListProps = Readonly<{
  activeFilter: RevenueLeakListFilter;
  items: RevenueLeakListItem[];
}>;

const sections = [
  {
    category: "FINANCIAL_LEAK",
    empty: "No financial leak signals in this view.",
    title: "Financial leak signals",
  },
  {
    category: "OPERATIONAL_RISK",
    empty: "No operational risks in this view.",
    title: "Operational risks",
  },
  {
    category: "DATA_QUALITY_RISK",
    empty: "No data-quality risks in this view.",
    title: "Data quality",
  },
] as const satisfies ReadonlyArray<{
  category: RevenueLeakCategory;
  empty: string;
  title: string;
}>;

export function RevenueLeakList({ activeFilter, items }: RevenueLeakListProps) {
  if (items.length === 0) {
    return (
      <section className="rev-card-premium rounded-[28px] p-6 text-center">
        <p className="rev-label">No signals visible</p>
        <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
          {getEmptyStateTitle(activeFilter)}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6 text-[color:var(--text-muted)]">
          {getEmptyStateCopy(activeFilter)}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => {
        const sectionItems = items.filter(
          (item) => item.category === section.category,
        );

        if (sectionItems.length === 0) {
          return null;
        }

        return (
          <section key={section.category} className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="rev-label">{section.title}</p>
                <p className="mt-1 text-[12px] text-[color:var(--text-muted)]">
                  {sectionItems.length} active evidence {sectionItems.length === 1 ? "card" : "cards"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {sectionItems.map((item) => (
                <RevenueLeakCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function getEmptyStateTitle(filter: RevenueLeakListFilter) {
  switch (filter) {
    case "RESOLVED":
      return "No resolved signals yet.";
    case "DISMISSED":
      return "No dismissed signals yet.";
    case "FINANCIAL":
      return "No financial leak signals are visible right now.";
    case "OPERATIONAL":
      return "No operational risk signals are visible right now.";
    case "DATA_QUALITY":
      return "No data-quality risks are visible right now.";
    case "HIGH_SEVERITY":
      return "No high-severity signals are visible right now.";
    case "LOW_CONFIDENCE":
      return "No low-confidence signals are visible right now.";
    case "ALL_ACTIVE":
      return "Run a leak read after importing clinic data.";
  }
}

function getEmptyStateCopy(filter: RevenueLeakListFilter) {
  if (filter === "ALL_ACTIVE") {
    return "REVORY will show persisted revenue-risk evidence here after clinic data is imported and the leak read runs.";
  }

  return "Try the Active filter or run a fresh leak read after uploading newer appointment evidence.";
}
