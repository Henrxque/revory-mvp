"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AiRecurringMonitorControls } from "./AiRecurringMonitorControls";
import { labels, inputClass, type RecurringView } from "./recurring-monitor-view";
import styles from "./AiRecurringMonitor.module.css";

export type { RecurringView } from "./recurring-monitor-view";
type Section = "overview" | "usage" | "settings";
type Run = RecurringView["runs"][number];
type Investigation = RecurringView["investigations"][number];

const sections: { id: Section; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "usage", label: "Send usage data" },
  { id: "settings", label: "Settings" },
];
const reasonLabels: Record<string, string> = {
  BASELINE_PENDING: "A second comparable period is needed to show what changed.",
  ADJACENT_EQUAL_DURATION_WINDOWS_REQUIRED: "These periods are not consecutive or have different lengths.",
  CONSOLIDATION_LAG_CHANGED: "The time allowed for data to settle changed between periods.",
  SOURCE_OR_BUCKET_SCOPE_CHANGED: "The sources or usage scope changed between periods.",
  EXCLUDED_SOURCE_ROWS: "Some source rows could not be included.",
  SOURCE_CLOSURE_INCOMPLETE: "A source does not cover the complete closed period.",
  COMPARABLE_EVIDENCE_MISSING: "There is not enough matching evidence to compare these periods.",
};
const deliveryLabels: Record<string, string> = {
  SENT: "Accepted by email provider", PENDING: "Email queued", RETRY: "Delivery retry scheduled",
  FAILED: "Email delivery failed", NEEDS_ATTENTION: "Delivery needs attention", SENDING: "Sending email", CANCELED: "Email canceled", SKIPPED: "Email not sent", SUPPRESSED: "Email not sent",
};
function readable(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
}
function unitLabel(value: string) {
  return /^[A-Z]{3}$/.test(value) ? value : readable(value);
}
function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}
function period(run: Pick<Run, "start" | "end">) {
  return `${date(run.start)} – ${date(run.end)}`;
}
function Badge({ status }: { status: string }) {
  const tone = ["ACTIVE", "COMPLETED", "SENT"].includes(status) ? styles.good
    : ["NEEDS_ATTENTION", "WAITING_LEDGER", "RETRY", "LIMITED", "SUPPRESSED"].includes(status) ? styles.attention : "";
  return <span className={`${styles.badge} ${tone}`}>{labels[status] ?? readable(status)}</span>;
}
function InvestigationDetail({ item, view, busy, act }: {
  item: Investigation; view: RecurringView; busy: boolean;
  act: (action: string, data?: object) => Promise<void>;
}) {
  return <div className={styles.investigationDetail}>
    <div className={styles.evidenceSummary}>
      <div><span className={styles.meta}>Previous difference</span><strong>{item.previous ?? "Unavailable"} <small>{unitLabel(item.unit)}</small></strong></div>
      <div><span className={styles.meta}>Latest difference</span><strong>{item.current ?? "Unavailable"} <small>{unitLabel(item.unit)}</small></strong></div>
      <Link href={"/app/ai-integrity/reports/" + item.snapshotId} className={styles.textLink}>View source evidence</Link>
    </div>
    <p className={styles.helper}>{item.reason ? reasonLabels[item.reason] ?? "The comparison is limited. Open the evidence for details." : item.kind === "UNATTRIBUTED_PROVIDER_SPEND" ? "Reported provider spend without an eligible attribution. This is not proof of financial loss." : "The usage difference compares your ledger with the provider in the same unit. It is not a dollar amount."}</p>
    <form className={styles.reviewForm} onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      void act("REVIEW", { id: item.id, revision: item.revision, status: data.get("status"), note: data.get("note") });
    }}>
      <label>Investigation status<select name="status" defaultValue={["OPEN", "INVESTIGATING", "EXPECTED", "VERIFYING"].includes(item.status) ? item.status : "OPEN"} className={inputClass}>
        {["OPEN", "INVESTIGATING", "EXPECTED", "VERIFYING"].map(status => <option key={status} value={status}>{labels[status]}</option>)}
      </select></label>
      <label>What did you check?<textarea name="note" required maxLength={2000} rows={3} className={inputClass} placeholder="Describe what you found or changed, so the next reading has context." /></label>
      <div className={styles.formFooter}><p className={styles.helper}>Awaiting verification checks the next comparable period. An absent difference does not prove a fix or recovered money.</p><button disabled={busy} className={styles.primary}>Save investigation</button></div>
    </form>
    {view.notes.some(note => note.id === item.id) ? <div className={styles.notes}><h4>Investigation history</h4>{view.notes.filter(note => note.id === item.id).map((note, index) => <p key={index}>{labels[note.status] ?? readable(note.status)}: {note.note}</p>)}</div> : null}
  </div>;
}
function RunDetail({ run, busy, act }: { run: Run; busy: boolean; act: (action: string, data?: object) => Promise<void> }) {
  return <div className={styles.runDetail}>
    {run.errorCode ? <p className={styles.helper}>{run.errorCode === "SOURCE_NO_REPORTED_ROWS" ? "A source returned no rows. Check the source scope; missing data was not treated as zero usage." : run.errorCode === "PERIOD_SKIPPED_BY_OWNER" ? "You skipped this period with an audit note. Later comparisons retain the evidence gap." : "This reading needs attention. Check your source connections and the completeness of your usage data before the next attempt."}</p> : <p className={styles.helper}>Closed UTC period. Comparisons require consecutive periods with matching scope and complete evidence.</p>}
    <div className={styles.actions}>
      {run.snapshotId ? <Link href={"/app/ai-integrity/reports/" + run.snapshotId} className={styles.secondary}>Open report and evidence</Link> : null}
      {run.comparisonId ? <a href={"/api/ai-integrity/monitoring/" + run.comparisonId + "/export"} className={styles.textLink}>Export comparison</a> : null}
      {["NEEDS_ATTENTION", "RETRY"].includes(run.status) ? <Link className={styles.textLink} href="/app/ai-integrity/connections">Check source connections</Link> : null}
    </div>
    {["READY", "RETRY", "NEEDS_ATTENTION", "WAITING_LEDGER"].includes(run.status) ? <details className={styles.disclosure}><summary>Skip a period with incomplete data</summary><form className={styles.reviewForm} onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget); void act("SKIP", { runId: run.id, note: data.get("note") });
    }}><label>Why is this period unavailable?<textarea name="note" required maxLength={1000} className={inputClass} /></label><label className={styles.check}><input type="checkbox" required />Keep the evidence gap and continue to the next period. This does not confirm zero usage or resolution.</label><button disabled={busy} className={styles.secondary}>Record gap and continue</button></form></details> : null}
  </div>;
}

export function AiRecurringMonitor({ view }: { view: RecurringView }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>(view.subscription ? "overview" : "settings");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [token, setToken] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [showAllRuns, setShowAllRuns] = useState(false);
  const [showAllInvestigations, setShowAllInvestigations] = useState(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const runs = [...view.runs].sort((a, b) => b.start.localeCompare(a.start));
  const latestReport = runs.find(run => run.snapshotId);
  const nextRun = runs.find(run => !["COMPLETED", "LIMITED"].includes(run.status));
  const needsReview = view.investigations.filter(item => ["OPEN", "INVESTIGATING"].includes(item.status));
  const verifying = view.investigations.filter(item => item.status === "VERIFYING");
  const visibleInvestigations = view.investigations.filter(item => filter === "all" || (filter === "review" ? ["OPEN", "INVESTIGATING"].includes(item.status) : item.status === "VERIFYING"));
  const shownInvestigations = showAllInvestigations ? visibleInvestigations : visibleInvestigations.slice(0, 5);
  const visibleRuns = showAllRuns ? runs : runs.slice(0, 5);
  const scheduleStatus = view.schedule?.status ?? "NOT_CONFIGURED";
  const needsSetup = !view.schedule;
  const subscriptionBlocked = view.subscription?.status !== "ACTIVE";
  const collectionProblem = nextRun && ["NEEDS_ATTENTION", "RETRY"].includes(nextRun.status);
  const waitingLedger = nextRun?.status === "WAITING_LEDGER";
  const actionTitle = subscriptionBlocked ? "Activate your monitoring access" : needsSetup ? "Set up your first monitoring period" : scheduleStatus !== "ACTIVE" ? "Your monitoring schedule needs permission review" : collectionProblem ? "A reading needs your attention" : waitingLedger ? "Your next period needs usage data" : needsReview.length ? `${needsReview.length} ${needsReview.length === 1 ? "difference is" : "differences are"} ready to review` : nextRun?.status === "RUNNING" ? "Your sources are being read" : nextRun?.status === "READY" ? "Your next period is queued" : "Your next reading starts with a complete period";
  const actionDescription = subscriptionBlocked ? "Review the monthly plan and activate access before authorizing recurring readings." : needsSetup ? "Connect Stripe and OpenAI, review customer links, then choose when to read your closed periods." : scheduleStatus !== "ACTIVE" ? "Review your permissions in Settings to resume recurring readings." : collectionProblem ? "Review the reading details below. Source access or incomplete data may be preventing a comparison." : waitingLedger ? "Send your internal usage ledger for the closed period. Missing data is never counted as zero." : needsReview.length ? "Open a difference, check its evidence and record what you found. The next comparable reading can verify the result." : nextRun?.status === "READY" ? "The period is ready for the next scheduled processing attempt. Readings keep the evidence from each source." : "Compare Stripe billing context, OpenAI usage and costs, and your internal product usage with a complete ledger.";
  async function act(action: string, data: object = {}) {
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/ai-integrity/recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save. Please try again.");
      if (result.url) { window.location.assign(result.url); return; }
      if (result.token) setToken(result.token);
      if (action === "REVOKE_TOKEN") setToken("");
      const emailTestMessage = result.status === "SENT"
        ? "The email provider accepted your test. Check your inbox and spam folder. Repeat requests reuse today's test."
        : "Your test is queued or needs attention. Check Email activity; repeat requests reuse today's test.";
      setMessage(action === "TOKEN" ? "Token created. Copy it now; it will not be shown again." : action === "TEST_EMAIL" ? emailTestMessage : "Saved.");
      router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function changeSection(value: Section) {
    setSection(value); setMessage(""); setToken("");
  }
  function focusDifferences() {
    setFilter("review"); setSelected(needsReview[0]?.id ?? null);
    reviewHeading.current?.focus();
    reviewHeading.current?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  return <div className={styles.monitor} aria-busy={busy}>
    <header className={styles.header}>
      <div><p className="rev-kicker">Integrity workspace</p><h1>Monitoring</h1><p className={styles.subtitle}>See what changed. Know what to check next.</p></div>
      <div className={styles.headerStatus}><Badge status={scheduleStatus === "NOT_CONFIGURED" ? "SETUP_REQUIRED" : scheduleStatus} /><span>{view.schedule ? `${view.schedule.periodDays === 7 ? "Weekly" : "Daily"} closed periods · UTC` : "Read-only source access"}</span></div>
    </header>
    {view.runtime !== "LIVE" ? <p className={styles.environment}><span className={styles.environmentDot} />{view.runtime === "LOCAL" ? "Local verification · No live charges or remote scheduled readings." : "Sandbox environment · Test payments only."}</p> : null}
    <nav className={styles.navigation} aria-label="Monitoring sections">{sections.map(item => <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} onClick={() => changeSection(item.id)}>{item.label}</button>)}</nav>
    <div role="status" aria-live="polite" className={message ? `${styles.feedback} ${failed ? styles.feedbackError : ""}` : styles.srOnly}>{busy ? "Saving changes…" : message}</div>
    {section === "overview" ? <div className={styles.overview}>
      <section className={styles.nextAction} aria-labelledby="monitor-next-action">
        <div><p className="rev-kicker">{subscriptionBlocked || needsSetup ? "Get started" : "Your next step"}</p><h2 id="monitor-next-action">{actionTitle}</h2><p>{actionDescription}</p></div>
        {subscriptionBlocked || needsSetup || scheduleStatus !== "ACTIVE" ? <button className={styles.primary} onClick={() => changeSection("settings")}>{subscriptionBlocked ? "Review monitoring plan" : needsSetup ? "Set up monitoring" : "Review permissions"}</button>
          : collectionProblem ? <a className={styles.primary} href={"#period-" + nextRun.id} onClick={() => { const target = document.getElementById("period-" + nextRun.id); if (target instanceof HTMLDetailsElement) target.open = true; }}>Review reading</a>
          : waitingLedger ? <button className={styles.primary} onClick={() => changeSection("usage")}>Send usage data</button>
          : needsReview.length ? <button className={styles.primary} onClick={focusDifferences}>Review differences</button>
          : latestReport ? <Link href={"/app/ai-integrity/reports/" + latestReport.snapshotId} className={styles.primary}>View latest report</Link>
          : <button className={styles.primary} onClick={() => changeSection("usage")}>Prepare usage data</button>}
      </section>
      <section className={styles.summaryGrid} aria-label="Monitoring summary">
        <div><p className={styles.meta}>Needs your review</p><p className={styles.metric}>{needsReview.length}<span>{needsReview.length === 1 ? "difference" : "differences"}</span></p><p className={styles.helper}>{verifying.length ? `${verifying.length} awaiting next-period verification` : "From the recent investigations shown below"}</p></div>
        <div><p className={styles.meta}>Latest report</p><p className={styles.summaryValue}>{latestReport ? date(latestReport.start) : "No report yet"}</p><p className={styles.helper}>{latestReport ? `Through ${date(latestReport.end)} · UTC` : "Your first completed reading appears here"}</p></div>
        <div><p className={styles.meta}>Next period</p><p className={styles.summaryValue}>{view.schedule ? date(view.schedule.nextStart) : "Not scheduled"}</p><p className={styles.helper}>{nextRun ? labels[nextRun.status] ?? readable(nextRun.status) : view.schedule ? `Reads wait ${view.schedule.lagHours}h after the period closes` : "Choose a daily or weekly schedule"}</p></div>
      </section>
      {!view.schedule ? <section className={styles.panel} aria-labelledby="setup-heading"><div className={styles.sectionHeading}><div><h2 id="setup-heading">A clear path to your first reading</h2><p>Set up once. Keep your internal usage data up to date.</p></div></div><ol className={styles.setupSteps}><li><span>01</span><div><h3>Connect your sources</h3><p>Authorize read-only Stripe and OpenAI access.</p><Link href="/app/ai-integrity/connections" className={styles.textLink}>Connect sources</Link></div></li><li><span>02</span><div><h3>Prepare product usage</h3><p>Upload your internal ledger and confirm customer links.</p><Link href="/app/ai-integrity/attribution" className={styles.textLink}>Review customer links</Link><button className={styles.textLink} onClick={() => changeSection("usage")}>Send usage data</button></div></li><li><span>03</span><div><h3>Choose your schedule</h3><p>Review paid access, period length and read permissions.</p><button className={styles.textLink} onClick={() => changeSection("settings")}>Set up monitoring</button></div></li></ol></section> : null}
      <section className={styles.panel} aria-labelledby="differences-heading">
        <div className={styles.sectionHeading}><div><h2 id="differences-heading" ref={reviewHeading} tabIndex={-1}>Differences to investigate</h2><p>Review the evidence, add context, then verify in a later comparable period.</p></div><span className={styles.count}>{view.investigations.length} recent</span></div>
        <div className={styles.filters} role="group" aria-label="Filter differences">{[{ id: "all", label: "All differences" }, { id: "review", label: "Needs review" }, { id: "verifying", label: "Awaiting verification" }].map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setShowAllInvestigations(false); }}>{item.label}</button>)}</div>
        <div className={styles.investigations}>{visibleInvestigations.length ? shownInvestigations.map(item => <article className={styles.investigation} key={item.id}>
          <div className={styles.investigationRow}><div className={styles.findingIcon} aria-hidden="true">{item.movement === "SUPPRESSED" ? "?" : "≠"}</div><div className={styles.findingTitle}><h3>{item.kind === "UNATTRIBUTED_PROVIDER_SPEND" ? "Provider spend without attribution" : "Product and provider usage differ"}</h3><p>{item.scope}</p><div className={styles.findingMeta}><span className={styles.movement}>{labels[item.movement] ?? readable(item.movement)}</span><span>{labels[item.status] ?? readable(item.status)}</span></div></div><button className={styles.secondary} aria-expanded={selected === item.id} aria-controls={"investigation-" + item.id} onClick={() => setSelected(selected === item.id ? null : item.id)}>{selected === item.id ? "Close review" : "Review difference"}</button></div>
          <div id={"investigation-" + item.id} hidden={selected !== item.id}>{selected === item.id ? <InvestigationDetail key={item.id + ":" + item.revision} item={item} view={view} busy={busy} act={act} /> : null}</div>
        </article>) : <div className={styles.empty}><h3>{filter === "all" ? "No differences to show yet" : "No differences in this view"}</h3><p>{filter === "all" ? "Your readings will appear here when there is evidence to review. No findings does not guarantee complete coverage." : "Choose another filter to see the other recent investigations."}</p></div>}</div>
        {visibleInvestigations.length > 5 ? <button className={styles.more} onClick={() => setShowAllInvestigations(!showAllInvestigations)}>{showAllInvestigations ? "Show fewer differences" : `Show all ${visibleInvestigations.length} differences in this view`}</button> : null}
      </section>
      <section className={styles.panel} aria-labelledby="readings-heading"><div className={styles.sectionHeading}><div><h2 id="readings-heading">Period history</h2><p>Each reading keeps its report, evidence and comparison limits.</p></div><span className={styles.utc}>UTC periods</span></div>
        <div className={styles.periodList}>{visibleRuns.length ? visibleRuns.map(run => <details key={run.id} id={"period-" + run.id} className={styles.period}><summary><span className={styles.periodDate}>{period(run)}</span><Badge status={run.status} /><span className={styles.periodAction}>Details <span aria-hidden="true">+</span></span></summary><RunDetail run={run} busy={busy} act={act} /></details>) : <div className={styles.empty}><h3>Waiting for your first closed period</h3><p>Complete setup and send a reviewed ledger to prepare a reading.</p></div>}</div>
        {runs.length > 5 ? <button className={styles.more} onClick={() => setShowAllRuns(!showAllRuns)}>{showAllRuns ? "Show recent periods" : `Show all ${runs.length} recent periods`}</button> : null}
        <p className={styles.panelFootnote}>A missing period limits comparisons. “No longer observed” is not proof of a fix or recovered money.</p>
      </section>
      <details className={styles.activity}><summary>Email activity <span>{view.notices.length} recent · Details</span></summary><p className={styles.helper}>Delivery status is separate from findings. Email preferences are in Settings.</p><ul>{view.notices.map(notice => <li key={notice.id}><span>{notice.kind === "LEDGER_REQUIRED" ? "A period needs internal usage data" : notice.kind === "MONITORING_FAILED" ? "A source reading needs attention" : notice.kind === "COMPARISON_LIMITED" ? "A comparison has incomplete evidence" : notice.kind === "DIFFERENCES_CHANGED" ? "Differences changed between periods" : readable(notice.kind)}</span><span>{deliveryLabels[notice.status] ?? readable(notice.status)}</span></li>)}</ul>{!view.notices.length ? <p className={styles.helper}>No notification deliveries recorded.</p> : null}</details>
    </div> : <div><div className={styles.subpageHeading}><h2>{section === "usage" ? "Keep your readings complete" : "Your monitoring preferences"}</h2><p>{section === "usage" ? "Stripe and OpenAI provide their records. Send your product’s internal usage so REVORY can compare the sources." : "Manage your schedule, read permissions, email preferences and subscription."}</p></div><AiRecurringMonitorControls view={view} section={section} busy={busy} token={token} setToken={setToken} setMessage={setMessage} act={act} /></div>}
  </div>;
}
