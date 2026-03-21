import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";

const signUpHighlights = [
  "MedSpa-first onboarding",
  "CSV-ready workspace",
  "Premium private shell",
];

const signUpSteps = [
  {
    label: "01",
    title: "Create the workspace",
    text: "The account opens a real workspace context instead of a disconnected auth state.",
  },
  {
    label: "02",
    title: "Move through setup",
    text: "The guided path keeps activation narrow, opinionated, and coherent with the MVP.",
  },
  {
    label: "03",
    title: "Reach the imported dashboard",
    text: "Setup, imports, and dashboard visibility stay tied together from the first session.",
  },
];

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/app");
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_0.85fr] lg:items-stretch">
        <section className="rev-shell-hero flex flex-col rounded-[36px] p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <RevoryLogo />
            <RevoryStatusBadge tone="accent">New workspace</RevoryStatusBadge>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {signUpHighlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cfc7db]"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 space-y-5">
            <p className="rev-kicker">Guided activation</p>
            <div className="space-y-3">
              <h1 className="max-w-2xl font-[family:var(--font-display)] text-4xl leading-[0.94] text-[color:var(--foreground)] md:text-5xl">
                Start the workspace and move into the{" "}
                <span className="italic text-[color:var(--accent-light)]">
                  REVORY setup flow.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
                Account creation is the front door to the protected product
                flow. From here, the workspace is created, setup is guided, and
                the imported dashboard becomes the destination.
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-[color:var(--border)]" />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {signUpSteps.map((step) => (
              <div
                key={step.label}
                className="rev-card-soft rounded-[24px] px-5 py-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-light)]">
                  {step.label}
                </p>
                <p className="mt-3 text-base font-semibold text-[color:var(--foreground)]">
                  {step.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#b7afc5]">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.22)] md:p-8">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="rev-kicker">Account creation</p>
              <h2 className="font-[family:var(--font-display)] text-3xl leading-none text-[color:var(--foreground)] md:text-4xl">
                Start a REVORY workspace.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[#beb7ca]">
                Create the account tied to the workspace so setup, imports, and
                activation state remain consistent from the first session.
              </p>
            </div>

            <div className="rev-auth-clerk rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-5 md:p-6">
              <SignUp />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
