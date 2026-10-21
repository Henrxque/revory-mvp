import ContractorStartPage from "@/components/legacy/ContractorStartPage";
import { AiIntegrityStart } from "@/components/ai-integrity/AiIntegrityStart";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";
import { isAiCommercialRuntimeEnabled } from "@/services/ai-integrity/commercial-runtime";
import { redirect } from "next/navigation";

export default function StartPage({ searchParams }: { searchParams: Promise<{ billing?: string; order?: string; checkout?: string }> }) {
  if (isAiCommercialRuntimeEnabled()) redirect("/app/ai-integrity/monitoring?tab=settings");
  return isAiIntegrityExperienceEnabled() ? <AiIntegrityStart searchParams={searchParams} /> : <ContractorStartPage searchParams={searchParams} />;
}
