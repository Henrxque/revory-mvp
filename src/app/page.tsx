import ContractorHomePage, { metadata as contractorMetadata } from "@/components/legacy/ContractorHomePage";
import { AiIntegrityLanding } from "@/components/ai-integrity/AiMarketing";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";

export function generateMetadata() { return isAiIntegrityExperienceEnabled() ? { title: "REVORY — AI spend, with evidence", description: "Preview an evidence-led Integrity Scan for AI SaaS: provider spend, attribution and comparable usage differences.", robots: { index: false, follow: false } } : contractorMetadata; }
export default function HomePage() { return isAiIntegrityExperienceEnabled() ? <AiIntegrityLanding /> : <ContractorHomePage />; }
