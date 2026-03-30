import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";

type RevoryMetricCardProps = Readonly<{
  description: string;
  eyebrow?: string;
  tone?: "accent" | "real" | "future" | "neutral";
  title: string;
  value: string;
}>;

export function RevoryMetricCard({
  description,
  eyebrow,
  tone = "neutral",
  title,
  value,
}: RevoryMetricCardProps) {
  return (
    <div className="rev-card rounded-2xl p-5">
      {eyebrow ? <RevoryStatusBadge tone={tone}>{eyebrow}</RevoryStatusBadge> : null}
      <p className="mt-3 text-sm font-medium text-[color:var(--text-muted)]">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
        {value}
      </p>
      <p className="mt-2.5 text-sm leading-[1.55] text-[color:var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

