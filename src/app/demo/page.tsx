import type { Metadata } from "next";

import { RevoryDemoDashboard } from "@/components/demo/RevoryDemoDashboard";
import { REVORY_DEMO_READ } from "@/services/demo/revory-demo-fixture";

export const metadata: Metadata = {
  description:
    "Explore a fictional, read-only REVORY revenue-risk read for a sample premium MedSpa.",
  title: "REVORY Demo — Sample Revenue Leak Read",
};

export default function DemoPage() {
  return <RevoryDemoDashboard read={REVORY_DEMO_READ} />;
}
