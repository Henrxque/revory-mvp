// Central operational definition for Sprint 4.
// A "usable email" in the current MVP is only:
// - present
// - trimmed
// - lowercased for consistency
// - non-empty after normalization
// There is still no deeper format validation beyond that initial rule.
// We deliberately do not add deliverability, MX, or engagement logic here.
export function getUsableEmail(email: string | null) {
  const normalized = email?.trim().toLowerCase() ?? "";

  return normalized.length > 0 ? normalized : null;
}
