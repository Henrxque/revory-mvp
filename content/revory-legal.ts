export const REVORY_LEGAL = {
  address:
    "Rua Pais Leme, 215, Conj. 1713, Pinheiros, Sao Paulo - SP, 05424-150, Brazil",
  billingEmail: "support@revory.app",
  brand: "REVORY",
  effectiveDate: "July 22, 2026",
  effectiveDatePtBr: "22 de julho de 2026",
  legalName:
    "AMETRINE LABS DESENVOLVIMENTO DE SOFTWARE NAO CUSTOMIZAVEL LTDA",
  legalRevision: "2026.07.22",
  linkedinUrl: "https://www.linkedin.com/company/revory-app",
  privacyEmail: "support@revory.app",
  securityEmail: "security@revory.app",
  shortLegalName: "Ametrine Labs",
  supportEmail: "support@revory.app",
  taxId: "68.046.497/0001-12",
} as const;

export const REVORY_LEGAL_DOCUMENTS = {
  cookies: { path: "/cookies", version: "2026.07.22" },
  dpa: { path: "/dpa", version: "2026.07.22-draft" },
  privacy: { path: "/privacy", version: "2026.07.22" },
  refunds: { path: "/refunds", version: "2026.07.22" },
  responsibleDisclosure: {
    path: "/responsible-disclosure",
    version: "2026.07.22",
  },
  security: { path: "/security", version: "2026.07.22" },
  subprocessors: { path: "/subprocessors", version: "2026.07.22" },
  terms: { path: "/terms", version: "2026.07.22" },
} as const;

export type RevoryLegalDocumentKey = keyof typeof REVORY_LEGAL_DOCUMENTS;

export const ACCOUNT_CREATION_LEGAL_VERSIONS = {
  privacy: REVORY_LEGAL_DOCUMENTS.privacy.version,
  terms: REVORY_LEGAL_DOCUMENTS.terms.version,
} as const;

export const CHECKOUT_LEGAL_VERSIONS = {
  privacy: REVORY_LEGAL_DOCUMENTS.privacy.version,
  refunds: REVORY_LEGAL_DOCUMENTS.refunds.version,
  terms: REVORY_LEGAL_DOCUMENTS.terms.version,
} as const;
