import ContractorDemoPage, { metadata as contractorMetadata } from "@/components/legacy/ContractorDemoPage";
import { AiIntegrityDemo } from "@/components/ai-integrity/AiIntegrityDemo";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";

export function generateMetadata() { return isAiIntegrityExperienceEnabled() ? { title: "REVORY — Synthetic Integrity Scan demo", description: "Explore reported spend, attribution coverage and comparable usage differences with synthetic evidence.", robots: { index: false, follow: false } } : contractorMetadata; }
export default function DemoPage() { return isAiIntegrityExperienceEnabled() ? <AiIntegrityDemo /> : <ContractorDemoPage />; }
