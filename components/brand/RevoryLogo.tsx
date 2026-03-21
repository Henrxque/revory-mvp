import Image from "next/image";

type RevoryLogoProps = Readonly<{
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
}>;

export function RevoryLogo({
  className,
  compact = false,
  iconOnly = false,
}: RevoryLogoProps) {
  const imageSize = compact ? 36 : 52;
  const wordmarkSize = compact
    ? "text-[0.98rem] tracking-[0.14em]"
    : "text-[1.12rem] tracking-[0.12em]";

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <div className="flex items-center">
        <Image
          alt="REVORY"
          height={imageSize}
          priority
          src="/brand/revory-logo-mark.png"
          width={Math.round(imageSize * 1.46)}
        />
      </div>

      {iconOnly ? null : (
        <span
          className={`font-[family:var(--font-display)] uppercase leading-none text-[color:var(--foreground)] ${wordmarkSize}`}
        >
          REVORY
        </span>
      )}
    </div>
  );
}
