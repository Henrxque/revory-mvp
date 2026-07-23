import { DM_Sans, Instrument_Serif, Sora } from "next/font/google";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AuthJsProvider } from "@/components/auth/AuthJsProvider";

import "./globals.css";

const dmSans = DM_Sans({ display: "swap", subsets: ["latin"], variable: "--font-dm-sans" });
const instrumentSerif = Instrument_Serif({ display: "swap", subsets: ["latin"], variable: "--font-instrument-serif", weight: "400" });
const sora = Sora({ display: "swap", subsets: ["latin"], variable: "--font-sora" });
const vercelObservabilityEnabled = process.env.VERCEL === "1";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "REVORY — Quote Recovery for High-Ticket Contractors",
  description: "REVORY is evidence-first Quote Recovery intelligence for high-ticket service businesses.",
  icons: { icon: "/brand/revory-logo-43b39b-transparent.png", apple: "/brand/revory-logo-43b39b-transparent.png" },
  openGraph: {
    title: "REVORY — Quote Recovery for High-Ticket Contractors",
    description: "Find which estimates and follow-ups may still deserve recovery attention.",
    images: ["/brand/revory-logo-43b39b-transparent.png"],
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${dmSans.variable} ${instrumentSerif.variable} ${sora.variable}`} data-scroll-behavior="smooth" lang="en">
      <body>
        <AuthJsProvider>{children}</AuthJsProvider>
        {vercelObservabilityEnabled ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}
