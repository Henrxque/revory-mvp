import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";

export default async function DashboardPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
  }

  const { workspace } = appContext;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
          Dashboard Placeholder
        </p>
        <h2 className="text-3xl font-semibold text-[color:var(--foreground)]">
          Private dashboard shell is ready.
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-black/70 md:text-base">
          {workspace.name} now has a stable private destination for the
          post-activation flow. Metrics and operational modules connect here in
          the next steps.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Revenue Protected
          </p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
            --
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Revenue Recovered
          </p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
            --
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Confirmation Rate
          </p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
            --
          </p>
        </div>
      </div>
    </div>
  );
}
