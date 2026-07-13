import type { RevenueRealizationFindingType } from "@/domain/revory/revenue-realization";

const shared = {
  className: "h-5 w-5",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
  viewBox: "0 0 24 24",
};

export function RevenueRealizationFindingIcon({ type }: { type: RevenueRealizationFindingType }) {
  if (type === "UNDERBILLING_GAP") {
    return <svg {...shared}><path d="M4 7h16M4 17h16"/><path d="m8 4-3 3 3 3M16 14l3 3-3 3"/></svg>;
  }
  if (type === "APPROVED_CHANGE_ORDER_NOT_BILLED") {
    return <svg {...shared}><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5M10 13h6M10 17h4"/><path d="m3.5 11 2 2 3-4"/></svg>;
  }
  if (type === "MARGIN_AT_RISK") {
    return <svg {...shared}><path d="M4 19h16M6 16l4-5 3 3 5-8"/><path d="M15 6h3v3"/></svg>;
  }
  if (type === "SUSPECTED_MISSING_CHANGE_ORDER") {
    return <svg {...shared}><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 8v5M12 17h.01"/><path d="M17 3v4M15 5h4"/></svg>;
  }
  return <svg {...shared}><path d="M8 4h8M6 8h12M5 12h8M5 16h5"/><path d="m17 13 1.2 2.4L21 16l-2 2 .5 3-2.5-1.4L14.5 21l.5-3-2-2 2.8-.6z"/></svg>;
}
