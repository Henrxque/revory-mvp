# REVORY Seller - Superpolish Final (2026-04-01)

## Objetivo

Executar um passe final de refinamento UI/UX nas superfícies principais do Seller:

- Revenue View
- Booking Inputs
- Activation Path

Sem redesign total, sem inflar escopo e mantendo alinhamento com o `Seller 2.0` (premium, narrow, booking-first, revenue-first).

## Diagnóstico Final (o que ainda segurava o 9.9/10)

1. Semântica de estado inconsistente entre telas (`next`, `not set`, `awaiting`, `pending`) gerava ruído.
2. Hero headings ainda estavam grandes demais em alguns contextos para um tom premium mais contido.
3. Densidade visual secundária tinha excesso de respiro em alguns blocos.
4. Alguns status em import apareciam com casing bruto (`imported`, `pending`) reduzindo acabamento.
5. Next move estava bom, mas precisava consolidar a leitura executiva com linguagem mais curta e consistente.

## Ajustes Aplicados

### 1) Sistema semântico de estados unificado

Padronização para leitura operacional curta:

- `Live`
- `Locked`
- `Ready`
- `Pending`
- `Value pending`
- `Offer pending`
- `Path pending`
- `Lead entry pending`

Remoções de termos ambíguos na superfície principal:

- `Not set`
- `... next` em labels de estado

### 2) Hierarquia e compactação premium

Ajuste de tokens globais de UI para todas as telas:

- redução controlada do tamanho de `rev-display-hero`
- ajuste de `rev-display-panel` e `rev-display-section`
- compactação de `rev-kicker` e `rev-label`
- botões globais com padding e fonte mais proporcionais

Resultado: menos “peso” visual e melhor escaneabilidade sem perder sofisticação.

### 3) Next move mais executivo

Consolidação de next-move orientado por estado real:

- `Set main offer`
- `Set booking path`
- `Set booking value`
- `Add booked proof`
- `Refresh booked proof`

Com CTA correspondente e apoio mínimo.

### 4) Booking Inputs mais limpo e mais premium

- labels e helper texts reduzidos
- densidade de cards e upload panel compactada
- títulos e feedbacks de import simplificados
- status text formatado com title-case para acabamento (`Pending`, `Imported`)

### 5) Activation Path com leitura mais status-driven

- chains com fallback semântico para `pending` em vez de `next`
- snapshot e blocos de missing/ready com linguagem uniforme
- reforço do framing: ativação -> prova -> revenue

## Arquivos Alterados Nesta Rodada Final

- `src/app/globals.css`
- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/imports/page.tsx`
- `src/app/(app)/app/setup/page.tsx`
- `components/imports/CsvUploadCard.tsx`
- `components/imports/ImportsFlowGrid.tsx`
- `services/decision-support/build-dashboard-decision-support.ts`
- `services/decision-support/build-import-decision-support.ts`
- `services/decision-support/build-activation-step-read.ts`
- `components/ui/RevoryDecisionSupportCard.tsx`

## Validação Executada

- `npx eslint "src/app/(app)/app/dashboard/page.tsx" "src/app/(app)/app/imports/page.tsx" "src/app/(app)/app/setup/page.tsx" "components/imports/CsvUploadCard.tsx" "components/imports/ImportsFlowGrid.tsx" "services/decision-support/build-dashboard-decision-support.ts" "services/decision-support/build-import-decision-support.ts" "services/decision-support/build-activation-step-read.ts" "src/app/globals.css"`
- `npm run typecheck`
- `npm run build`

## Veredito

**Aprovado (superpolish final aplicado).**

O Seller ficou mais coeso como sistema único, com menos ruído textual, estados mais profissionais, compactação premium e melhor clareza comercial sem deriva para CRM/BI/inbox nem expansão indevida de escopo.

