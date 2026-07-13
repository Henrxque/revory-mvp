import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAuthSession } from "@/auth";
import { RevoryLogo } from "@/components/brand/RevoryLogo";

export const metadata: Metadata = {
  title: "REVORY — Quote Recovery for High-Ticket Contractors",
  description:
    "Upload estimate and follow-up exports. REVORY surfaces stale high-value quotes, overdue follow-ups and missing next-step evidence for review.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "REVORY — Quote Recovery for High-Ticket Contractors",
    description:
      "Find which estimates and follow-ups may still deserve recovery attention — with evidence, confidence and clear limits.",
    type: "website",
  },
};

type SignalIcon =
  | "clock"
  | "value"
  | "activity"
  | "aging"
  | "owner"
  | "review";

const currentSignals: ReadonlyArray<{
  icon: SignalIcon;
  text: string;
  title: string;
}> = [
  {
    icon: "clock",
    title: "Overdue follow-up",
    text: "Flags an explicit follow-up date that has passed.",
  },
  {
    icon: "value",
    title: "High-value stale estimate",
    text: "Prioritizes open estimates with value and no recent activity.",
  },
  {
    icon: "activity",
    title: "Open estimate, no activity",
    text: "Shows the operational evidence gap without inventing a dollar loss.",
  },
  {
    icon: "aging",
    title: "Estimate aging risk",
    text: "Surfaces estimates beyond a transparent aging threshold.",
  },
  {
    icon: "owner",
    title: "Missing owner or next step",
    text: "Keeps process risk separate from estimated recoverable value.",
  },
  {
    icon: "review",
    title: "Conservative lost-quote review",
    text: "Requires recent loss evidence, value and an explicit next step.",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload exports",
    text: "Add canonical CSV or XLSX exports for customers, estimates and activities.",
  },
  {
    number: "02",
    title: "Confirm Data Quality",
    text: "Review mapping, duplicates, eligibility and unmatched links before analysis.",
  },
  {
    number: "03",
    title: "Inspect the read",
    text: "See prioritized findings, source lineage, confidence and the next review action.",
  },
] as const;

const faq = [
  [
    "Does REVORY replace our CRM or field service system?",
    "No. REVORY is a narrow intelligence layer over exports from the tools your team already uses.",
  ],
  [
    "Does REVORY send follow-ups automatically?",
    "No. It identifies evidence-backed opportunities and recommends a review. Your team decides and acts.",
  ],
  [
    "Is estimated recoverable revenue guaranteed?",
    "No. It is a modeled opportunity based on imported estimate evidence, never confirmed accounting loss or guaranteed recovery.",
  ],
  [
    "What data can we start with?",
    "Canonical customer, estimate and activity exports are the core Quote Recovery inputs. CSV and XLSX are supported.",
  ],
  [
    "What about invoices, change orders, underbilling and margin?",
    "Those belong to the Revenue Realization roadmap. They remain gated until ingestion, matching and reconciliation pass their own release tests.",
  ],
  [
    "Is the US$799 audit available now?",
    "The product flow is being validated privately. Checkout activates only after the remaining browser, Stripe sandbox and launch-security gates pass.",
  ],
] as const;

export default async function HomePage() {
  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect("/app");
  }

  return (
    <main className="rev-landing-page min-h-screen font-[family:var(--font-body)]">
      <nav
        aria-label="Primary navigation"
        className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[rgba(20,21,22,.9)] px-5 py-2.5 backdrop-blur-2xl"
      >
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-5">
          <Link aria-label="REVORY home" href="/">
            <RevoryLogo compact />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-[color:var(--text-muted)] md:flex">
            <a className="rev-nav-link" href="#how">
              How it works
            </a>
            <a className="rev-nav-link" href="#signals">
              Signals
            </a>
            <a className="rev-nav-link" href="#pricing">
              Pricing
            </a>
            <a className="rev-nav-link" href="#faq">
              FAQ
            </a>
          </div>
          <div className="flex gap-2">
            <Link className="rev-button-ghost hidden sm:inline-flex" href="/sign-in">
              Sign in
            </Link>
            <Link className="rev-button-primary" href="/start">
              Preview the audit
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-b border-[rgba(67,179,155,.16)] bg-[rgba(67,179,155,.045)] px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[.16em] text-[color:var(--accent-light)]">
        Private launch · Audit checkout remains gated until validation is complete
      </div>

      <section className="rev-hero mx-auto flex max-w-[1240px] flex-col items-center px-5 pb-16 pt-14 text-center md:pb-20 md:pt-16">
        <p className="rev-hero-badge">Quote Recovery for high-ticket contractors</p>
        <h1 className="mt-6 max-w-[980px] text-balance font-[family:var(--font-marketing-display)] text-[clamp(3rem,5.7vw,5.65rem)] leading-[.94] tracking-[-.018em]">
          Find the estimates that still deserve{" "}
          <em className="text-[color:var(--accent-light)]">recovery attention.</em>
        </h1>
        <p className="mt-6 max-w-[760px] text-[16px] leading-7 text-[color:var(--text-muted)] md:text-[17px]">
          REVORY turns estimate and follow-up exports into a prioritized,
          evidence-first read for remodeling, roofing, premium HVAC, pool building,
          and kitchen-and-bath teams.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className="rev-button-primary" href="/start">
            Preview the US$799 audit →
          </Link>
          <a className="rev-button-secondary" href="#how">
            See how the read works
          </a>
          <Link className="rev-button-ghost" href="/demo">
            Explore sample workspace
          </Link>
        </div>
        <p className="mt-4 text-xs leading-6 text-[color:var(--text-subtle)]">
          Self-service · CSV/XLSX-first · Deterministic rules · No CRM replacement
        </p>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 pb-20">
        <div className="rev-trust-strip grid overflow-hidden rounded-[24px] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Estimate-first", "The quote remains the central object."],
            ["Evidence-first", "Every finding includes traceable source fields."],
            ["Honest values", "Estimated and operational bases stay separate."],
            ["Built to review", "REVORY recommends; your team decides."],
          ].map(([title, text]) => (
            <div className="rev-trust-item" key={title}>
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rev-section-band scroll-mt-24" id="how">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-24 lg:grid-cols-[minmax(0,.92fr)_minmax(420px,1.08fr)]">
          <div>
            <SectionIntro
              body="The workflow stays narrow: import the evidence, confirm its quality, then inspect what deserves attention first."
              kicker="How it works"
              title={
                <>
                  A short read, not another <em>operating system.</em>
                </>
              }
            />
            <div className="mt-9 grid gap-3">
              {steps.map(({ number, text, title }) => (
                <article className="rev-step-card" key={number}>
                  <span className="rev-step-number">{number}</span>
                  <div>
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[color:var(--text-muted)]">
                      {text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <SampleRead />
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-24" id="signals">
        <SectionIntro
          body="Current claims map directly to implemented Tier 1 rules. Missing evidence suppresses unsupported financial output."
          kicker="Current Quote Recovery scope"
          title={
            <>
              Six deterministic signals. <em>No inflated analytics.</em>
            </>
          }
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentSignals.map(({ icon, text, title }) => (
            <article className="rev-marketing-card rounded-[22px] p-6" key={title}>
              <SignalIcon type={icon} />
              <h3 className="mt-6 font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rev-section-band">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-24 lg:grid-cols-2">
          <div>
            <p className="rev-kicker">Product truth</p>
            <h2 className="mt-4 font-[family:var(--font-marketing-display)] text-[clamp(2.6rem,4.5vw,4.35rem)] leading-[.98]">
              Quote Recovery is current.{" "}
              <em className="text-[color:var(--accent-light)]">
                Revenue Realization is gated.
              </em>
            </h2>
          </div>
          <div className="grid gap-4">
            <RoadmapCard
              text="Estimate and activity intake, Data Quality, six Quote Recovery rules, evidence detail, dispositions, history and export."
              title="Available in the current local product"
            />
            <RoadmapCard
              gated
              text="Invoice reconciliation, approved change orders, deterministic underbilling and margin-risk findings require Sprints 7–11."
              title="Roadmap — not sold as current capability"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-24" id="pricing">
        <SectionIntro
          centered
          body="Prices remain validation targets until the commercial gates pass. No legacy Stripe price is reused."
          kicker="Pricing hypothesis"
          title={
            <>
              Start with one focused <em>Quote Recovery read.</em>
            </>
          }
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          <PriceCard
            body="A focused self-service read with prioritized findings, evidence, CSV export and an executive report."
            cta="Preview the audit"
            label="Quote Recovery Audit"
            note="one time"
            price="$799"
            primary
          />
          <PriceCard
            body="Adds repeated reads and movement over time after the audit and paid-beta gates pass."
            cta="Review the recurring plan"
            label="Starter"
            note="per month · gated"
            price="$399"
          />
        </div>
      </section>

      <section className="rev-section-band scroll-mt-24" id="faq">
        <div className="mx-auto max-w-4xl px-5 py-24">
          <SectionIntro
            body="Short answers, clear limitations and no hidden service layer."
            kicker="FAQ"
            title={
              <>
                Questions before the <em>first import.</em>
              </>
            }
          />
          <div className="mt-10 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
            {faq.map(([question, answer]) => (
              <details className="group py-5" key={question}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  <span>{question}</span>
                  <span className="text-xl text-[color:var(--accent-light)] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-3xl pt-3 text-sm leading-7 text-[color:var(--text-muted)]">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-24">
        <div className="rev-shell-hero rev-accent-mist rounded-[34px] px-6 py-16 text-center md:px-12">
          <p className="rev-kicker">Start narrow</p>
          <h2 className="mx-auto mt-4 max-w-4xl font-[family:var(--font-marketing-display)] text-[clamp(2.8rem,5vw,4.8rem)] leading-[.96]">
            See which estimates your team should{" "}
            <em className="text-[color:var(--accent-light)]">inspect first.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
            Upload structured exports, confirm Data Quality and get a prioritized
            Quote Recovery read without replacing your operating stack.
          </p>
          <Link className="rev-button-primary mt-7" href="/start">
            Preview the audit →
          </Link>
        </div>
      </section>

      <footer className="border-t border-[color:var(--border)] px-5 py-8">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-5">
          <RevoryLogo compact />
          <p className="text-xs text-[color:var(--text-subtle)]">
            © 2026 REVORY. Quote Recovery intelligence for high-ticket service
            businesses.
          </p>
          <div className="flex gap-5 text-xs text-[color:var(--text-muted)]">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/sign-in">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SectionIntro({
  body,
  centered = false,
  kicker,
  title,
}: {
  body: string;
  centered?: boolean;
  kicker: string;
  title: ReactNode;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="rev-kicker">{kicker}</p>
      <h2 className="mt-4 font-[family:var(--font-marketing-display)] text-[clamp(2.55rem,4.4vw,4.25rem)] leading-[.98] tracking-[-.012em] [&_em]:text-[color:var(--accent-light)]">
        {title}
      </h2>
      <p className="mt-5 text-[15px] leading-7 text-[color:var(--text-muted)]">
        {body}
      </p>
    </div>
  );
}

function SampleRead() {
  return (
    <aside className="rev-sample-read rounded-[30px] p-5 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="rev-label">Illustrative sample read</p>
          <h2 className="mt-2 text-xl font-bold">Estimated opportunity at risk</h2>
        </div>
        <span className="rounded-full border border-[color:var(--border-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent-light)]">
          Sample data
        </span>
      </div>
      <div className="mt-5 rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(67,179,155,.075)] p-5">
        <p className="rev-label">Estimated recoverable</p>
        <p className="mt-2 text-4xl font-bold">$126K</p>
        <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
          {"Modeled from imported estimate value and rule evidence — not guaranteed revenue."}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rev-card rounded-2xl p-4">
          <p className="rev-label">Stale high-value</p>
          <p className="mt-2 text-2xl font-bold">9</p>
        </div>
        <div className="rev-card rounded-2xl p-4">
          <p className="rev-label">Overdue follow-up</p>
          <p className="mt-2 text-2xl font-bold">21</p>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-xs">
        {[
          ["HVAC replacement", "$18.4K", "21 days"],
          ["Roof replacement", "$12.8K", "16 days"],
          ["Pool renovation", "Operational", "Missing next step"],
        ].map(([name, value, signal]) => (
          <div className="rev-sample-row" key={name}>
            <span className="font-bold">{name}</span>
            <span className="text-right text-[color:var(--text-muted)]">
              {value} · {signal}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function SignalIcon({ type }: { type: SignalIcon }) {
  const paths: Record<SignalIcon, ReactNode> = {
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    value: (
      <>
        <path d="M12 3v18" />
        <path d="M16.5 6.5h-6.2a3 3 0 0 0 0 6h3.4a3 3 0 0 1 0 6H7" />
      </>
    ),
    activity: (
      <>
        <path d="M3 12h4l2.2-5 4.1 10 2.2-5H21" />
      </>
    ),
    aging: (
      <>
        <path d="M8 3h8M8 21h8" />
        <path d="M9 3c0 4 6 4.5 6 9s-6 5-6 9" />
        <path d="M15 3c0 4-6 4.5-6 9s6 5 6 9" />
      </>
    ),
    owner: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.6-3.4 2.4-5.2 5.5-5.2 1.5 0 2.7.4 3.6 1.2" />
        <path d="M15 15h6M18 12v6" />
      </>
    ),
    review: (
      <>
        <path d="M12 3 20 7v5c0 4.8-3.1 8-8 9-4.9-1-8-4.2-8-9V7l8-4Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
  };

  return (
    <div className="rev-signal-icon">
      <svg
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        {paths[type]}
      </svg>
    </div>
  );
}

function RoadmapCard({
  gated = false,
  text,
  title,
}: {
  gated?: boolean;
  text: string;
  title: string;
}) {
  return (
    <article
      className={`rev-marketing-card rounded-[22px] border p-5 ${
        gated ? "border-[rgba(245,166,35,.22)]" : "border-[color:var(--border-accent)]"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wider ${
          gated ? "text-[color:var(--warning)]" : "text-[color:var(--accent-light)]"
        }`}
      >
        {gated ? "Gated" : "Current"}
      </p>
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[color:var(--text-muted)]">{text}</p>
    </article>
  );
}

function PriceCard({
  body,
  cta,
  label,
  note,
  price,
  primary = false,
}: {
  body: string;
  cta: string;
  label: string;
  note: string;
  price: string;
  primary?: boolean;
}) {
  return (
    <article
      className={`rev-marketing-card flex min-h-[370px] flex-col rounded-[28px] border p-6 ${
        primary ? "rev-price-primary border-[color:var(--border-accent)]" : "border-[color:var(--border)]"
      }`}
    >
      <p className="rev-label">{primary ? "Primary offer" : "Recurring gate"}</p>
      <h3 className="mt-3 text-xl font-bold">{label}</h3>
      <p className="mt-7 text-5xl font-bold tracking-[-.05em]">{price}</p>
      <p className="mt-2 text-xs uppercase tracking-wider text-[color:var(--text-subtle)]">
        {note}
      </p>
      <p className="mt-6 text-sm leading-7 text-[color:var(--text-muted)]">{body}</p>
      <Link
        className={primary ? "rev-button-primary mt-auto" : "rev-button-secondary mt-auto"}
        href="/start"
      >
        {cta}
      </Link>
    </article>
  );
}
