export const AI_REVIEW_VERSION = "validation-review/rehearsal-v1";
export const AI_REVIEW_MODE = "SYNTHETIC_REHEARSAL";
export const AI_REVIEW_DISPOSITIONS = ["CONFIRMED_DIFFERENCE", "EXPECTED_DIFFERENCE", "FALSE_POSITIVE", "INSUFFICIENT_EVIDENCE"] as const;
export const AI_REVIEW_USEFULNESS = ["USEFUL", "PARTLY_USEFUL", "NOT_USEFUL"] as const;
export type ReviewDisposition = typeof AI_REVIEW_DISPOSITIONS[number];
export type ReviewUsefulness = typeof AI_REVIEW_USEFULNESS[number];
export type AiReviewInput = { snapshotId: string; requestKey: string; comment: string } & (
  { kind: "FINDING"; fingerprint: string; disposition: ReviewDisposition; sourceEvidenceChecked: true }
  | { kind: "REPORT"; usefulness: ReviewUsefulness; assistanceRequired: boolean; preparationMinutes: number }
);

export function parseAiReviewInput(raw: unknown): AiReviewInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Review must be an object.");
  const body = raw as Record<string, unknown>;
  const common = ["kind", "snapshotId", "requestKey", "comment"];
  const allowed = [...common, ...(body.kind === "FINDING" ? ["fingerprint", "disposition", "sourceEvidenceChecked"] : ["usefulness", "assistanceRequired", "preparationMinutes"])];
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new Error("Unsupported review fields.");
  if (typeof body.snapshotId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(body.snapshotId)) throw new Error("A valid report ID is required.");
  if (typeof body.requestKey !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(body.requestKey)) throw new Error("A valid review request key is required.");
  if (typeof body.comment !== "string" || body.comment.trim().length < 12 || body.comment.length > 1200) throw new Error("Explain the review in 12–1200 characters, without personal or confidential data.");
  const base = { snapshotId: body.snapshotId, requestKey: body.requestKey, comment: body.comment.trim() };
  if (body.kind === "FINDING") {
    if (typeof body.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(body.fingerprint)) throw new Error("A valid finding reference is required.");
    if (!AI_REVIEW_DISPOSITIONS.includes(body.disposition as ReviewDisposition)) throw new Error("Choose a review conclusion.");
    if (body.sourceEvidenceChecked !== true) throw new Error("Review the available source evidence before recording a conclusion.");
    return { ...base, kind: "FINDING", fingerprint: body.fingerprint, disposition: body.disposition as ReviewDisposition, sourceEvidenceChecked: true };
  }
  if (body.kind !== "REPORT" || !AI_REVIEW_USEFULNESS.includes(body.usefulness as ReviewUsefulness)) throw new Error("Choose how useful this report was.");
  if (typeof body.assistanceRequired !== "boolean") throw new Error("Declare whether assistance was needed.");
  if (!Number.isInteger(body.preparationMinutes) || Number(body.preparationMinutes) < 0 || Number(body.preparationMinutes) > 10080) throw new Error("Preparation time must be whole minutes from 0 to 10080.");
  return { ...base, kind: "REPORT", usefulness: body.usefulness as ReviewUsefulness, assistanceRequired: body.assistanceRequired, preparationMinutes: Number(body.preparationMinutes) };
}

export type AiReviewRecord = { revision: number; kind: string; fingerprint: string | null; disposition: string | null; usefulness: string | null; assistanceRequired: boolean | null; preparationMinutes: number | null; comment: string; mode: string };

export function summarizeAiReviews(fingerprints: string[], events: AiReviewRecord[]) {
  if (new Set(fingerprints).size !== fingerprints.length) throw new Error("Finding references must be unique.");
  const latest = new Map<string, AiReviewRecord>();
  const revisions = new Set<number>();
  for (const event of [...events].sort((a, b) => a.revision - b.revision)) {
    if (!Number.isInteger(event.revision) || event.revision < 1 || revisions.has(event.revision)) throw new Error("Review revisions must be unique and ordered.");
    revisions.add(event.revision);
    if (event.mode !== AI_REVIEW_MODE) throw new Error("Real validation records are not supported in this rehearsal.");
    if (event.kind === "FINDING") {
      if (!event.fingerprint || !fingerprints.includes(event.fingerprint) || !AI_REVIEW_DISPOSITIONS.includes(event.disposition as ReviewDisposition)) throw new Error("Review does not belong to the report findings.");
      latest.set(event.fingerprint, event);
    } else if (event.kind === "REPORT" && AI_REVIEW_USEFULNESS.includes(event.usefulness as ReviewUsefulness)) latest.set("report", event);
    else throw new Error("Invalid review event.");
  }
  const currentFindings = [...latest.values()].filter((event) => event.kind === "FINDING");
  const count = (disposition: ReviewDisposition) => currentFindings.filter((event) => event.disposition === disposition).length;
  const confirmed = count("CONFIRMED_DIFFERENCE"), expected = count("EXPECTED_DIFFERENCE"), falsePositives = count("FALSE_POSITIVE"), insufficient = count("INSUFFICIENT_EVIDENCE");
  const conclusive = confirmed + expected + falsePositives;
  return { mode: AI_REVIEW_MODE, totalFindings: fingerprints.length, reviewedFindings: currentFindings.length, unreviewedFindings: fingerprints.length - currentFindings.length,
    confirmedDifferences: confirmed, expectedDifferences: expected, falsePositives, insufficientEvidence: insufficient, conclusivelyReviewed: conclusive,
    falsePositiveRateBps: conclusive ? Math.floor(falsePositives * 10000 / conclusive) : null,
    reportReview: latest.get("report") ?? null, currentFindings, eventCount: events.length, realPaidParticipants: 0 };
}
