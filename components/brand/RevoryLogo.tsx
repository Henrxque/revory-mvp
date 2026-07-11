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
  const imageHeight = compact ? 52 : 72;
  const imageWidth = Math.round(imageHeight * (1254 / 1146));
  const wordmarkSize = compact
    ? "text-[1.05rem] tracking-[0.14em]"
    : "text-[1.3rem] tracking-[0.12em]";

  return (
    <div className={`flex items-center gap-3.5 ${className ?? ""}`}>
      <div className="flex items-center">
        <Image
          alt="REVORY"
          height={imageHeight}
          priority
          src="/brand/revory-logo-43b39b-transparent.png"
          width={imageWidth}
        />
      </div>

      {iconOnly ? null : (
        <span
          className={`font-[family:var(--font-body)] font-bold uppercase leading-none text-[color:var(--foreground)] ${wordmarkSize}`}
        >
          REVORY
        </span>
      )}
    </div>
  );
}
