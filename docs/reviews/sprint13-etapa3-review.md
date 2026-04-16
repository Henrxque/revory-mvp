# Sprint 13 — Etapa 3 Review

## objetivo da etapa

Implantar a menor camada viável de `lead intake` e roteamento por `main offer` sem abrir intake amplo, sem virar CRM e sem criar uma superfície operacional maior do que o produto sustenta hoje.

O objetivo desta etapa não foi criar um funil comercial completo.
Foi conectar:

- entrada mínima do lead
- `main offer`
- `booking path`
- criação da `LeadBookingOpportunity`

de forma coerente com o setup atual do REVORY Seller.

## modelo de intake adotado

O modelo de intake adotado foi o mais narrow possível:

- a entrada mínima do lead passa pela lane de `clients` já existente em `Booking Inputs`
- essa lane continua sendo tratada como `lead-base support`, não como inbox ou CRM
- quando um cliente elegível entra por essa lane, o sistema passa a materializar uma `LeadBookingOpportunity`

Na prática, o intake mínimo agora é:

- `Client import` como entrada funcional do lead
- leitura de identidade mínima (`email` ou `phone`)
- captura da source do intake quando ela já existe no modelo atual

Isso evita inventar:

- formulário novo de intake
- inbox
- pipeline
- criação manual ampla de lead

## como a main offer entra no fluxo

A `main offer` entra no fluxo a partir do `selectedTemplate` já salvo no `ActivationSetup`.

O roteamento adotado foi:

- `main offer` vira snapshot dentro da `LeadBookingOpportunity`
- `booking path` do setup também vira snapshot da oportunidade
- a oportunidade só pode ficar `READY` quando existe `main offer` e `booking path` suficientes para um handoff bounded

Em outras palavras:

- a intake sozinha não abre fluxo comercial
- a intake só vira camada utilizável quando consegue se ancorar no setup real do workspace

## como a oportunidade mínima é criada

A `LeadBookingOpportunity` agora é criada ou atualizada a partir da persistência dos imports.

Regras práticas implementadas:

- import de `clients` cria ou atualiza oportunidades para clientes elegíveis
- import de `appointments` reavalia oportunidades tocadas para refletir booking já visível
- conclusão do setup reavalia oportunidades existentes para aplicar `main offer` e `booking path`

Semântica operacional implementada:

- `OPEN`: o lead intake existe, mas o setup ainda não está pronto para roteamento
- `READY`: o lead já pode seguir pelo próximo passo bounded rumo ao booking path
- `BLOCKED`: falta identidade mínima de contato
- `BOOKED`: já existe booking futuro visível

Observação honesta:

- o produto ainda não executa outreach real
- então a oportunidade representa leitura e roteamento mínimo, não contato já realizado

## mudanças realizadas

- adicionado o modelo `LeadBookingOpportunity` ao schema Prisma
- adicionada sincronização de oportunidades a partir de imports de `clients`
- adicionada reavaliação de oportunidades durante imports de `appointments`
- adicionada reavaliação de oportunidades ao completar activation setup
- adicionada leitura server-side de `Lead intake routing` em `Booking Inputs`
- adicionada superfície curta na UI para mostrar:
  - `main offer`
  - `booking path`
  - contagem de oportunidades
  - snapshot curto das oportunidades atuais

## arquivos alterados

- [prisma/schema.prisma](C:/Users/hriqu/Documents/revory-mvp/prisma/schema.prisma)
- [prisma/migrations/20260415000100_sprint_13_lead_intake_routing/migration.sql](C:/Users/hriqu/Documents/revory-mvp/prisma/migrations/20260415000100_sprint_13_lead_intake_routing/migration.sql)
- [services/lead-booking/main-offer-labels.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/main-offer-labels.ts)
- [services/lead-booking/sync-lead-booking-opportunities.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/sync-lead-booking-opportunities.ts)
- [services/lead-booking/get-lead-intake-routing-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/get-lead-intake-routing-read.ts)
- [services/imports/persist-clients-import.ts](C:/Users/hriqu/Documents/revory-mvp/services/imports/persist-clients-import.ts)
- [services/imports/persist-appointments-import.ts](C:/Users/hriqu/Documents/revory-mvp/services/imports/persist-appointments-import.ts)
- [services/onboarding/complete-activation-setup.ts](C:/Users/hriqu/Documents/revory-mvp/services/onboarding/complete-activation-setup.ts)
- [src/app/(app)/app/imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)

## impacto em lead-to-booking readiness

O impacto real desta etapa é:

- o produto agora tem uma entrada funcional mínima de lead
- essa entrada já consegue ser ligada ao `main offer`
- essa entrada já consegue ser ligada ao `booking path`
- o produto já materializa uma oportunidade operacional curta
- o fluxo passa a começar de forma explícita, em vez de existir apenas como intenção de setup

Isso melhora a readiness do lead-to-booking porque:

- a intake deixa de ser só “lead-base support” abstrato
- passa a existir um objeto curto e legível para o próximo passo
- o produto já consegue distinguir entre oportunidade pronta, bloqueada ou já resolvida em booking

## riscos remanescentes

- a entrada ainda depende da lane de `clients`, então o intake continua import-first
- a etapa ainda não cria uma superfície completa de operação; ela cria uma leitura curta dentro de `Booking Inputs`
- `OPEN` tende a aparecer pouco em workspaces já ativados, porque a página de imports hoje já pressupõe setup completo
- ainda não existe execução real de handoff, inbox, envio ou outreach
- o banco local tinha drift antigo fora desta etapa, então a validação de schema foi aplicada com `prisma db push`; a migration do repo foi adicionada, mas `migrate dev` local não pôde ser usado sem resetar a base

## julgamento final da etapa

`Aprovada`, com escopo narrow preservado.

A etapa entregou o que precisava entregar:

- intake mínimo real
- vínculo explícito com `main offer`
- vínculo explícito com `booking path`
- criação funcional da `LeadBookingOpportunity`
- início do fluxo curto dentro do produto atual

O que ela não entregou, e não deveria entregar nesta etapa:

- CRM
- inbox
- conversa com lead
- outreach engine
- automação ampla

Resumo honesto:

- a camada de intake agora existe de verdade
- ela continua curta
- ela ainda é import-first
- ela ainda é leitura operacional, não condução comercial ampla
