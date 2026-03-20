# REVORY Review Report

Data: 2026-03-20
Projeto: `revory-mvp`
Escopo revisado: Sprint 0 + Sprint 1 ate a Etapa 8

## 1. Resumo Executivo

O projeto REVORY foi estruturado como um MVP premium, self-service e MedSpa-first usando Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL e Clerk.

Nesta revisao, o ambiente local foi estabilizado, a base de dados foi conectada e migrada, a autenticacao foi integrada, a area privada foi organizada, o onboarding wizard foi implementado com persistencia real por etapa e a ativacao final do setup foi concluida com definicao do modo ativo do workspace.

No estado atual, o sistema ja suporta:

- entrada publica com landing e auth via Clerk
- sincronizacao do usuario autenticado com a base local
- criacao ou recuperacao do contexto minimo do app
- onboarding guiado com steps fechados do MVP
- persistencia de setup no banco
- ativacao final do setup com redirect para o dashboard placeholder

## 2. Escopo Entregue

### 2.1 Base do Projeto

Foi criado o setup inicial do repositorio `revory-mvp` com:

- Next.js
- TypeScript
- Tailwind CSS
- branch principal `main`
- estrutura enxuta e organizada

Tambem foram preparados:

- README inicial
- `.env.example`
- estrutura inicial do app
- documentacao base em `docs/`

### 2.2 Documentacao Entregue

Arquivos criados ou ajustados para documentacao do MVP:

- `docs/adr-stack.md`
- `docs/domain-model.md`
- `docs/user-journey.md`
- `docs/wireframes.md`
- `docs/project-structure.md`
- `docs/sprint-1-backlog.md`

Essa documentacao cobre:

- stack aprovada
- modelo de dominio
- jornada do usuario
- wireframes textuais
- estrutura do projeto
- backlog tecnico inicial

### 2.3 Prisma e Banco

Foi configurado Prisma com PostgreSQL e um schema coerente com o MVP.

Entidades principais cobertas:

- `User`
- `Workspace`
- `MedSpaProfile`
- `ActivationSetup`
- `DataSource`
- `Client`
- `Appointment`
- `AutomationRun`
- `RecoveryOpportunity`
- `ReviewRequest`
- `MetricsSnapshot`

A modelagem foi refinada para refletir o produto:

- tipos de fonte reais do MVP
- canal email-first
- modos fechados `MODE_A`, `MODE_B`, `MODE_C`
- KPIs de revenue protected / recovered
- estrutura do wizard refletida em `ActivationSetup`

Infra de banco entregue:

- Prisma configurado no projeto
- client reutilizavel em `db/prisma.ts`
- migration inicial criada
- migration aplicada na base local `revory_mvp`

### 2.4 Clerk e Autenticacao

Foi integrada autenticacao com Clerk usando App Router.

Implementacoes entregues:

- `ClerkProvider` no layout raiz
- rotas de `sign-in` e `sign-up`
- middleware do Clerk em `src/middleware.ts`
- protecao da area privada em `/app`
- landing integrada com auth

Correcao importante aplicada:

- o middleware foi movido para `src/middleware.ts` por causa da estrutura com `src/`
- o matcher foi ampliado para permitir uso de `auth()` na landing sem quebrar o Clerk

### 2.5 Sync do Usuario Local

Foi criada a sincronizacao do usuario autenticado do Clerk com a tabela local `User`.

Comportamento implementado:

- resolve `userId` com `auth()`
- busca dados do Clerk no servidor
- resolve email primario util
- converte nome para `fullName`
- executa `upsert` em `User` com `clerkUserId`

Caracteristicas:

- server-side only
- idempotente
- sem duplicacao de usuario
- pronta para ser reutilizada nas proximas etapas

### 2.6 Contexto Minimo do App

Foi implementado o contexto minimo server-side do produto:

- sync do usuario local
- criacao/recuperacao do `Workspace`
- criacao/recuperacao do `ActivationSetup`

Servicos criados:

- `services/workspaces/get-or-create-workspace.ts`
- `services/onboarding/get-or-create-activation-setup.ts`
- `services/app/get-app-context.ts`

Comportamento:

- um workspace principal inicial por usuario nesta sprint
- `ActivationSetup` nasce com `currentStep = template`
- `isCompleted = false`

### 2.7 Shell da Area Privada

Foi estruturada a area autenticada com:

- layout privado proprio
- header simples com contexto do workspace
- rota de entrada privada previsivel
- redirect inicial para setup ou dashboard

Arquivos principais:

- `src/app/(app)/app/layout.tsx`
- `src/app/(app)/app/page.tsx`
- `services/app/get-initial-app-path.ts`

Comportamento:

- `/app` resolve o contexto
- se o setup nao estiver concluido, manda para o wizard
- se estiver concluido, manda para o dashboard

### 2.8 Onboarding Wizard

Foi implementada a estrutura completa do wizard com 6 etapas:

1. Template MedSpa
2. Supported Source Type
3. Primary Channel
4. Google Reviews URL
5. Recommended Mode
6. Review and Activation

Arquivos principais:

- `services/onboarding/wizard-steps.ts`
- `components/onboarding/OnboardingStepLayout.tsx`
- `src/app/(app)/app/setup/page.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`
- `src/app/(app)/app/setup/actions.ts`

Comportamento entregue:

- rota real por step em `/app/setup/[step]`
- `currentStep` persistido no banco
- navegacao `Back` e `Continue`
- guard simples contra acesso inconsistente a etapas futuras
- UX guiada e sequencial

Correcao importante aplicada:

- o wizard passou a usar um unico `<form>` por step
- isso corrigiu o bug em que o `Continue` nao enviava os campos da etapa

### 2.9 Persistencia Real dos Steps

Foi implementada persistencia real para os campos do setup.

Persistido em `ActivationSetup`:

- `selectedTemplate`
- `primaryChannel`
- `googleReviewsUrl`
- `recommendedModeKey`
- `currentStep`
- `isCompleted` permanece `false` na Etapa 7

Persistido para a escolha de fonte:

- `DataSource.type`
- via `DataSource` placeholder unico por workspace
- `name = primary-source`
- `status = PENDING`

Servicos criados:

- `services/onboarding/update-activation-setup.ts`
- `services/onboarding/upsert-onboarding-data-source.ts`

Caracteristicas:

- sem autosave complexo
- sem integracao real com calendario
- sem parsing real de CSV
- sem duplicacao de estado client

### 2.10 Ativacao Final do Setup

Foi implementada a Etapa 8 da Sprint 1.

Comportamento final da ativacao:

- valida o setup minimo
- marca `ActivationSetup.isCompleted = true`
- preenche `ActivationSetup.activatedAt`
- aplica `Workspace.activeModeKey = recommendedModeKey`
- marca `Workspace.status = ACTIVE`
- redireciona para `/app/dashboard`

Servico criado:

- `services/onboarding/complete-activation-setup.ts`

Garantias:

- sem criar novos registros desnecessarios
- sem iniciar flows reais
- sem jobs automaticos
- sem puxar metricas reais
- transacao unica para manter consistencia entre `ActivationSetup` e `Workspace`

Tambem foi aplicado um guard no dashboard:

- se `ActivationSetup.isCompleted` for `false`, o usuario volta para o step correto do wizard

## 3. Setup Local e Infra

### 3.1 Variaveis Locais

Arquivos locais preparados:

- `.env`
- `.env.local`

Configuracao aplicada:

- `DATABASE_URL=postgresql://postgres:0810@localhost:5432/revory_mvp?schema=public`

### 3.2 Banco Local

O fluxo com Docker nao foi usado no fim, porque a maquina nao tinha virtualizacao disponivel para o Docker Desktop.

Foi reaproveitada uma instalacao nativa existente:

- servico identificado: `postgresql-x64-18`
- conexao validada em `localhost:5432`
- base `revory_mvp` criada e migrada

Tambem foi confirmado:

- `pg_isready` aceitando conexoes
- `SELECT current_database()` retornando `revory_mvp`

## 4. Validacoes Executadas

Validacoes tecnicas executadas com sucesso:

- `npm run db:validate`
- `npm run db:deploy`
- `npm run db:generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Tabelas confirmadas na base local:

- `_prisma_migrations`
- `activation_setups`
- `appointments`
- `automation_runs`
- `clients`
- `data_sources`
- `med_spa_profiles`
- `metrics_snapshots`
- `recovery_opportunities`
- `review_requests`
- `users`
- `workspaces`

Smoke tecnico de rotas:

- `GET /` retorna `200`
- `GET /sign-in` retorna `200`
- `GET /app` sem sessao redireciona para `/sign-in`
- `GET /app/setup/template` sem sessao redireciona para `/sign-in`

## 5. Estado Atual do Projeto

No estado atual, o projeto esta pronto para:

- login/signup via Clerk
- sincronizacao do usuario local
- criacao automatica do workspace inicial
- criacao automatica do activation setup
- wizard com steps fechados
- persistencia dos dados do setup
- conclusao do onboarding
- envio para dashboard placeholder

O projeto ainda nao inicia:

- flows reais de confirmacao
- reminder
- recovery
- review requests
- scheduler real
- metricas operacionais reais

Esse comportamento esta correto para o escopo da Sprint 1.

## 6. Pontos de Atencao

### 6.1 Aviso do Next.js

Durante o build, ha um aviso de deprecacao:

- o nome de arquivo `middleware.ts` foi depreciado em favor de `proxy`

Impacto:

- nao bloqueia o funcionamento atual
- pode ser tratado como ajuste tecnico futuro

### 6.2 Avisos do Clerk em Desenvolvimento

Persistem avisos de desenvolvimento do Clerk:

- development keys
- keyless mode
- aviso de `Structural CSS detected`

Impacto:

- nao bloqueiam o MVP local
- devem ser tratados quando as chaves finais e a configuracao de UI forem formalizadas

### 6.3 PostgreSQL Local

O PostgreSQL local chegou a ficar parado em alguns momentos.

Impacto:

- quando o servico nao esta em pe, a area privada falha ao abrir porque depende do banco para sync e contexto minimo

Recomendacao:

- garantir start mais estavel da instancia local na proxima passada operacional

## 7. Arquivos Mais Relevantes da Implementacao

### Core App

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/middleware.ts`

### Shell Privado

- `src/app/(app)/app/layout.tsx`
- `src/app/(app)/app/page.tsx`
- `src/app/(app)/app/dashboard/page.tsx`

### Onboarding

- `src/app/(app)/app/setup/page.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`
- `src/app/(app)/app/setup/actions.ts`
- `components/onboarding/OnboardingStepLayout.tsx`

### Services

- `services/auth/sync-user.ts`
- `services/app/get-app-context.ts`
- `services/app/get-initial-app-path.ts`
- `services/workspaces/get-or-create-workspace.ts`
- `services/onboarding/get-or-create-activation-setup.ts`
- `services/onboarding/wizard-steps.ts`
- `services/onboarding/set-current-step.ts`
- `services/onboarding/update-activation-setup.ts`
- `services/onboarding/upsert-onboarding-data-source.ts`
- `services/onboarding/complete-activation-setup.ts`

### Banco

- `prisma/schema.prisma`
- `prisma/migrations/20260319000100_init/migration.sql`
- `db/prisma.ts`

## 8. Conclusao

O projeto REVORY saiu de um scaffold inicial para uma base de MVP utilizavel com:

- autenticacao
- persistencia local
- contexto real de produto
- wizard funcional e persistente
- ativacao final coerente
- dashboard placeholder protegido

Em termos de Sprint 1, a base tecnica ficou pronta para que a Sprint 2 ataque as features operacionais sem retrabalho estrutural no auth, no banco ou no onboarding.
