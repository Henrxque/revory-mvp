type AuthStepCardProps = Readonly<{
  className?: string;
  label: string;
  text: string;
  title: string;
}>;

export function AuthStepCard({
  className = "",
  label,
  text,
  title,
}: AuthStepCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-5 py-5 shadow-[0_18px_36px_rgba(0,0,0,0.14)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[4.5rem] bg-[linear-gradient(180deg,rgba(224,16,106,0.1),transparent)]" />

      <div className="relative flex h-full flex-col">
        <span className="inline-flex w-fit items-center rounded-full border border-[rgba(224,16,106,0.18)] bg-[rgba(194,9,90,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-light)]">
          {label}
        </span>
        <p className="mt-4 text-[1.05rem] font-semibold leading-7 text-[color:var(--foreground)]">
          {title}
        </p>
        <p className="mt-2.5 text-sm leading-[1.6] text-[#b7afc5]">{text}</p>
      </div>
    </div>
  );
}

