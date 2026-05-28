# REVORY — Project Documentation and Revenue Leak Detector Migration

## 1. Resumo executivo

O REVORY Seller, no estado atual do projeto, é um SaaS premium narrow para MedSpas focado em transformar demanda paga em booked appointments e em tornar valor comercial visível rapidamente.

Ele já tem:

- landing e pricing com posicionamento premium narrow;
- auth com Google e email/senha;
- reset de senha preparado;
- onboarding/setup curto;
- import de appointments e clients via CSV;
- dashboard revenue-first;
- booked proof;
- Daily Booking Brief;
- booking assistance;
- Manual Lead Quick Add;
- suggested message bounded com LLM;
- Action Pack;
- Executive Proof Summary;
- share/copy/print de proof no Growth;
- billing foundation com Stripe;
- gating Basic vs Growth;
- Premium como tier futuro.

Ele ainda não é:

- CRM;
- inbox;
- BI;
- scheduling system completo;
- practice management system;
- healthcare analytics suite;
- revenue cycle management;
- follow-up automation engine;
- detector amplo de vazamento de receita clínica.

A ideia de **Healthcare Revenue Leak Detector** é mais ampla, mais cara e potencialmente mais forte comercialmente, mas não é uma simples troca de copy. É uma expansão de tese e de arquitetura.

Leitura objetiva:

- O REVORY atual já é uma boa base para essa direção.
- O produto atual cobre parte do problema: booking, no-show/cancelamentos, booked proof, revenue read, lead-to-booking assistance.
- Para virar Revenue Leak Detector de verdade, precisa adicionar uma camada séria de leak taxonomy, data model, cálculo de perdas estimadas, segmentação por origem/profissional/tratamento e leitura executiva de vazamentos.
- A migração mais inteligente não é virar “healthcare BI”. É evoluir para um **Revenue Leak Detector narrow**, começando por MedSpas e clínicas premium com dados simples.

## 2. O que o REVORY é hoje

O REVORY Seller hoje é um software premium narrow de booking acceleration para MedSpas.

Promessa real sustentada hoje:

- ajudar a clínica a enxergar booked proof;
- mostrar receita estimada ligada a appointments importados;
- orientar o próximo passo curto para leads e booking;
- manter a leitura diária curta;
- gerar uma proof summary executiva;
- permitir uma entrada manual curta de lead;
- proteger o produto contra virar CRM, inbox ou BI.

Categoria real hoje:

- booking acceleration;
- revenue-first booking read;
- operational booking assistance;
- proof layer para clínicas premium.

O produto é mais forte quando vendido como:

> “REVORY mostra se a demanda paga está virando appointments e ajuda sua clínica a agir no próximo passo curto para booking.”

O produto fica perigoso se vendido como:

> “Sistema completo para gerenciar leads, follow-up, agenda, atendimento e receita clínica.”

Isso ele não entrega hoje.

## 3. Funcionalidades atuais do REVORY

### 3.1 Landing, pricing e posicionamento

Arquivos principais:

- `src/app/page.tsx`
- `src/content/revory-landing-reference.html`
- `src/app/start/page.tsx`
- `services/billing/workspace-billing.ts`

O que existe:

- landing pública com CTA para `/start`;
- pricing no `/start`;
- plano `Basic` público e limitado;
- plano `Growth` como produto completo do MVP;
- plano `Premium` como futuro / coming later;
- links reais para Privacy e Terms;
- copy anti-oversell reforçando que o produto não é CRM, inbox ou BI amplo.

Planos atuais:

- `Basic`: entrada limitada, import-first, sem Manual Quick Add e sem proof share/export.
- `Growth`: plano principal, produto completo atual.
- `Premium`: futuro, sem checkout e sem manual fit.

### 3.2 Auth

Arquivos principais:

- `auth.ts`
- `components/auth/AuthOptionsPanel.tsx`
- `components/auth/AuthEmailPasswordForm.tsx`
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/auth/password-actions.ts`
- `services/auth/password-crypto.ts`
- `services/auth/password-reset.ts`
- `services/email/transactional-email.ts`

O que existe:

- login com Google;
- login com email/senha;
- cadastro com email/senha;
- normalização de redirect seguro;
- reset de senha com token hash e expiração;
- envio transacional preparado via Resend;
- sem Meta/Facebook.

Dependências externas:

- Google OAuth credentials;
- `AUTH_SECRET`;
- `RESEND_API_KEY`;
- `AUTH_EMAIL_FROM`;
- domínio/callbacks finais de produção.

Limite real:

- reset de senha só envia email de verdade quando Resend estiver configurado.

### 3.3 Onboarding/setup

Arquivos principais:

- `src/app/(app)/app/setup/[step]/page.tsx`
- `src/app/(app)/app/setup/actions.ts`
- `components/onboarding/OnboardingStepLayout.tsx`
- `services/onboarding/*`

O que existe:

- setup guiado;
- escolha de main offer;
- booking path principal;
- average deal value;
- seller voice/mode;
- activation path;
- workspace activation.

Decisão de produto:

- um main offer;
- um booking path;
- fluxo curto;
- sem múltiplas ofertas, múltiplas jornadas ou configuração enterprise.

### 3.4 Imports e booking inputs

Arquivos principais:

- `src/app/(app)/app/imports/page.tsx`
- `components/imports/ImportsFlowGrid.tsx`
- `components/imports/CsvUploadCard.tsx`
- `services/imports/*`

O que existe:

- import de appointments CSV;
- import de clients CSV;
- parsing, validação e persistência;
- booked proof lane;
- lead base support lane;
- source freshness/stale read;
- templates de CSV;
- review antes de tornar dados visíveis.

O que os dados atuais sustentam:

- appointments booked/scheduled/completed/canceled/no-show;
- estimated revenue por appointment;
- serviceName;
- providerName;
- bookedAt/scheduledAt/completedAt/canceledAt;
- client identity;
- lead support via clients import.

Limite real:

- ainda é import-first;
- não há integração real com EHR/PMS/scheduler;
- não há sync contínuo;
- não há leitura profunda de funil de lead desde inquiry até payment.

### 3.5 Dashboard revenue-first

Arquivos principais:

- `src/app/(app)/app/dashboard/page.tsx`
- `services/dashboard/get-dashboard-overview.ts`

O que existe:

- estimated imported revenue;
- booked appointments;
- canceled appointments;
- appointments monitored;
- clients imported;
- attribution support;
- recent momentum;
- upcoming read;
- renewal/readiness support;
- commercial safeguard;
- degraded state quando alguma camada auxiliar não está disponível.

O dashboard já tem sinais que podem virar base de leak detector:

- appointments monitorados;
- canceled appointments;
- booked appointments;
- estimated revenue;
- provider/service fields;
- no-show status no schema;
- upcoming scheduled appointments;
- recent momentum.

Limite real:

- ainda não calcula perda estimada por leak type;
- não separa vazamentos por profissional, campanha, tipo de tratamento ou etapa do funil;
- não tem agenda/capacidade real para detectar ociosidade com precisão;
- não tem payments/invoices para comparar receita esperada vs capturada.

### 3.6 Daily Booking Brief

Arquivos principais:

- `components/briefs/DailyBookingBrief.tsx`
- `services/briefs/get-daily-booking-brief-read.ts`

O que existe:

- brief diário curto;
- sinais de booked proof, lead support e revenue view;
- next move;
- freshness;
- recent change;
- ready/blocked/handoffs quando booking assistance está ativa.

Valor atual:

- aumenta first-minute usefulness;
- reduz sensação de dashboard estático;
- mantém rotina curta e narrow.

Potencial para Revenue Leak Detector:

- virar “Daily Leak Brief”;
- mostrar “maior leak agora”;
- mostrar “dinheiro estimado em risco”;
- mostrar “ação curta recomendada”.

### 3.7 Booking assistance

Arquivos principais:

- `services/lead-booking/*`
- `components/lead-booking/LeadBookingOpportunityList.tsx`
- `components/lead-booking/ManualLeadQuickAdd.tsx`
- `src/app/(app)/app/imports/lead-booking-actions.ts`
- `src/app/(app)/app/imports/manual-lead-actions.ts`

O que existe:

- `LeadBookingOpportunity`;
- intake via clients import;
- Manual Lead Quick Add no Growth;
- estados `OPEN`, `READY`, `BLOCKED`, `BOOKED`, `CLOSED`;
- blocked reasons;
- next action;
- handoff assisted via email/sms;
- `handoffOpenedAt`;
- tracking mínimo;
- suggested message bounded.

Blocked reasons atuais:

- `missing_contact`;
- `missing_main_offer`;
- `missing_booking_path`;
- `ineligible_for_handoff`.

Limite real:

- não é CRM;
- não é inbox;
- não executa outreach;
- não tem follow-up engine;
- não tem histórico de conversa;
- não gerencia pipeline comercial amplo.

### 3.8 Suggested message com LLM

Arquivos principais:

- `services/lead-booking/generate-lead-suggested-message.ts`
- `services/llm/request-bounded-structured-output.ts`
- `services/llm/*`
- `types/lead-suggested-message.ts`

O que existe:

- geração curta e bounded;
- fallback determinístico;
- guardrails de tamanho, escopo e linguagem;
- cache curto;
- timeout;
- não cria chat;
- não cria thread;
- não envia mensagem automaticamente.

Valor atual:

- ajuda o operador a agir mais rápido;
- aumenta premium feel sem virar agente livre.

Limite real:

- LLM não toma decisão clínica;
- LLM não faz automação de vendas;
- LLM não opera follow-up contínuo.

### 3.9 Executive Proof Summary

Arquivos principais:

- `services/proof/get-executive-proof-summary-read.ts`
- `components/proof/ExecutiveProofSummaryCard.tsx`
- `components/proof/ExecutiveProofSummarySheet.tsx`

O que existe:

- summary executiva de proof;
- copy summary;
- share summary;
- print/save PDF;
- proof position;
- freshness;
- revenue/proof signals.

Gating:

- Basic vê revenue read in-app;
- Growth tem copy/share/print;
- Premium não está disponível.

Potencial para Revenue Leak Detector:

- virar “Monthly Revenue Leak Summary”;
- mostrar leaks estimados;
- gerar asset interno para owner/manager;
- defender ticket maior.

### 3.10 Billing / Stripe

Arquivos principais:

- `services/billing/workspace-billing.ts`
- `services/billing/stripe-runtime.ts`
- `services/billing/stripe-sync.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/billing/webhook/route.ts`

O que existe:

- catálogo Basic/Growth/Premium;
- checkout para Basic/Growth quando envs existem;
- Premium desabilitado;
- webhook foundation;
- customer portal;
- workspace billing state;
- plan gating simples.

Bloqueios externos:

- `STRIPE_SECRET_KEY`;
- `STRIPE_WEBHOOK_SECRET`;
- `STRIPE_BASIC_PRICE_ID`;
- `STRIPE_GROWTH_PRICE_ID`.

## 4. Estrutura técnica atual

Stack:

- Next.js 16;
- React 19;
- Prisma;
- PostgreSQL;
- NextAuth;
- Stripe;
- Playwright;
- LLM provider via OpenAI-compatible runtime;
- Tailwind/CSS customizado.

Scripts importantes:

- `npm run dev`;
- `npm run build`;
- `npm run start`;
- `npm run lint`;
- `npm run typecheck`;
- `npm run env:check`;
- `npm run qa:clean-rerun`;
- `npm run llm:env`;
- `npm run llm:smoke`;
- `npm run llm:qa`;
- `npm run db:validate`;
- `npm run db:deploy`.

Modelos centrais no Prisma:

- `User`;
- `Workspace`;
- `MedSpaProfile`;
- `ActivationSetup`;
- `DataSource`;
- `Client`;
- `Appointment`;
- `AutomationRun`;
- `RecoveryOpportunity`;
- `ReviewRequest`;
- `MetricsSnapshot`;
- `LeadBookingOpportunity`.

O schema já aponta para uma ambição maior do que a UI atual, porque contém objetos de recovery, automation, review request e metrics snapshot. Mas a entrega de produto atual ainda está mais concentrada em booking/revenue/proof/assistance.

## 5. Readiness atual

O produto está em estado de soft launch controlado, desde que as configurações externas sejam concluídas.

Pronto:

- core app;
- auth local;
- onboarding;
- imports;
- dashboard;
- booking assistance;
- plan gates Basic/Growth;
- LLM fallback/smoke;
- QA scripts;
- proof share/print;
- pricing strategy atual.

Ainda dependente de configuração:

- Stripe real;
- webhook real;
- email transacional;
- domínio final;
- callbacks Google OAuth;
- smoke test em produção.

## 6. O que seria o Healthcare Revenue Leak Detector

A nova tese seria:

> “Detector de vazamento de receita para clínicas premium.”

Essa categoria é mais ampla que o REVORY Seller.

Ela não venderia apenas:

- “ajudo a marcar mais”.

Ela venderia:

- “mostro onde sua clínica está perdendo dinheiro todo mês.”

Essa é uma promessa comercial mais forte, mas também mais perigosa. Para sustentá-la, o produto precisa provar:

- onde há perda;
- qual é o tamanho estimado da perda;
- qual é a causa provável;
- qual é a ação recomendada;
- quais dados sustentam a leitura;
- o que é estimativa vs fato observado.

### Nota de mercado

O número citado pelo usuário sobre medical scheduling software aparece alinhado com uma estimativa pública da Market Data Forecast: mercado global estimado em US$571,7M em 2025 e US$1,593B em 2033. Fonte: [Market Data Forecast](https://www.marketdataforecast.com/market-reports/medical-scheduling-software-market).

Isso ajuda a validar que scheduling/operational software é um espaço com crescimento, mas não prova sozinho demanda pelo produto específico “Revenue Leak Detector”. Essa tese ainda precisaria de validação comercial com clínicas.

## 7. Diferença entre REVORY Seller e Revenue Leak Detector

### REVORY Seller hoje

Foco:

- booking acceleration;
- booked proof;
- revenue-first read;
- lead-to-booking assistance curta.

Dados principais:

- appointments;
- clients;
- lead booking opportunities;
- setup;
- booking path;
- main offer.

Pergunta que responde:

- “Minha demanda paga está virando booked appointments e o que posso fazer agora?”

### Revenue Leak Detector

Foco:

- vazamentos de receita;
- perdas operacionais;
- oportunidades perdidas;
- agenda ociosa;
- pacientes/leads sem continuidade;
- campanhas ruins;
- follow-up atrasado;
- profissionais/serviços com baixo rendimento.

Dados necessários:

- appointments;
- clients/patients;
- leads/inquiries;
- source/campaign;
- response/contact timestamps;
- no-show/cancel/reschedule;
- provider schedule/capacity;
- service/treatment plan;
- invoices/payments;
- follow-up tasks/events;
- retention/return visit history.

Pergunta que responderia:

- “Onde a clínica está perdendo dinheiro, quanto isso representa e qual leak merece ação primeiro?”

## 8. O que o REVORY já tem que pode ser reaproveitado

### Reaproveitável diretamente

- Auth;
- workspace;
- billing;
- onboarding base;
- imports CSV;
- appointments;
- clients;
- dashboard shell;
- Daily Brief;
- Executive Proof Summary;
- freshness/staleness;
- LLM bounded structured output;
- plan gating;
- QA scripts;
- premium dark UI system.

### Reaproveitável com adaptação

- `AppointmentStatus.NO_SHOW`;
- `AppointmentStatus.CANCELED`;
- `providerName`;
- `serviceName`;
- `estimatedRevenue`;
- `RecoveryOpportunity`;
- `MetricsSnapshot`;
- `AutomationRun`;
- `ReviewRequest`;
- `DailyBookingBrief`;
- `ExecutiveProofSummary`.

### Não suficiente hoje

- campaign attribution real;
- lead response tracking;
- patient lifecycle by treatment plan;
- provider capacity/utilization;
- payment capture;
- incomplete treatment revenue;
- follow-up delay detection;
- missed return visit logic;
- source quality scoring.

## 9. Leak categories sugeridas para a migração

Para não virar BI amplo, a primeira versão do Revenue Leak Detector deveria ter uma taxonomia curta.

### V1 possível com a base atual

Esses leaks são os mais próximos do que o REVORY já consegue sustentar:

1. **No-show leak**
   - Base: appointments com `NO_SHOW`.
   - Estimativa: count x estimatedRevenue ou averageDealValue.
   - Status: parcialmente sustentável hoje pelo schema.

2. **Canceled not recovered**
   - Base: appointments `CANCELED`.
   - Estimativa: count x estimatedRevenue ou averageDealValue.
   - Status: parcialmente sustentável hoje.

3. **Booked proof gap**
   - Base: falta de appointments importados ou dados stale.
   - Estimativa: ainda não é leak financeiro real, mas é leak de visibilidade.
   - Status: já sustentado.

4. **Lead contact gap**
   - Base: LeadBookingOpportunity bloqueada por `missing_contact`.
   - Estimativa: count x deal value.
   - Status: sustentado dentro da camada booking assistance.

5. **Booking path gap**
   - Base: LeadBookingOpportunity bloqueada por `missing_booking_path`.
   - Estimativa: operacional, não necessariamente financeiro.
   - Status: sustentado.

6. **Stale source risk**
   - Base: source freshness.
   - Estimativa: não financeiro direto.
   - Status: sustentado.

### V2 que exige novos dados

Esses leaks são comercialmente fortes, mas não estão sustentados hoje:

1. **Leads sem resposta**
   - Precisa: timestamp de inquiry, primeira resposta, canal, owner ou sistema de origem.

2. **Consultas não convertidas**
   - Precisa: lead stage/inquiry-to-booked mapping.

3. **Pacientes que não retornaram**
   - Precisa: histórico longitudinal de visits por service/treatment.

4. **Tratamentos incompletos**
   - Precisa: treatment plan, prescribed sessions, completed sessions, remaining value.

5. **Agenda ociosa**
   - Precisa: provider availability/capacity, clinic schedule, open slots.

6. **Ticket médio por profissional**
   - Precisa: provider attribution + invoice/payment or reliable estimatedRevenue by provider.

7. **Campanhas que geram lead ruim**
   - Precisa: campaign/source IDs, lead outcomes, spend ou pelo menos source attribution.

8. **Follow-up atrasado**
   - Precisa: follow-up due date, last contact, outcome, owner/system.

9. **Perdas estimadas em dinheiro por canal/profissional**
   - Precisa: reliable revenue value + enough source/provider dimensions.

## 10. Arquitetura necessária para migrar

### 10.1 Produto

Renomear a tese de produto de:

- booking acceleration;

para:

- revenue leak detection.

Mas não vender como:

- healthcare BI;
- practice management;
- analytics suite completa;
- RCM;
- CRM.

Melhor posicionamento inicial:

> “Revenue Leak Detector for premium clinics, starting with booking, no-show, canceled revenue, stale data and lead booking gaps.”

Esse posicionamento mantém a ponte com o REVORY atual.

### 10.2 Data model

Adicionar ou formalizar uma nova entidade:

```ts
RevenueLeak
```

Campos sugeridos:

- `id`;
- `workspaceId`;
- `leakType`;
- `severity`;
- `status`;
- `estimatedValue`;
- `confidence`;
- `detectedAt`;
- `sourceWindowStart`;
- `sourceWindowEnd`;
- `reason`;
- `recommendedAction`;
- `evidenceJson`;
- `relatedClientId`;
- `relatedAppointmentId`;
- `relatedLeadBookingOpportunityId`;
- `providerName`;
- `serviceName`;
- `sourceName`;
- `resolvedAt`.

Enums sugeridos:

```ts
RevenueLeakType:
- NO_SHOW_REVENUE
- CANCELED_NOT_RECOVERED
- STALE_BOOKED_PROOF
- MISSING_CONTACT
- BOOKING_PATH_BLOCKED
- IDLE_SCHEDULE_RISK
- RETURN_VISIT_GAP
- INCOMPLETE_TREATMENT
- LOW_QUALITY_SOURCE
- FOLLOW_UP_DELAY
```

Para MVP, não ativar todos. Começar só com os sustentados.

### 10.3 Leak detection engine

Criar um serviço:

```txt
services/revenue-leaks/
```

Possíveis arquivos:

- `detect-revenue-leaks.ts`;
- `get-revenue-leak-read.ts`;
- `leak-types.ts`;
- `leak-estimation.ts`;
- `leak-confidence.ts`;
- `sync-revenue-leaks.ts`;
- `format-revenue-leak.ts`.

Regras V1:

- appointments `NO_SHOW` -> no-show leak;
- appointments `CANCELED` sem rebooking futuro visível -> canceled not recovered;
- no booked proof source -> booked proof gap;
- stale appointments source -> stale read risk;
- LeadBookingOpportunity `BLOCKED/missing_contact` -> lead contact gap;
- LeadBookingOpportunity `BLOCKED/missing_booking_path` -> booking path gap.

Importante:

- separar leak financeiro real de risk/readiness gap;
- não somar tudo como dinheiro perdido se a base não sustenta;
- mostrar confidence.

### 10.4 UI

Adicionar uma nova surface, não um dashboard gigante.

Opção mais segura:

- transformar `Daily Booking Brief` em `Daily Leak Brief`;
- adicionar uma section executiva no dashboard:
  - “Top revenue leaks”;
  - “Estimated value at risk”;
  - “Most actionable leak”;
  - “Data confidence”.

Não criar:

- BI builder;
- filtros pesados;
- relatório customizável;
- dashboard por profissional completo logo no início;
- pipeline operacional.

### 10.5 Proof summary

Evoluir:

- `Executive Proof Summary`;

para:

- `Executive Leak Summary`.

O asset compartilhável deveria mostrar:

- estimated value at risk;
- top leak;
- count de affected appointments/leads;
- confidence;
- freshness;
- next recommended action.

### 10.6 Onboarding

Onboarding atual pergunta main offer, booking path e deal value.

Para leak detector, adicionar sem inflar:

- clinic type;
- average visit/treatment value;
- primary services;
- whether no-show/canceled statuses are present in exported data;
- whether source/campaign exists in import;
- whether providerName exists in import.

Não adicionar logo:

- multi-location settings;
- provider roster management;
- campaign mapping UI;
- treatment plan builder;
- custom KPI setup.

### 10.7 Imports

Manter CSV-first no começo, mas criar templates novos:

- appointments with status/provider/service/revenue;
- leads/inquiries with source/campaign/contact status;
- patients/clients with last visit;
- optional payments/invoices later.

Para V1, o mais importante é melhorar appointment import:

- status;
- scheduledAt;
- canceledAt;
- no-show;
- providerName;
- serviceName;
- estimatedRevenue.

### 10.8 Billing e planos

Pricing possível:

- Entry: US$499/mês;
- Growth/Core: US$999/mês;
- Premium/future: US$1.500-2.000/mês.

Mas isso só faz sentido se o produto realmente mostrar leaks financeiros estimados com confiança.

Se apenas rebrandar o REVORY atual, US$999 ficaria frágil.

Para o produto atual:

- Basic/Growth/Premium ainda fazem sentido.

Para Revenue Leak Detector:

- considerar simplificar para 1 plano principal no início:
  - `Revenue Leak Core — $999/mo`;
- e um plano entry mais barato só se tiver gating claro.

### 10.9 Compliance e segurança

Ao migrar para clínicas médicas mais amplas, o risco sobe.

Precisaria revisar:

- PHI/PII handling;
- HIPAA posture se vender nos EUA;
- BAA com providers relevantes;
- data retention;
- audit logs;
- access control;
- encryption;
- least privilege;
- deletion/export policy;
- terms/privacy específicos.

O REVORY atual é comercialmente orientado a MedSpa e import CSV. Um healthcare leak detector amplo pode ser lido como software que processa dados sensíveis de saúde. Isso muda o nível de responsabilidade.

## 11. Roadmap de migração recomendado

### Fase 0 — Product truth e decisão de categoria

Objetivo:

- decidir se isso é evolução do REVORY ou produto novo.

Minha recomendação:

- não chamar de healthcare amplo no início;
- chamar de `REVORY Leak Detector` ou `REVORY Revenue Leak Detector for MedSpas`;
- expandir para clínicas premium só depois de validar.

Entregas:

- nova tese de produto;
- nova landing draft;
- nova taxonomia curta de leaks;
- definição do que conta como leak real vs risk signal.

### Fase 1 — Leak engine V1 com dados atuais

Objetivo:

- transformar sinais atuais em leak read honesto.

Implementar:

- `RevenueLeak` model;
- leak detection service;
- no-show leak;
- canceled not recovered;
- missing contact leak;
- booking path blocked;
- stale data risk;
- proof gap risk.

Não implementar ainda:

- agenda ociosa real;
- campaign quality;
- incomplete treatment;
- provider ticket médio avançado.

### Fase 2 — Executive Leak Surface

Objetivo:

- criar leitura executiva mais forte que dashboard atual.

Implementar:

- Daily Leak Brief;
- Top 3 leaks;
- Estimated value at risk;
- confidence label;
- recommended action;
- Executive Leak Summary shareable.

Regra:

- mostrar dinheiro só quando a base sustenta;
- se for estimativa por averageDealValue, deixar claro.

### Fase 3 — Data expansion

Objetivo:

- suportar os leaks mais fortes comercialmente.

Adicionar templates/imports:

- leads/inquiries;
- source/campaign;
- provider schedule/capacity;
- treatment plan/session progress;
- payments/invoices opcional.

Essa fase muda o produto de “booking/revenue read” para “clinic revenue operations intelligence”.

### Fase 4 — Specialty expansion

Objetivo:

- sair de MedSpa para dental, derm, ortho, fertility, weight loss etc.

Exige:

- taxonomias por vertical;
- terminology por especialidade;
- templates por vertical;
- compliance review mais forte;
- onboarding por tipo de clínica.

Não fazer antes de o MedSpa leak detector funcionar.

## 12. O que NÃO fazer na migração

Não fazer:

- rebrandar o REVORY atual e chamar de leak detector completo;
- vender agenda ociosa sem dados de capacidade;
- vender campaign quality sem dados de source/campaign/outcome;
- vender treatment incomplete sem treatment plan/session data;
- vender lost revenue como número absoluto sem confidence;
- criar dashboard BI genérico;
- criar filtros e drilldowns antes da taxonomia funcionar;
- virar CRM;
- virar inbox;
- virar practice management;
- tentar atender todos os tipos de clínica no primeiro release;
- criar manual service disfarçado para interpretar leaks.

## 13. O que precisa ser construído para sustentar a nova promessa

### Produto

- nova promessa central;
- nova landing;
- nova pricing strategy;
- nova anti-objection copy;
- nova proof summary;
- novo onboarding levemente adaptado.

### Backend

- `RevenueLeak` model;
- leak detection engine;
- leak confidence model;
- leak estimation model;
- sync jobs;
- import expansions;
- future integration layer.

### Frontend

- Daily Leak Brief;
- Revenue Leak Overview;
- Top leak cards;
- leak detail drawer curto;
- Executive Leak Summary;
- thin/stale/low-confidence states.

### Dados

- status mapping mais robusto;
- provider/service normalization;
- revenue estimation rules;
- rebooking detection;
- source/campaign fields;
- follow-up/contact timestamps;
- capacity model para agenda ociosa.

### QA

- fixtures com no-shows;
- fixtures com cancellations;
- fixtures com rebookings;
- fixtures com stale data;
- fixtures com thin data;
- fixtures por plan/gating;
- leakage calculation tests;
- confidence tests.

### Comercial

- novo pitch;
- nova pricing page;
- nova no-call safety;
- anti-objection contra BI/CRM/PMS;
- buyer education sobre “estimated value at risk”.

## 14. Migração mínima recomendada

Se o objetivo é chegar rápido em algo vendável sem destruir o que já existe, eu faria:

### Primeiro release: REVORY Revenue Leak Read

Escopo:

- MedSpa-first;
- appointment/client CSV-first;
- no-show leak;
- canceled not recovered;
- booking blocked value;
- stale proof risk;
- top leak;
- estimated value at risk;
- confidence labels;
- one executive summary.

Não incluir:

- campaign quality;
- provider ticket médio;
- incomplete treatment;
- idle schedule;
- follow-up engine;
- CRM;
- BI.

Por quê:

- aproveita 60-70% da base atual;
- muda a percepção comercial para “vazamento de receita”;
- não exige integração pesada de cara;
- mantém founder solo viável.

## 15. Brutal honesty sobre a migração

Essa ideia é provavelmente comercialmente mais forte que o REVORY Seller atual.

Mas ela é mais forte justamente porque promete algo maior:

- dinheiro perdido;
- leaks;
- priorização;
- valor financeiro;
- diagnóstico executivo.

Isso exige mais rigor.

Se for feita de forma honesta, pode virar um produto mais caro.

Se for feita só com rebrand, vira oversell.

O REVORY atual pode ser a base, mas não é ainda esse produto.

Minha leitura:

- como evolução: faz sentido;
- como rebrand imediato: arriscado;
- como novo MVP incremental em cima da base atual: bom caminho;
- como produto healthcare amplo multi-vertical desde o dia 1: escopo perigoso.

## 16. Veredito executivo

O REVORY hoje é um booking acceleration SaaS premium narrow para MedSpas.

Para virar Healthcare Revenue Leak Detector, precisa deixar de ser apenas “booking/readiness/proof” e passar a ter uma camada formal de:

- leak detection;
- leak estimation;
- leak confidence;
- leak prioritization;
- leak summary.

O melhor caminho não é abandonar o REVORY atual. É evoluir a base para:

> REVORY Revenue Leak Detector for premium clinics, starting with MedSpas.

Sequência recomendada:

1. manter o REVORY Seller como base;
2. criar `RevenueLeak` e leak engine V1;
3. transformar o Daily Brief em leak-first;
4. transformar Executive Proof Summary em Executive Leak Summary;
5. vender primeiro para MedSpas;
6. só depois expandir para dental/derm/ortho/fertility/weight loss.

Resumo final:

- O projeto atual está maduro para servir como fundação.
- A migração é viável.
- Não é apenas copy.
- A parte crítica é dado, taxonomia e honestidade de estimativa.
- Se bem executado, a tese de Revenue Leak Detector tem mais pricing power que o REVORY Seller atual.
