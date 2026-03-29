"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RevoryLogo } from "@/components/brand/RevoryLogo";

type AppSidebarProps = Readonly<{
  activationStatus: string;
  bookingInputsStatus: string;
  currentStepTitle: string;
  userEmail: string;
  workspaceName: string;
  workspaceStatus: string;
}>;

type SidebarIconKey =
  | "dashboard"
  | "appointments"
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
): SidebarGroup[] => [
    {
      label: "Seller",
      items: [
        {
          href: "/app/dashboard",
          icon: "dashboard",
          label: "Revenue View",
        },
        {
          href: "/app/imports",
          icon: "appointments",
          label: "Booking Inputs",
          status: bookingInputsStatus,
        },
      ],
    },
    {
      label: "Activation",
      items: [
        {
          href: "/app/setup",
          icon: "settings",
          label: "Activation Path",
          status: activationStatus,
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
    case "appointments":
      return (
        <svg {...sharedProps}>
          <rect x="3" y="4" width="18" height="17" rx="2.5" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
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

  if (status === "Proof active" || status === "Activated") {
    return "success";
  }

  if (status === "Proof ready" || status === "Activating") {
    return "warning";
  }

  if (status === "Proof next") {
    return "warning";
  }

  return "neutral";
}

export function AppSidebar({
  activationStatus,
  bookingInputsStatus,
  currentStepTitle,
  userEmail,
  workspaceName,
  workspaceStatus,
}: AppSidebarProps) {
  const pathname = usePathname();
  const workspaceInitials = getWorkspaceInitials(workspaceName);

  return (
    <aside className="relative z-50 flex h-full pointer-events-auto flex-col rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,#111018,#0d0c11)] shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
      <div className="border-b border-[color:var(--border)] px-5 py-[1.125rem]">
        <RevoryLogo compact />
        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
          Premium booking acceleration system
        </p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups(activationStatus, bookingInputsStatus).map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-subtle)]">
              {group.label}
            </p>

            {group.items.map((item) => {
              const isLink = "href" in item;
              const isActive = isLink
                ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                : false;

              const itemClassName = `flex items-center gap-3 rounded-[16px] px-3.5 py-2.5 text-[13.5px] transition ${
                isActive
                  ? "bg-[rgba(194,9,90,0.16)] text-[color:var(--foreground)] shadow-[inset_0_0_0_1px_rgba(194,9,90,0.18)]"
                  : "text-[color:var(--text-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[color:var(--foreground)]"
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

      <div className="border-t border-[color:var(--border)] px-4 py-3.5">
        <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.14)] text-[13px] font-semibold text-[color:var(--accent-light)]">
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
            <span className="inline-flex min-h-6 items-center rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              {activationStatus}
            </span>
            <span className="inline-flex min-h-6 items-center rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
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
