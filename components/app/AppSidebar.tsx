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

type SidebarIconKey =
  | "dashboard"
  | "appointments"
  | "flows"
  | "slots"
  | "reviews"
  | "recall"
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

const navGroups: ReadonlyArray<{
  items: ReadonlyArray<SidebarItem>;
  label: string;
}> = [
  {
    label: "Workspace",
    items: [
      {
        href: "/app/dashboard",
        icon: "dashboard",
        label: "Dashboard",
      },
      {
        href: "/app/imports",
        icon: "appointments",
        label: "Imports & Mapping",
        status: "Live",
      },
    ],
  },
  {
    label: "Revenue",
    items: [
      {
        icon: "flows",
        label: "Active Flows",
        status: "Coming soon",
      },
      {
        icon: "slots",
        label: "Empty Slots",
        status: "Next phase",
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        icon: "reviews",
        label: "Reviews",
        status: "Coming soon",
      },
      {
        icon: "recall",
        label: "Recall",
        status: "Coming soon",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/app/setup",
        icon: "settings",
        label: "Activation Setup",
        status: "Configured",
      },
    ],
  },
] as const;

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
    case "appointments":
      return (
        <svg {...sharedProps}>
          <rect x="3" y="4" width="18" height="17" rx="2.5" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "flows":
      return (
        <svg {...sharedProps}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "slots":
      return (
        <svg {...sharedProps}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15.5 14" />
        </svg>
      );
    case "reviews":
      return (
        <svg {...sharedProps}>
          <polygon points="12 2 15 8.2 22 9.2 17 14 18.2 21 12 17.6 5.8 21 7 14 2 9.2 9 8.2 12 2" />
        </svg>
      );
    case "recall":
      return (
        <svg {...sharedProps}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "settings":
      return (
        <svg {...sharedProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
        </svg>
      );
  }
}

function getWorkspaceInitials(workspaceName: string) {
  const parts = workspaceName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "RV";
}

export function AppSidebar({
  activationLabel,
  currentStepTitle,
  userEmail,
  workspaceName,
  workspaceStatus,
}: AppSidebarProps) {
  const pathname = usePathname();
  const workspaceInitials = getWorkspaceInitials(workspaceName);

  return (
    <aside className="relative z-50 flex h-full pointer-events-auto flex-col rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,#111018,#0d0c11)] shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
      <div className="border-b border-[color:var(--border)] px-5 py-5">
        <RevoryLogo compact />
        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
          MedSpa revenue recovery
        </p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-subtle)]">
              {group.label}
            </p>

            {group.items.map((item) => {
              const isLink = "href" in item;
              const isActive = isLink
                ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                : false;

              const itemClassName = `flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm transition ${
                isActive
                  ? "border-l-2 border-[color:var(--accent)] bg-[rgba(194,9,90,0.14)] text-[color:var(--accent-light)]"
                  : "text-[color:var(--text-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[color:var(--foreground)]"
              }`;

              const content = (
                <>
                  <SidebarIcon icon={item.icon} />
                  <span>{item.label}</span>
                  {item.status ? (
                    <span
                      className={`ml-auto h-2 w-2 rounded-full ${
                        isActive
                          ? "bg-[color:var(--accent-light)]"
                          : item.status === "Live"
                            ? "bg-[color:var(--success)]"
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
                  key={item.href}
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

      <div className="border-t border-[color:var(--border)] px-4 py-4">
        <div className="flex items-center gap-3 rounded-[16px] bg-[rgba(255,255,255,0.03)] px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.14)] text-sm font-semibold text-[color:var(--accent-light)]">
            {workspaceInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
              {workspaceName}
            </p>
            <p className="truncate text-xs text-[color:var(--text-muted)]">
              {activationLabel} · {workspaceStatus}
            </p>
            <p className="mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
              {currentStepTitle}
            </p>
            <p className="mt-1 truncate text-[11px] text-[color:var(--text-subtle)]">
              {userEmail}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
