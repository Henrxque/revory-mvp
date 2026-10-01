import ContractorStartPage from "@/components/legacy/ContractorStartPage";
import { AiIntegrityStart } from "@/components/ai-integrity/AiIntegrityStart";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";

export default function StartPage({ searchParams }: { searchParams: Promise<{ billing?: string; order?: string; checkout?: string }> }) {
  return isAiIntegrityExperienceEnabled() ? <AiIntegrityStart searchParams={searchParams} /> : <ContractorStartPage searchParams={searchParams} />;
}
