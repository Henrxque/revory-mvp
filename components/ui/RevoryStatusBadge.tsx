type RevoryStatusBadgeProps = Readonly<{
  className?: string;
  children: React.ReactNode;
  tone?: "accent" | "real" | "future" | "neutral";
}>;

const toneClasses: Record<NonNullable<RevoryStatusBadgeProps["tone"]>, string> = {
  accent:
    "border-[color:var(--border-accent)] bg-[color:var(--surface-soft)] text-[color:var(--accent-light)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  future:
    "border-[rgba(245,166,35,0.26)] bg-[rgba(245,166,35,0.1)] text-[color:var(--warning)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  neutral:
    "border-[color:var(--border)] bg-[rgba(255,255,255,0.028)] text-[color:var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  real:
    "border-[rgba(46,204,134,0.24)] bg-[rgba(46,204,134,0.1)] text-[color:var(--success)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
};

export function RevoryStatusBadge({
  className,
  children,
  tone = "neutral",
}: RevoryStatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-[0.34rem] text-[10px] font-semibold leading-tight tracking-[0.105em] whitespace-nowrap uppercase backdrop-blur-sm ${toneClasses[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
