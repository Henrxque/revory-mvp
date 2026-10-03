import type { Metadata } from "next";

import { AiIntegrityPublicLanding } from "@/components/ai-integrity-public/PublicPreview";

export const metadata: Metadata = {
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

export default function HomePage() {
  return <AiIntegrityPublicLanding />;
}
