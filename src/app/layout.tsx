import { DM_Sans, Instrument_Serif, Sora } from "next/font/google";
import type { Metadata } from "next";

import { AuthJsProvider } from "@/components/auth/AuthJsProvider";

import "./globals.css";

const dmSans = DM_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const instrumentSerif = Instrument_Serif({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
});

const sora = Sora({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "REVORY — Revenue Leak Intelligence",
  description:
    "REVORY is an evidence-first Estimate & Change Order Revenue Leak Detector for high-ticket service businesses.",
  icons: {
    icon: "/brand/revory-logo-43b39b-transparent.png",
    apple: "/brand/revory-logo-43b39b-transparent.png",
  },
  openGraph: {
    title: "REVORY — Revenue Leak Intelligence",
    description:
      "Find the money leaking from estimates, follow-ups, and unbilled changes.",
    images: ["/brand/revory-logo-43b39b-transparent.png"],
    type: "website",
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${instrumentSerif.variable} ${sora.variable}`}>
        <AuthJsProvider>{children}</AuthJsProvider>
      </body>
    </html>
  );
}
