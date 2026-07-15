const evidenceFieldLabels: Readonly<Record<string, string>> = {
  amountcents: "Estimate amount",
  closedat: "Closed date",
  createdat: "Created date",
  customerexternalid: "Customer ID",
  externalid: "Record ID",
  jobexternalid: "Job ID",
  lastactivityat: "Last activity",
  leadexternalid: "Lead ID",
  lostat: "Marked lost date",
  nextfollowupat: "Next follow-up date",
  nextstep: "Next step",
  owner: "Owner",
  ownerexternalid: "Owner ID",
  sentat: "Sent date",
  status: "Status",
};

function normalizeKey(value: string) {
  return value.replaceAll("_", "").replaceAll("-", "").replaceAll(" ", "").toLowerCase();
}

export function formatBuyerFieldLabel(value: string) {
  const known = evidenceFieldLabels[normalizeKey(value)];
  if (known) return known;

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .toLowerCase()
    .replace(/\bid\b/g, "ID")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatEnumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
