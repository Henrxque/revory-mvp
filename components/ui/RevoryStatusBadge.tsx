type RevoryStatusBadgeProps = Readonly<{
  className?: string;
  children: React.ReactNode;
  tone?: "accent" | "real" | "future" | "neutral";
}>;

const toneClasses: Record<NonNullable<RevoryStatusBadgeProps["tone"]>, string> = {
  accent:
    "border-[color:var(--border-accent)] bg-[color:var(--surface-soft)] text-[color:var(--accent-light)]",
  future:
    "border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.12)] text-[color:var(--warning)]",
  neutral:
    "border-[color:var(--border)] bg-[color:var(--background-card)] text-[color:var(--text-muted)]",
  real: "border-[rgba(46,204,134,0.25)] bg-[rgba(46,204,134,0.12)] text-[color:var(--success)]",
};

export function RevoryStatusBadge({
  className,
  children,
  tone = "neutral",
}: RevoryStatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-[11px] border px-2.5 py-[0.35rem] text-[9px] font-semibold leading-tight whitespace-nowrap ${toneClasses[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
