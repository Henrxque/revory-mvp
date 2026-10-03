"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewDisposition, ReviewUsefulness } from "@/domain/ai-integrity/validation-review";

const dispositions: Array<[ReviewDisposition, string]> = [["CONFIRMED_DIFFERENCE", "Difference supported by the sources"], ["EXPECTED_DIFFERENCE", "Expected difference with an explanation"], ["FALSE_POSITIVE", "False positive in the comparison"], ["INSUFFICIENT_EVIDENCE", "Not enough evidence to decide"]];
export function AiValidationReviewPanel({ snapshotId, fingerprint }: { snapshotId: string; fingerprint?: string }) {
  const router = useRouter(), requestKey = useRef<string | null>(null);
  const [conclusion, setConclusion] = useState<ReviewDisposition | "">("");
  const [usefulness, setUsefulness] = useState<ReviewUsefulness | "">("");
  const [checked, setChecked] = useState(false), [assistance, setAssistance] = useState("");
  const [minutes, setMinutes] = useState(""), [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const fieldClass = "mt-2 min-h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--background-card)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--accent)]";
  function edited() { requestKey.current = null; setMessage(""); setError(""); }
  async function save() {
    requestKey.current ??= crypto.randomUUID(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/ai-integrity/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshotId, requestKey: requestKey.current, comment,
        ...(fingerprint ? { kind: "FINDING", fingerprint, disposition: conclusion, sourceEvidenceChecked: checked }
          : { kind: "REPORT", usefulness, assistanceRequired: assistance === "yes", preparationMinutes: Number(minutes) }) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setMessage(data.replayed ? "Existing review returned. The evidence is unchanged." : "Review saved separately from the report evidence.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save review."); }
    finally { setBusy(false); }
  }
  const complete = comment.trim().length >= 12 && (fingerprint ? conclusion && checked : usefulness && assistance && minutes !== "" && Number.isInteger(Number(minutes)) && Number(minutes) >= 0 && Number(minutes) <= 10080);
  return <section className="rev-shell-panel space-y-4 rounded-[26px] p-5 md:p-7"><div><p className="rev-kicker">Synthetic review rehearsal</p><h2 className="mt-3 text-lg font-semibold">{fingerprint ? "Record your source review" : "How useful was this report?"}</h2><p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">{fingerprint ? "Your conclusion adds a review record. It does not change the calculation or establish a financial loss." : "Record usefulness and preparation effort. These are self-reported observations of a synthetic test, not results from paying customers."}</p></div>
    {fingerprint ? <><label className="block text-xs text-[color:var(--text-muted)]">Review conclusion<select className={fieldClass} value={conclusion} onChange={(event) => { setConclusion(event.target.value as ReviewDisposition); edited(); }}><option value="">Choose after checking the sources</option>{dispositions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="flex gap-3 text-xs leading-6 text-[color:var(--text-muted)]"><input type="checkbox" checked={checked} onChange={(event) => { setChecked(event.target.checked); edited(); }} /><span>I checked the available source records, period, units and limitations.</span></label></>
      : <div className="grid gap-4 md:grid-cols-3"><label className="text-xs text-[color:var(--text-muted)]">Report usefulness<select className={fieldClass} value={usefulness} onChange={(event) => { setUsefulness(event.target.value as ReviewUsefulness); edited(); }}><option value="">Choose a response</option><option value="USEFUL">Useful</option><option value="PARTLY_USEFUL">Partly useful</option><option value="NOT_USEFUL">Not useful</option></select></label><label className="text-xs text-[color:var(--text-muted)]">Human assistance needed<select className={fieldClass} value={assistance} onChange={(event) => { setAssistance(event.target.value); edited(); }}><option value="">Choose a response</option><option value="no">No</option><option value="yes">Yes</option></select></label><label className="text-xs text-[color:var(--text-muted)]">Preparation time · minutes<input className={fieldClass} type="number" min="0" max="10080" step="1" value={minutes} onChange={(event) => { setMinutes(event.target.value); edited(); }} /></label></div>}
    <label className="block text-xs text-[color:var(--text-muted)]">Review explanation<textarea className={`${fieldClass} min-h-28 [font-family:var(--font-dm-sans)]`} value={comment} maxLength={1200} onChange={(event) => { setComment(event.target.value); edited(); }} placeholder={fingerprint ? "What did you check, and what explains your conclusion?" : "What decision did this help with, or where did you get stuck?"} /></label>
    <p className="text-[11px] leading-6 text-[color:var(--text-subtle)]">Use 12–1200 characters. Keep personal data, secrets and raw customer records out of comments. A correction adds a new version; earlier reviews remain in history until report retention.</p>
    {error ? <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p> : null}{message ? <p role="status" className="text-sm text-[color:var(--accent)]">{message}</p> : null}
    <button type="button" className="rev-action-button px-5 py-3 text-sm" disabled={busy || !complete} onClick={save}>{busy ? "Saving review…" : "Save synthetic review"}</button>
  </section>;
}
