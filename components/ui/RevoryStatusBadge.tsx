type RevoryStatusBadgeProps = Readonly<{
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
  children,
  tone = "neutral",
}: RevoryStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-4 py-2 text-sm font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
