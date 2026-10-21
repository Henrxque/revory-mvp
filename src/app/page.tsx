import type { Metadata } from "next";

import { AiIntegrityPublicLanding } from "@/components/ai-integrity-public/PublicPreview";
import { AiIntegrityLanding } from "@/components/ai-integrity/AiMarketing";
import { AiMonitorLanding } from "@/components/ai-integrity/AiMonitorLanding";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";
import { isAiCommercialRuntimeEnabled } from "@/services/ai-integrity/commercial-runtime";

const previewMetadata: Metadata = {
  title: "REVORY — AI spend integrity for AI SaaS | Preview",
  description: "Explore a synthetic, evidence-led preview of AI spend attribution and usage comparison for AI SaaS founders. Customer scans are not yet available.",
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "REVORY — AI spend integrity for AI SaaS | Preview",
    description: "A synthetic presentation of the new REVORY. Customer scans are not yet available.",
    type: "website",
  },
};

export function generateMetadata(): Metadata {
  if (!isAiCommercialRuntimeEnabled()) return previewMetadata;
  return { title: "REVORY — AI spend integrity monitoring", description: "Compare Stripe billing context, your internal usage ledger and OpenAI usage. Track explainable differences with evidence.", alternates: { canonical: "/" }, robots: { index: false, follow: false } };
}

export default function HomePage() {
  if (isAiCommercialRuntimeEnabled()) return <AiMonitorLanding />;
  return isAiIntegrityExperienceEnabled() ? <AiIntegrityLanding /> : <AiIntegrityPublicLanding />;
}
