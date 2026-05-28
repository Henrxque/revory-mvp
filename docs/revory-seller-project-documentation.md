# REVORY Seller - Project Documentation

> Historical REVORY Seller reference. Not current public positioning. Current source of truth is REVORY Revenue Leak Detector.
>
> Use this document only as historical implementation substrate for the old Seller/booking-assistance foundation. For current product, copy, category, roadmap, and buyer-facing decisions, use `docs/source-of-truth.md`.

Atualizado em: 2026-04-28

## 1. Resumo executivo

REVORY Seller e um software premium narrow de booking acceleration para MedSpas.

O produto existe para ajudar clinicas que ja trabalham com leads pagos a enxergar booked proof, receita estimada, prontidao de leads e proximas acoes curtas rumo ao booking.

O REVORY Seller nao e CRM, inbox, BI, automacao ampla, chatbot, follow-up engine ou agente comercial livre. A proposta correta e mais estreita:

- organizar um setup comercial curto
- importar ou adicionar sinais de booking
- mostrar revenue e booked proof primeiro
- orientar proximas acoes curtas
- abrir handoff assistido para email ou SMS
- gerar prova executiva curta e compartilhavel

Leitura objetiva do produto hoje:

`software premium narrow de booking acceleration para MedSpas, centrado em booked proof, revenue-first read e booking assistance bounded.`

## 2. Fonte de verdade e guardrails

Referencia primaria interna:

- `docs/source-of-truth.md`

Fonte externa esperada, mas nao encontrada nesta leitura:

- `C:\Users\hriqu\Documents\Revory Project\lousa_escopo_revory_seller_mvp.md`

Quando houver conflito, a interpretacao mais narrow do MVP deve vencer.

Guardrails centrais:

- premium
- self-service
- MedSpa-first
- booking-first
- uma main offer inicial por workspace
- um booking path principal
- triagem curta
- IA minima, bounded e de baixo custo
- dashboard revenue-first
- baixa carga operacional para founder solo

Coisas que o produto deve evitar:

- CRM universal
- inbox completa
- chatbot aberto
- agente livre de vendas
- BI/reporting suite
- enterprise control center
- servico manual disfarçado de software

## 3. Proposta do produto

### O que o produto promete de forma honesta

REVORY Seller ajuda uma MedSpa a transformar leads pagos em uma leitura mais clara de booking, receita e proxima acao.

Promessa sustentada hoje:

- configurar uma direcao comercial curta
- trazer booked appointments e lead base para dentro do sistema
- mostrar booked proof e receita estimada
- identificar oportunidades prontas ou bloqueadas para booking
- sugerir uma mensagem curta com LLM bounded ou fallback
- abrir o booking path principal via email ou SMS
- registrar minimamente que o handoff foi aberto
- gerar uma proof summary executiva para mostrar valor

### O que o produto nao promete

REVORY Seller nao promete:

- responder leads automaticamente
- gerenciar conversas
- executar follow-up continuo
- substituir atendimento humano
- substituir CRM
- operar pipeline de vendas
- atribuir causalidade forte de receita
- fazer analytics profundo
- integrar nativamente todos os canais de lead

## 4. Usuario e caso de uso

ICP principal:

- MedSpa pequena ou media
- compra leads ou depende de demanda paga
- tem uma oferta principal relevante
- tem um caminho claro de booking, hoje email ou SMS
- quer clareza de booked appointments, revenue e next move
- nao quer operar um CRM pesado no primeiro passo

Bom fit:

- clinica com leads suficientes para haver leitura recorrente
- clinica com booked appointments exportaveis
- clinica que aceita um fluxo import-first com quick add manual
- founder/operator que quer uma leitura premium curta do que esta pronto, bloqueado e booked

Fit fraco:

- clinica sem lead flow
- clinica sem main offer clara
- clinica sem booking path definido
- clinica que procura inbox, CRM completo ou automacao de follow-up

## 5. Fluxo principal do produto

Fluxo macro:

1. Usuario entra via auth.
2. Workspace e billing sao verificados.
3. Usuario completa Activation Path.
4. Produto direciona para Booking Inputs se ainda falta booked proof.
5. Usuario importa booked appointments e, opcionalmente, lead base.
6. Dashboard mostra Daily Booking Brief, Revenue View e proof.
7. Booking Assistance mostra oportunidades prontas, bloqueadas ou booked.
8. Manual Lead Quick Add permite criar uma oportunidade curta sem abrir CRM.
9. Action Pack permite copiar mensagem, copiar ask e abrir booking path.
10. Executive Proof Summary permite copiar, compartilhar ou imprimir proof curta.

Rotas principais:

- `/` - landing page
- `/start` - pricing/billing start
- `/sign-in` - entrada via auth real
- `/sign-up` - criacao de workspace via auth real
- `/privacy` - privacy notice
- `/terms` - terms
- `/app` - entrada privada, redireciona para setup, imports ou dashboard
- `/app/setup` - activation path / adjust setup
- `/app/setup/[step]` - etapas do setup
- `/app/imports` - booking inputs, imports, quick add e booking assistance
- `/app/dashboard` - daily brief, revenue view, proof e summary

## 6. Features prontas hoje

### Auth maturity

Implementado:

- NextAuth
- caminho real de Google auth
- sign-in e sign-up
- limpeza de providers fake
- protecao contra open redirect em redirects de auth

Dependencias:

- `AUTH_SECRET`
- Google provider configurado via envs

Limite:

- nao ha auth enterprise
- nao ha multiplos providers publicos alem do caminho real configurado

### Billing readiness

Implementado:

- pricing em `/start`
- planos `BASIC`, `GROWTH`, `PREMIUM` no schema
- Stripe Checkout route
- Stripe Portal route
- webhook de billing
- plan gating no app privado

Dependencias:

- Stripe envs
- price ids/config correta

Limite:

- billing preparado, mas depende de provider externo corretamente configurado
- pricing strategy ainda exige framing disciplinado

### Activation Path

Implementado:

- setup guiado
- uma main offer
- uma lead entry/source
- um booking path principal
- value per booking
- seller voice / mode
- activation final
- adjust setup apos ativacao

Arquivos principais:

- `src/app/(app)/app/setup/[step]/page.tsx`
- `src/app/(app)/app/setup/actions.ts`
- `components/onboarding/OnboardingStepLayout.tsx`
- `services/onboarding/*`

Limite:

- fluxo e narrow por design
- nao e configurador amplo de operacao comercial

### Booking Inputs

Implementado:

- import de appointments CSV
- import de clients CSV
- templates CSV
- preview de mapping assistido
- confirmacao antes de tornar dados visiveis
- persistencia de appointments, clients e data sources
- leitura de last import, rows, warnings e erros

Arquivos principais:

- `src/app/(app)/app/imports/page.tsx`
- `components/imports/CsvUploadCard.tsx`
- `components/imports/ImportsFlowGrid.tsx`
- `services/imports/*`

Limite:

- ainda e majoritariamente import-first
- nao ha integracao continua nativa com CRM/calendario
- import nao e BI nem observabilidade tecnica

### Manual Lead Quick Add

Implementado:

- modal curto para adicionar lead manualmente
- campos minimos: nome, email ou phone, source opcional
- cria client
- cria `LeadBookingOpportunity`
- herda main offer e booking path do workspace
- foca a oportunidade criada dentro da Booking Assistance

Arquivos principais:

- `components/lead-booking/ManualLeadQuickAdd.tsx`
- `src/app/(app)/app/imports/manual-lead-actions.ts`
- `services/lead-booking/create-manual-lead-booking-opportunity.ts`

Limite:

- nao e cadastro de lead completo
- nao tem owner, pipeline, inbox, stage customizado ou historico de conversa

### Booking Assistance

Implementado:

- objeto `LeadBookingOpportunity`
- estados principais:
  - `OPEN`
  - `READY`
  - `BLOCKED`
  - `BOOKED`
  - `CLOSED`
- readiness curta
- blocked reasons:
  - `missing_contact`
  - `missing_main_offer`
  - `missing_booking_path`
  - `ineligible_for_handoff`
- next action curta
- handoff assistido via email ou SMS
- tracking minimo com `handoffOpenedAt`
- lead state derivado para leitura de participacao minima

Arquivos principais:

- `components/lead-booking/LeadBookingOpportunityList.tsx`
- `services/lead-booking/opportunity-readiness.ts`
- `services/lead-booking/sync-lead-booking-opportunities.ts`
- `services/lead-booking/get-lead-intake-routing-read.ts`
- `services/lead-booking/build-booking-handoff.ts`
- `src/app/(app)/app/imports/lead-booking-actions.ts`

Limite:

- nao e mini-CRM
- nao executa contato
- nao cria thread
- nao faz follow-up automatico

### Suggested Message com LLM bounded

Implementado:

- suggested message contextual para oportunidades `READY`
- suggested ask para bloqueios simples elegiveis
- fallback local quando LLM falha ou nao esta configurada
- guardrails de tamanho, escopo e conteudo
- cache curto em memoria
- deduplicacao de chamadas in-flight

Elegivel:

- `READY`
- `BLOCKED` com `missing_contact`
- `BLOCKED` com `ineligible_for_handoff`

Nao elegivel:

- `missing_main_offer`
- `missing_booking_path`
- `BOOKED`
- `CLOSED`

Arquivos principais:

- `services/lead-booking/generate-lead-suggested-message.ts`
- `services/llm/request-bounded-structured-output.ts`
- `services/llm/get-llm-runtime-status.ts`

Limite:

- nao conversa com lead
- nao cria agente livre
- nao envia mensagem automaticamente
- nao cria follow-up engine

### Action Pack

Implementado:

- copiar suggested message
- copiar suggested ask quando aplicavel
- abrir booking path
- registrar handoff aberto

Limite:

- nao envia mensagem automaticamente
- nao prova que o lead recebeu contato
- registra participacao minima do Seller, nao execucao completa de vendas

### Daily Booking Brief

Implementado:

- leitura curta de primeiro minuto
- sinais de ready, blocked, handoffs opened e next move
- freshness/stale read
- link para a surface relevante

Arquivos principais:

- `components/briefs/DailyBookingBrief.tsx`
- `services/briefs/get-daily-booking-brief-read.ts`

Limite:

- nao e dashboard novo
- nao e feed de atividade
- meaningful change ainda pode evoluir futuramente

### Revenue View

Implementado:

- dashboard revenue-first
- booked appointments
- estimated imported revenue
- value per booking
- booked proof source
- lead-base support
- attribution/support read curto
- momentum e renewal/retention reads curtos

Arquivos principais:

- `src/app/(app)/app/dashboard/page.tsx`
- `services/dashboard/get-dashboard-overview.ts`
- `services/proof/get-booked-proof-read.ts`

Limite:

- nao e BI
- nao faz atribuicao causal forte
- ainda pode ficar visualmente denso em estados ricos

### Executive Proof Summary

Implementado:

- summary executiva curta
- sinais de proof selecionados
- copy summary
- share summary quando o browser suporta Web Share
- print/save PDF via print view

Arquivos principais:

- `components/proof/ExecutiveProofSummaryCard.tsx`
- `components/proof/ExecutiveProofSummarySheet.tsx`
- `services/proof/get-executive-proof-summary-read.ts`

Limite:

- nao e reporting suite
- nao e analytics profundo
- nao deve ser vendido como atribuicao completa de revenue

### Source Freshness / Stale Read

Implementado:

- leitura de freshness baseada nos dados/imports disponiveis
- microcopy curta para indicar se o read pode estar recente ou stale

Limite:

- nao e monitoramento tecnico
- nao e observability dashboard

### Landing, pricing e trust pages

Implementado:

- landing publica
- pricing/start
- privacy page
- terms page
- footer com links reais

Limite:

- GTM ainda precisa proteger buyer contra comparacao errada com CRM/inbox/automacao
- pricing e packaging exigem framing disciplinado

## 7. Estrutura tecnica

Stack:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 6
- PostgreSQL
- NextAuth
- Stripe
- Playwright

Pastas principais:

- `src/app` - rotas Next.js, paginas publicas, app privado e API routes
- `components` - UI compartilhada por dominio
- `services` - regras de negocio e leitura server-side
- `lib` - utilitarios e definicoes reutilizaveis
- `types` - contratos TypeScript
- `schemas` - schemas auxiliares
- `prisma` - schema e migrations
- `scripts` - sanity checks, QA e fixtures
- `docs` - documentacao, reviews e registros de produto

Padrao arquitetural:

- paginas chamam services server-side
- actions ficam proximas das rotas privadas quando sao submits de UI
- services concentram regra de negocio
- componentes mantem surfaces visuais
- Prisma e a fonte de persistencia

## 8. Modelo de dados principal

Entidades centrais:

- `User`
- `Workspace`
- `MedSpaProfile`
- `ActivationSetup`
- `DataSource`
- `Client`
- `Appointment`
- `LeadBookingOpportunity`
- `MetricsSnapshot`
- `AutomationRun`
- `RecoveryOpportunity`
- `ReviewRequest`

Entidades hoje mais centrais para o produto real:

- `Workspace` - unidade de conta/produto
- `ActivationSetup` - setup narrow
- `DataSource` - origem de imports
- `Client` - lead/client importado ou criado manualmente
- `Appointment` - booked proof e revenue read
- `LeadBookingOpportunity` - camada curta de booking assistance

Estados importantes:

- workspace:
  - `DRAFT`
  - `ACTIVE`
  - `PAUSED`
- billing:
  - `INACTIVE`
  - `ACTIVE`
  - `PAST_DUE`
  - `CANCELED`
- lead booking opportunity:
  - `OPEN`
  - `READY`
  - `BLOCKED`
  - `BOOKED`
  - `CLOSED`
- appointment:
  - `SCHEDULED`
  - `COMPLETED`
  - `CANCELED`
  - `NO_SHOW`

## 9. Integrações e dependencias externas

Auth:

- NextAuth
- Google auth quando configurado

Billing:

- Stripe Checkout
- Stripe Billing Portal
- Stripe Webhook

LLM:

- camada bounded em `services/llm`
- uso para structured output e suggested message
- fallback local quando indisponivel

Banco:

- PostgreSQL via `DATABASE_URL`
- Prisma Client

Dependencias criticas de env:

- `DATABASE_URL`
- `AUTH_SECRET`
- Google OAuth envs quando auth real estiver ligado
- Stripe envs quando checkout real estiver ligado
- LLM provider/envs quando suggested message por LLM estiver ligado

## 10. Comandos de desenvolvimento e readiness

Comandos disponiveis:

- `npm run dev` - inicia Next dev
- `npm run build` - build de producao
- `npm run start` - inicia build
- `npm run lint` - ESLint com max warnings 0
- `npm run typecheck` - TypeScript sem emit
- `npm run env:check` - consistencia de ambiente
- `npm run qa:clean-rerun` - rerun funcional com fixtures
- `npm run llm:env` - checagem de env LLM
- `npm run llm:smoke` - smoke LLM bounded
- `npm run llm:qa` - QA de fallback/structured output
- `npm run db:generate` - Prisma generate
- `npm run db:migrate` - Prisma migrate dev
- `npm run db:deploy` - Prisma migrate deploy
- `npm run db:validate` - Prisma validate

Checks que ja foram usados como readiness:

- lint
- typecheck
- build
- env:check
- prisma migrate status
- qa clean rerun
- full product QA harness
- Playwright screenshot capture

## 11. Estado atual de prontidao

Leitura consolidada:

- produto funcional: sim
- produto vendavel: sim, com framing disciplinado
- self-service: sim, mas nao deve ser venda cega
- premium feel: bom
- product truth: melhorado
- QA: core principal ja foi validado em ciclos anteriores

Status executivo:

`Pronto para venda com confianca disciplinada.`

Isso significa:

- pode ser mostrado
- pode ser vendido para buyer certo
- tem core funcional real
- nao deve ser vendido como CRM, inbox, BI ou automacao
- ainda precisa de boa clareza comercial para evitar compra errada

## 12. Observacoes e limites atuais

Limites reais:

- import-first ainda e parte importante do produto
- quick add reduz friccao, mas nao substitui ingestao continua
- booking assistance participa do booking, mas nao opera conversa
- LLM gera uma mensagem curta, nao atua como agente
- proof summary ajuda a defender valor, mas nao e BI
- revenue read depende de dados importados e qualidade da base
- pricing alto depende de buyer certo e framing correto

Riscos atuais:

- category misunderstanding
- oversell
- buyer comparar por checklist contra CRM/inbox/automacao
- assistance escorregar para mini-CRM em evolucoes futuras
- proof escorregar para mini-BI
- acumulo de badges, cards e sinais visuais

Observacao recente de QA:

- Durante uma captura de telas em 2026-04-22, `npm run qa:clean-rerun` falhou no submit final da activation, redirecionando para `/app/setup/activation?error=activation`.
- As telas privadas foram capturadas com seed controlado depois disso.
- Esse ponto deve ser investigado antes de tratar a build como release-ready sem ressalvas.
- Em rodada anterior, o clean rerun e os checks principais haviam passado apos os fixes de QA.

## 13. O que esta pronto agora

Pronto funcionalmente:

- landing publica
- sign-in/sign-up
- legal pages
- pricing/start com billing gate
- Activation Path
- adjust setup
- Booking Inputs com import CSV
- mapping preview/confirmation
- Revenue View
- Daily Booking Brief
- Source Freshness/Stale Read
- Booking Assistance
- Manual Lead Quick Add
- readiness e blocked reasons
- suggested message bounded com LLM/fallback
- Action Pack
- booking handoff por email/SMS
- tracking minimo de handoff aberto
- Executive Proof Summary
- copy/share/print proof summary

Pronto com dependencia externa:

- Stripe checkout/portal/webhook
- Google auth
- LLM suggested message real

Parcial ou limitado:

- habito diario ainda e bom, mas nao inevitavel
- Revenue View ainda pode ficar densa
- GTM self-service precisa fit clarification forte
- import-first ainda limita sensacao de produto vivo
- automation models existem no schema, mas nao devem ser vendidos como automacao ampla

Nao implementado como produto real:

- CRM
- inbox
- pipeline board
- follow-up engine
- chat com lead
- envio automatico de mensagens
- BI/reporting suite
- atribuicao causal completa
- integracoes continuas nativas com CRM/calendario
- multi-offer complexo
- enterprise roles/permissions

## 14. Mapa de arquivos principais

Produto publico:

- `src/app/page.tsx`
- `src/app/start/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`

Auth:

- `auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`
- `components/auth/*`
- `services/auth/*`

App privado:

- `src/app/(app)/app/layout.tsx`
- `src/app/(app)/app/page.tsx`
- `components/app/AppSidebar.tsx`

Setup:

- `src/app/(app)/app/setup/page.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`
- `src/app/(app)/app/setup/actions.ts`
- `components/onboarding/OnboardingStepLayout.tsx`
- `services/onboarding/*`

Imports:

- `src/app/(app)/app/imports/page.tsx`
- `src/app/(app)/app/imports/actions.ts`
- `components/imports/*`
- `services/imports/*`

Booking assistance:

- `components/lead-booking/*`
- `services/lead-booking/*`
- `types/lead-suggested-message.ts`

Dashboard/proof:

- `src/app/(app)/app/dashboard/page.tsx`
- `components/briefs/DailyBookingBrief.tsx`
- `components/proof/*`
- `services/dashboard/*`
- `services/proof/*`
- `services/briefs/*`

LLM:

- `services/llm/*`

Billing:

- `src/app/api/billing/*`
- `services/billing/*`

Data model:

- `prisma/schema.prisma`
- `prisma/migrations/*`

## 15. Recomendacao operacional

Antes de demo/venda:

1. Rodar `npm run lint`.
2. Rodar `npm run typecheck`.
3. Rodar `npm run build`.
4. Rodar `npm run env:check`.
5. Rodar `npx prisma migrate status`.
6. Investigar e rerodar `npm run qa:clean-rerun`, especialmente o ponto recente de activation.
7. Confirmar envs de Stripe, Google auth e LLM conforme ambiente.
8. Usar framing narrow: booking acceleration para MedSpas, nao CRM.

Linha de produto recomendada:

- fortalecer clareza
- fortalecer confianca operacional
- comprimir densidade visual quando necessario
- proteger escopo contra CRM, inbox, BI e automacao ampla

O produto nao precisa ficar maior agora. Ele precisa continuar ficando mais claro, confiavel e dificil de comprar errado.
