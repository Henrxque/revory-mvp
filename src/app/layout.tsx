import { DM_Sans, Instrument_Serif } from "next/font/google";
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

export const metadata: Metadata = {
  title: "REVORY",
  description:
    "Revenue recovery software for MedSpas with guided setup, CSV import, and premium operational visibility.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${instrumentSerif.variable}`}>
        <AuthJsProvider>{children}</AuthJsProvider>
      </body>
    </html>
  );
}
