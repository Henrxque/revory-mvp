import type { LegalLocale } from "@/content/revory-legal-documents";

export type RevorySubprocessor = {
  conditional: boolean;
  data: Record<LegalLocale, string>;
  geography: Record<LegalLocale, string>;
  links: readonly { href: string; label: string }[];
  provider: string;
  purpose: Record<LegalLocale, string>;
  role: Record<LegalLocale, string>;
};

export const REVORY_SUBPROCESSORS_UPDATED = "July 22, 2026";

export const REVORY_SUBPROCESSORS: readonly RevorySubprocessor[] = [
  {
    provider: "Vercel",
    conditional: false,
    purpose: { en: "Application hosting, serverless execution, delivery, Web Analytics and Speed Insights.", "pt-BR": "Hospedagem, execução serverless, entrega, Web Analytics e Speed Insights." },
    data: { en: "Requests, account/session context, operational logs, anonymized or aggregated usage and web-performance signals.", "pt-BR": "Requisições, contexto de conta/sessão, logs operacionais, uso anonimizado/agregado e sinais de desempenho." },
    role: { en: "Hosting and operational-telemetry subprocessor", "pt-BR": "Suboperador de hosting e telemetria operacional" },
    geography: { en: "Cross-border processing may occur through Vercel infrastructure and support operations.", "pt-BR": "Pode haver tratamento transfronteiriço na infraestrutura e suporte da Vercel." },
    links: [{ label: "Privacy", href: "https://vercel.com/legal/privacy-notice" }, { label: "DPA", href: "https://vercel.com/legal/dpa" }],
  },
  {
    provider: "Neon",
    conditional: false,
    purpose: { en: "Managed PostgreSQL database, storage and managed backup/restore capabilities.", "pt-BR": "Banco PostgreSQL gerenciado, armazenamento e recursos gerenciados de backup/restore." },
    data: { en: "Account, workspace, canonical records, mappings, findings, audit, entitlement and operational data stored by REVORY.", "pt-BR": "Dados de conta, workspace, registros canônicos, mapeamentos, achados, auditoria, direitos e operação." },
    role: { en: "Database infrastructure subprocessor", "pt-BR": "Suboperador de infraestrutura de banco" },
    geography: { en: "Processing occurs in the cloud region configured for the REVORY database; cross-border support processing may occur.", "pt-BR": "Tratamento ocorre na região cloud configurada para o banco; suporte transfronteiriço pode ocorrer." },
    links: [{ label: "Privacy", href: "https://neon.com/privacy-policy" }, { label: "Security", href: "https://neon.com/security" }],
  },
  {
    provider: "Stripe",
    conditional: true,
    purpose: { en: "Hosted checkout, subscriptions, billing portal, payment status and billing webhooks.", "pt-BR": "Checkout hospedado, assinaturas, portal, status de pagamento e webhooks." },
    data: { en: "Customer/workspace billing identifiers, email, offer, price, transaction and subscription metadata. REVORY does not store full card numbers.", "pt-BR": "Identificadores de cobrança de cliente/workspace, e-mail, oferta, preço, transação e assinatura. REVORY não guarda cartão completo." },
    role: { en: "Independent payment controller and billing service provider, depending on activity", "pt-BR": "Controlador independente de pagamentos e provedor de cobrança, conforme a atividade" },
    geography: { en: "Cross-border processing under Stripe’s published privacy and data-transfer terms.", "pt-BR": "Tratamento transfronteiriço conforme termos de privacidade e transferência do Stripe." },
    links: [{ label: "Privacy", href: "https://stripe.com/privacy" }, { label: "DPA", href: "https://stripe.com/legal/dpa" }],
  },
  {
    provider: "Resend",
    conditional: false,
    purpose: { en: "Transactional account, security, billing and operational email delivery and event webhooks.", "pt-BR": "Envio de e-mails transacionais de conta, segurança, cobrança e operação e webhooks." },
    data: { en: "Recipient email, name when supplied, message content, delivery metadata and email-event status.", "pt-BR": "E-mail do destinatário, nome quando fornecido, conteúdo, metadados de entrega e status do evento." },
    role: { en: "Transactional email subprocessor", "pt-BR": "Suboperador de e-mail transacional" },
    geography: { en: "Cross-border processing may occur through Resend infrastructure and email-delivery networks.", "pt-BR": "Pode haver tratamento transfronteiriço na infraestrutura e redes de entrega do Resend." },
    links: [{ label: "Privacy", href: "https://resend.com/legal/privacy-policy" }, { label: "DPA", href: "https://resend.com/legal/dpa" }],
  },
  {
    provider: "Google",
    conditional: true,
    purpose: { en: "Optional Google OAuth account authentication.", "pt-BR": "Autenticação de conta por Google OAuth opcional." },
    data: { en: "Google account subject identifier, email, profile name and authentication events.", "pt-BR": "Identificador da conta Google, e-mail, nome de perfil e eventos de autenticação." },
    role: { en: "Independent identity provider", "pt-BR": "Provedor independente de identidade" },
    geography: { en: "Cross-border processing under Google’s published terms.", "pt-BR": "Tratamento transfronteiriço conforme termos publicados do Google." },
    links: [{ label: "Privacy", href: "https://policies.google.com/privacy" }],
  },
  {
    provider: "OpenAI",
    conditional: true,
    purpose: { en: "Optional bounded mapping, classification, explanation and narrowly scoped text assistance.", "pt-BR": "Assistência opcional e limitada de mapeamento, classificação, explicação e texto restrito." },
    data: { en: "Sanitized mapping metadata or limited feature context as described in the Privacy Notice; not full canonical CSV rows for mapping assistance.", "pt-BR": "Metadados de mapeamento sanitizados ou contexto limitado do recurso conforme o Aviso; não linhas canônicas completas no auxílio de mapeamento." },
    role: { en: "Conditional AI subprocessor", "pt-BR": "Suboperador condicional de IA" },
    geography: { en: "Cross-border processing under OpenAI’s business data terms when the feature is enabled.", "pt-BR": "Tratamento transfronteiriço conforme termos de dados empresariais da OpenAI quando habilitado." },
    links: [{ label: "Privacy", href: "https://openai.com/policies/privacy-policy/" }, { label: "DPA", href: "https://openai.com/policies/data-processing-addendum/" }],
  },
] as const;
