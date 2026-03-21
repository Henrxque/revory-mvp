import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";
import { getOnboardingDataSource } from "@/services/onboarding/upsert-onboarding-data-source";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

function formatActivatedAt(value: Date | null) {
  if (!value) {
    return "Activation timestamp pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function DashboardPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
  }

  if (!appContext.activationSetup.isCompleted) {
    redirect(
      getOnboardingStepPath(
        resolveOnboardingStepKey(appContext.activationSetup.currentStep),
      ),
    );
  }

  const { activationSetup, workspace } = appContext;
  const dataSource = await getOnboardingDataSource(workspace.id);
  const nextSteps = [
    "Connect the selected source path with a live sync or guided import in Sprint 2.",
    "Turn the recovery and review modules from prepared setup into active product flows.",
    "Replace placeholder KPIs with monitored revenue protection, recovery, and confirmation data.",
  ];
  const futureBlocks = [
    {
      description:
        "At-risk appointments and empty slots will appear here once the source starts feeding real scheduling data.",
      title: "Recovery",
    },
    {
      description:
        "Review requests will connect to the configured Google Reviews destination after the operational layer goes live.",
      title: "Reviews",
    },
    {
      description:
        "Revenue Protected, Revenue Recovered, and Confirmation Rate will replace placeholders when live events start arriving.",
      title: "ROI",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-[color:var(--border)] bg-white/85 p-6 shadow-[0_18px_50px_rgba(32,26,24,0.05)]">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Activated Dashboard
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-[color:var(--foreground)] md:text-4xl">
            {workspace.name} is activated and ready for the next layer of
            revenue recovery.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/70 md:text-base">
            The setup is complete. This dashboard intentionally stays honest:
            the product is activated, the structure is real, and live
            operational data arrives in the next sprint.
          </p>
        </section>

        <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--accent-strong)] p-6 text-white shadow-[0_18px_50px_rgba(32,26,24,0.08)]">
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">
            Setup Status
          </p>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                Activation
              </p>
              <p className="mt-2 text-lg font-semibold">Completed</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                Activated At
              </p>
              <p className="mt-2 text-sm leading-6 text-white/85">
                {formatActivatedAt(activationSetup.activatedAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                Active Mode
              </p>
              <p className="mt-2 text-lg font-semibold">{workspace.activeModeKey}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-white/85 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Revenue Protected
          </p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
            Placeholder ready
          </p>
          <p className="mt-2 text-sm leading-6 text-black/65">
            Will populate when live confirmations and appointment risk signals
            begin flowing into the product.
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-white/85 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Revenue Recovered
          </p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
            Placeholder ready
          </p>
          <p className="mt-2 text-sm leading-6 text-black/65">
            Will activate once recovery opportunities and rebooking outcomes
            become operational in Sprint 2.
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-white/85 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Confirmation Rate
          </p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
            Awaiting live data
          </p>
          <p className="mt-2 text-sm leading-6 text-black/65">
            The metric shell is ready, but it stays empty until real reminder
            and confirmation events are available.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-[color:var(--border)] bg-white/85 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Next Steps
          </p>
          <div className="mt-5 space-y-3">
            {nextSteps.map((item, index) => (
              <div
                key={item}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-black/75">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[color:var(--border)] bg-white/85 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Data Readiness
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">
                Selected Source
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                {dataSource?.type ?? "No source selected"}
              </p>
              <p className="mt-2 text-sm leading-6 text-black/65">
                The source path is configured, but no live sync or import has
                been executed yet.
              </p>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">
                Empty State
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                Guided and expected
              </p>
              <p className="mt-2 text-sm leading-6 text-black/65">
                This dashboard is intentionally empty of real numbers until the
                data source starts feeding operational activity.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-white/85 p-6">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
          What Comes Next
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {futureBlocks.map((block) => (
            <div
              key={block.title}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5"
            >
              <p className="text-lg font-semibold text-[color:var(--foreground)]">
                {block.title}
              </p>
              <p className="mt-3 text-sm leading-7 text-black/70">
                {block.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
