import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import type { Metadata } from "next";
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
        <ClerkProvider
          appearance={{
            variables: {
              colorBackground: "#1A1721",
              colorDanger: "#FF728D",
              colorInputBackground: "#2B2635",
              colorInputText: "#F8F7FB",
              colorPrimary: "#C2095A",
              colorText: "#F8F7FB",
              colorTextSecondary: "#B6AFC3",
              borderRadius: "1rem",
              fontFamily: "var(--font-body)",
            },
            elements: {
              card: "border-0 bg-transparent shadow-none",
              cardBox:
                "w-full rounded-[24px] border border-white/6 bg-[rgba(255,255,255,0.02)] shadow-none",
              userButtonPopoverActionButton:
                "!text-[#F5F4F8] hover:!bg-[rgba(255,255,255,0.04)]",
              userButtonPopoverActionButtonIcon: "!text-[#B6AFC3]",
              userButtonPopoverActionButtonText: "!text-[#F5F4F8]",
              userButtonPopoverCard:
                "!border !border-white/8 !bg-[#1A1721] !shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
              userButtonPopoverFooter:
                "!border-t !border-white/8 !bg-[rgba(255,255,255,0.02)]",
              userButtonPopoverMain: "!bg-[#1A1721]",
              userButtonPopoverText: "!text-[#F5F4F8]",
              userPreview: "!text-[#F5F4F8]",
              userPreviewMainIdentifier: "!text-[#F5F4F8]",
              userPreviewSecondaryIdentifier: "!text-[#B6AFC3]",
              userPreviewTextContainer: "!text-[#F5F4F8]",
              dividerLine: "bg-white/10",
              dividerText: "text-[#B6AFC3]",
              footerActionLink: "text-[#ff3f90] hover:text-[#ff6daa]",
              formButtonPrimary:
                "!bg-[#C2095A] hover:!bg-[#E0106A] !text-white !shadow-none",
              formFieldInput:
                "!border-white/10 !bg-[#2B2635] !text-[#F8F7FB] placeholder:!text-[#A49CB5] !shadow-none",
              formFieldLabel: "!text-[#E7E2F0]",
              formFieldWarningText: "!text-[#F5C15C]",
              footer: "bg-transparent",
              formFieldRow: "gap-2",
              headerSubtitle: "!text-[#B6AFC3]",
              headerTitle: "!text-[#F8F7FB]",
              identityPreviewText: "!text-[#B6AFC3]",
              otpCodeFieldInput:
                "!border-white/10 !bg-[#2B2635] !text-[#F8F7FB] !shadow-none",
              socialButtonsBlockButton:
                "!border-white/10 !bg-[#342E40] !text-[#F8F7FB] hover:!bg-[#40384D] !shadow-none",
              socialButtonsBlockButtonText: "!text-[#F8F7FB]",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
