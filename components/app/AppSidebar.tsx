"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RevoryLogo } from "@/components/brand/RevoryLogo";

type AppSidebarProps = Readonly<{
  activationLabel: string;
  currentStepTitle: string;
  userEmail: string;
  workspaceName: string;
  workspaceStatus: string;
}>;

const navGroups = [
  {
    label: "Workspace",
    items: [{ href: "/app/dashboard", label: "Dashboard", status: "Live" }],
  },
  {
    label: "Operations",
    items: [
      { href: "/app/setup", label: "Setup", status: "Configured" },
      { href: "/app/imports", label: "Imports", status: "CSV Ready" },
    ],
  },
  {
    label: "Next Phase",
    items: [
      { label: "Confirmations", status: "Coming soon" },
      { label: "Recovery", status: "Next phase" },
      { label: "Reviews", status: "Coming soon" },
    ],
  },
] as const;

export function AppSidebar({
  activationLabel,
  currentStepTitle,
  userEmail,
  workspaceName,
  workspaceStatus,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(17,16,24,0.98),rgba(10,9,14,0.98))] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
      <div className="border-b border-[color:var(--border)] pb-5">
        <RevoryLogo compact />
      </div>

      <nav className="mt-6 flex-1 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-subtle)]">
              {group.label}
            </p>

            {group.items.map((item) => {
              if (!("href" in item)) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-[color:var(--text-muted)]"
                  >
                    <span>{item.label}</span>
                    <span className="rounded-full border border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--warning)]">
                      {item.status}
                    </span>
                  </div>
                );
              }

              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  className={`flex items-center justify-between rounded-[22px] border px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.18),rgba(194,9,90,0.08))] text-[color:var(--foreground)]"
                      : "border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] text-[color:var(--text-muted)] hover:border-[color:var(--border-accent)] hover:bg-[color:var(--background-card-hover)] hover:text-[color:var(--foreground)]"
                  }`}
                  href={item.href}
                >
                  <div className="space-y-1">
                    <span className="block">{item.label}</span>
                    <span className="block text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                      {item.status}
                    </span>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isActive
                        ? "bg-[color:var(--accent-light)]"
                        : "bg-[color:var(--text-subtle)]"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-4">
        <div className="rounded-[26px] border border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.18),rgba(21,20,28,0.98))] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
            Workspace Snapshot
          </p>
          <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
            {workspaceName}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
            {workspaceStatus} • {activationLabel}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[color:var(--accent-light)]">
            Current step
          </p>
          <p className="mt-1 text-sm text-[color:var(--foreground)]">
            {currentStepTitle}
          </p>
        </div>

        <div className="rounded-[26px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
            Operator
          </p>
          <p className="mt-3 text-sm font-medium text-[color:var(--foreground)]">
            {workspaceName}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
            {userEmail}
          </p>
        </div>
      </div>
    </aside>
  );
}
