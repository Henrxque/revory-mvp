import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";

type RevorySectionHeaderProps = Readonly<{
  badgeLabel?: string;
  badgeTone?: "accent" | "real" | "future" | "neutral";
  description?: string;
  eyebrow: string;
  title: string;
}>;

export function RevorySectionHeader({
  badgeLabel,
  badgeTone = "neutral",
  description,
  eyebrow,
  title,
}: RevorySectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 xl:items-end">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
          {eyebrow}
        </p>
        <h3 className="font-[family:var(--font-display)] text-3xl leading-none text-[color:var(--foreground)] md:text-[2.8rem]">
          {title}
        </h3>
        {description ? (
          <p className="max-w-[46rem] text-sm leading-7 text-[color:var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>

      {badgeLabel ? (
        <RevoryStatusBadge tone={badgeTone}>{badgeLabel}</RevoryStatusBadge>
      ) : null}
    </div>
  );
}
