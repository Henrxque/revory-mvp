"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RevoryLogo } from "@/components/brand/RevoryLogo";

type AppSidebarProps = Readonly<{
  activationStatus: string;
  bookingInputsStatus: string;
  currentStepTitle: string;
  demoMode?: boolean;
  userEmail: string;
  workspaceName: string;
  workspaceStatus: string;
}>;

type SidebarIconKey =
  | "dashboard"
  | "signals"
  | "imports"
  | "reconciliation"
  | "billing"
  | "history"
  | "settings";

type SidebarItem =
  | {
      href: string;
      icon: SidebarIconKey;
      label: string;
      status?: string;
    }
  | {
      icon: SidebarIconKey;
      label: string;
      status?: string;
    };

type SidebarGroup = {
  items: SidebarItem[];
  label: string;
};

const navGroups = (
  activationStatus: string,
  bookingInputsStatus: string,
  demoMode = false,
): SidebarGroup[] => [
    {
      label: "REVORY",
      items: [
        {
          href: demoMode ? "#demo-dashboard" : "/app/dashboard",
          icon: "dashboard",
          label: "Executive Read",
        },
        {
          href: demoMode ? "#demo-leaks" : "/app/revenue-leaks",
          icon: "signals",
          label: "Quote Recovery",
        },
        {
          href: demoMode ? "#demo-data" : "/app/imports",
          icon: "imports",
          label: "Data Imports",
          status: bookingInputsStatus,
        },
        {
          href: demoMode ? "#demo-data" : "/app/revenue-realization",
          icon: "reconciliation",
          label: "Revenue Realization",
        },
        { href: demoMode ? "#demo-history" : "/app/history", icon: "history", label: "Growth intelligence" },
      ],
    },
    {
      label: "Workspace",
      items: [
        { href: demoMode ? "#demo-settings" : "/app/settings", icon: "settings", label: "Data & settings" },
        {
          href: "/start",
          icon: "billing",
          label: "Plans & Billing",
        },
      ],
    },
  ];

function SidebarIcon({ icon }: Readonly<{ icon: SidebarIconKey }>) {
  const sharedProps = {
    className: "h-[15px] w-[15px] flex-shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (icon) {
    case "dashboard":
      return (
        <svg {...sharedProps}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "imports":
      return (
        <svg {...sharedProps}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      );
    case "signals":
      return (
        <svg {...sharedProps}>
          <path d="M4 19h16" />
          <path d="M7 16V9" />
          <path d="M12 16V5" />
          <path d="M17 16v-4" />
          <path d="m8.5 8.5 3-3 3 4 3-2.5" />
        </svg>
      );
    case "reconciliation":
      return (
        <svg {...sharedProps}>
          <path d="M4 7h12" />
          <path d="m13 4 3 3-3 3" />
          <path d="M20 17H8" />
          <path d="m11 14-3 3 3 3" />
        </svg>
      );
    case "settings":
      return (
        <svg {...sharedProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
        </svg>
      );
    case "billing":
      return (
        <svg {...sharedProps}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
        </svg>
      );
    case "history":
      return <svg {...sharedProps}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>;
  }
}

function getWorkspaceInitials(workspaceName: string) {
  const parts = workspaceName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "RV";
}

function formatWorkspaceStatus(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Live";
    case "DRAFT":
      return "Draft";
    case "PAUSED":
      return "Paused";
    default:
      return status
        .toLowerCase()
        .split("_")
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" ");
  }
}

function getStatusTone(status?: string) {
  if (!status) {
    return "neutral";
  }

  if (status === "Data visible" || status === "Read ready") {
    return "success";
  }

  if (status === "Data needed" || status === "Import needed") {
    return "warning";
  }

  return "neutral";
}

export function AppSidebar({
  activationStatus,
  bookingInputsStatus,
  currentStepTitle,
  demoMode = false,
  userEmail,
  workspaceName,
  workspaceStatus,
}: AppSidebarProps) {
  const pathname = usePathname();
  const workspaceInitials = getWorkspaceInitials(workspaceName);

  return (
    <aside className="pointer-events-auto relative z-50 flex h-auto flex-col rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(27,29,30,0.98),rgba(20,21,22,0.99))] shadow-[var(--shadow-panel)] lg:h-full lg:rounded-[30px]">
      <div className="border-b border-[color:var(--border)] px-4 py-3 lg:px-5 lg:py-5">
        <RevoryLogo compact />
        <p className="mt-3 hidden text-[10px] font-semibold uppercase leading-5 tracking-[0.18em] text-[color:var(--text-subtle)] lg:block">
          Evidence and reconciliation review
        </p>
      </div>

      <nav aria-label="Mobile workspace navigation" className="grid grid-cols-6 gap-1 p-2 lg:hidden">
        {[
          [demoMode ? "#demo-dashboard" : "/app/dashboard", "dashboard", "Read"],
          [demoMode ? "#demo-leaks" : "/app/revenue-leaks", "signals", "Findings"],
          [demoMode ? "#demo-data" : "/app/revenue-realization", "reconciliation", "Realize"],
          [demoMode ? "#demo-data" : "/app/imports", "imports", "Imports"],
          [demoMode ? "#demo-history" : "/app/history", "history", "Growth"],
          [demoMode ? "#demo-settings" : "/app/settings", "settings", "Settings"],
        ].map(([href, icon, label]) => (
          <Link
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] ${
              pathname === href || pathname.startsWith(`${href}/`)
                ? "bg-[rgba(67,179,155,0.14)] text-[color:var(--foreground)]"
                : "text-[color:var(--text-muted)]"
            }`}
            href={href}
            key={`${href}-${label}`}
            prefetch={false}
          >
            <SidebarIcon icon={icon as SidebarIconKey} />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      <nav className="hidden flex-1 space-y-6 overflow-y-auto px-3 py-5 lg:block">
        {navGroups(activationStatus, bookingInputsStatus, demoMode).map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-subtle)]">
              {group.label}
            </p>

            {group.items.map((item) => {
              const isLink = "href" in item;
              const isActive = isLink
                ? demoMode
                  ? item.href === "#demo-dashboard"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)
                : false;

              const itemClassName = `flex items-center gap-3 rounded-[18px] px-3.5 py-2.5 text-[13.5px] transition ${
                isActive
                  ? "bg-[linear-gradient(180deg,rgba(67,179,155,0.18),rgba(67,179,155,0.1))] text-[color:var(--foreground)] shadow-[inset_0_0_0_1px_rgba(67,179,155,0.22)]"
                  : "text-[color:var(--text-muted)] hover:bg-[rgba(255,255,255,0.035)] hover:text-[color:var(--foreground)]"
              }`;

              const statusTone = getStatusTone(item.status);
              const content = (
                <>
                  <SidebarIcon icon={item.icon} />
                  <span className={isActive ? "font-medium" : ""}>{item.label}</span>
                  {item.status ? (
                    <span
                      className={`ml-auto h-2.5 w-2.5 rounded-full ${
                        isActive
                          ? "bg-[color:var(--accent-light)]"
                          : statusTone === "success"
                            ? "bg-[color:var(--success)]"
                            : statusTone === "warning"
                              ? "bg-[color:var(--warning)]"
                              : "bg-[color:var(--text-subtle)]"
                      }`}
                    />
                  ) : null}
                </>
              );

              if (!isLink) {
                return (
                  <div key={item.label} className={itemClassName}>
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  className={itemClassName}
                  href={item.href}
                  prefetch={false}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="hidden border-t border-[color:var(--border)] px-4 py-4 lg:block">
        <div className="rounded-[20px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.14)] text-[13px] font-semibold text-[color:var(--accent-light)]">
              {workspaceInitials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-[color:var(--foreground)]">
                {workspaceName}
              </p>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.15em] text-[color:var(--text-subtle)]">
                {currentStepTitle}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex min-h-6 items-center rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              {activationStatus}
            </span>
            <span className="inline-flex min-h-6 items-center rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              {formatWorkspaceStatus(workspaceStatus)}
            </span>
          </div>

          <p className="mt-2 truncate text-[11px] text-[color:var(--text-muted)]">
                {userEmail}
          </p>
        </div>
      </div>
    </aside>
  );
}
