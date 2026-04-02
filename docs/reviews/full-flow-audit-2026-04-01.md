# REVORY Seller Full Flow Audit

Date: 2026-04-01

## Scope

Audit completo do fluxo atual do app REVORY Seller com lente combinada de:

- QA sênior
- product review
- staff engineering review
- alinhamento de escopo MVP via `docs/source-of-truth.md`
- crítica de posicionamento via skill `alice`

Critérios de validação usados durante toda a leitura:

- narrow
- booking-first
- revenue-first
- proof-backed
- activation-driven
- premium
- sem drift para CRM
- sem drift para BI inchado
- sem lógica obscura para parecer que funciona

## Evidence

Verificado por execução:

- `npm run lint` passou
- `npm run build` passou
- `npm run typecheck` falhou no primeiro run por ruído transitório de `.next/types/validator.ts`, mas passou no rerun final
- smoke público rodado em runtime:
  - `GET /app` retornou `307` para `/sign-in?redirect_url=%2Fapp`
  - `GET /sign-in` renderizou normalmente

Verificado por análise estática profunda:

- shell e navegação: `src/app/(app)/app/layout.tsx`, `components/app/AppSidebar.tsx`, `services/app/get-initial-app-path.ts`
- Revenue View: `src/app/(app)/app/dashboard/page.tsx`, `services/dashboard/get-dashboard-overview.ts`
- Booking Inputs: `src/app/(app)/app/imports/page.tsx`, `components/imports/CsvUploadCard.tsx`, `components/imports/ImportsFlowGrid.tsx`, `components/imports/AssistedImportMappingPreview.tsx`, `src/app/(app)/app/imports/actions.ts`, serviços de import/persistência
- Activation Path: `src/app/(app)/app/setup/page.tsx`, `src/app/(app)/app/setup/[step]/page.tsx`, `src/app/(app)/app/setup/actions.ts`, `services/onboarding/*`, `components/onboarding/OnboardingStepLayout.tsx`
- contratos de estado e persistência: `prisma/schema.prisma`, `types/imports.ts`, `types/decision-support.ts`

Limitação:

- o percurso autenticado completo não pôde ser navegado manualmente via browser nesta auditoria por depender do OAuth local; por isso, os estados internos do workspace foram auditados principalmente por leitura de código, coerência de dados e encadeamento de rotas/handlers.

## Alignment Verdict

O produto está mais narrow e muito mais próximo da tese Seller do que nas sprints iniciais, mas ainda não fecha como fluxo íntegro de ponta a ponta. Os principais leaks não são cosméticos: hoje a UI ainda consegue declarar proof antes de proof real, tratar support import como se fosse booked proof e prometer um revenue read que o código nem sempre materializa. Isso enfraquece confiança comercial, demo flow e honestidade funcional em pontos centrais do MVP.

## A. Bugs Funcionais

### 1. P0 — Shell pode declarar booked proof ativo quando só existe lead-base import

- Severidade: P0
- Tela: shell global, sidebar, header, qualquer rota autenticada
- Evidência:
  - `src/app/(app)/app/layout.tsx:40-52`
  - `src/app/(app)/app/layout.tsx:69-95`
- Como reproduzir:
  - ativar o workspace
  - importar apenas `clients`
  - não importar `appointments`
- Comportamento atual:
  - `bookingInputsStatus` vira `Proof active` se qualquer CSV tiver sucesso
  - o subtitle do workspace pode mostrar `Seller workspace live with booked proof`
  - a sidebar ganha dot de sucesso em Booking Inputs
- Comportamento esperado:
  - o shell só deve tratar `booked proof` como ativo quando o source de `appointments` estiver realmente live
  - lead base pode ficar live como support, mas nunca promover o status de proof principal

### 2. P0 — Contrato de revenue não fecha com a promessa do activation

- Severidade: P0
- Tela: Revenue View
- Evidência:
  - promessa de baseline: `services/onboarding/wizard-steps.ts:36-43`
  - reforço de contrato: `src/app/(app)/app/setup/[step]/page.tsx:566-570`
  - cálculo real: `services/dashboard/get-dashboard-overview.ts:103-166`
- Como reproduzir:
  - concluir activation com `Value per booking`
  - importar appointments sem coluna `estimated_revenue`
  - abrir dashboard
- Comportamento atual:
  - o dashboard só soma `appointment.estimatedRevenue`
  - se o CSV não trouxer essa coluna, `Revenue now` pode continuar `Revenue pending` mesmo com booked appointments + value per booking definidos
- Comportamento esperado:
  - ou o revenue read deve usar fallback coerente com `bookedAppointments * averageDealValue`
  - ou a UI/copy deve parar de prometer que `value per booking` ancora esse número diretamente

### 3. P1 — Revenue pode somar appointments que não sustentam booked proof

- Severidade: P1
- Tela: Revenue View
- Evidência:
  - booked proof count: `services/dashboard/get-dashboard-overview.ts:70-77`
  - revenue aggregate: `services/dashboard/get-dashboard-overview.ts:103-112`
  - hero/read usa ambos: `src/app/(app)/app/dashboard/page.tsx:164-165`, `src/app/(app)/app/dashboard/page.tsx:254-288`
- Como reproduzir:
  - importar appointments cancelados ou `no_show` com `estimatedRevenue`
  - deixar `bookedAppointments` em zero
  - abrir dashboard
- Comportamento atual:
  - o revenue number pode aparecer mesmo com proof badge em estado pendente
- Comportamento esperado:
  - revenue e booked proof precisam usar a mesma lógica-base ou um framing explicitamente separado

### 4. P1 — Bloco “Booked proof” fica live com qualquer import source, inclusive lead base

- Severidade: P1
- Tela: Revenue View
- Evidência:
  - `src/app/(app)/app/dashboard/page.tsx:316-375`
  - `services/dashboard/get-dashboard-overview.ts:114-184`
- Como reproduzir:
  - importar apenas `clients`
  - abrir dashboard
- Comportamento atual:
  - o card `Booked proof` recebe badge `Live`
  - a lista interna pode mostrar `Lead base`
  - a seção deixa de cair no empty state de proof pendente
- Comportamento esperado:
  - a seção de booked proof deve refletir apenas o source de `appointments`
  - lead base, se exibido, precisa aparecer como support separado ou claramente subordinado

### 5. P1 — Go-live manda para o dashboard mesmo quando o path correto ainda é Booking Inputs

- Severidade: P1
- Tela: Activation Path -> go-live
- Evidência:
  - redirect do submit: `src/app/(app)/app/setup/actions.ts:189-197`
  - path inicial correto: `services/app/get-initial-app-path.ts:13-19`
  - copy do step final: `services/onboarding/wizard-steps.ts:58-66`
  - warning do step final: `src/app/(app)/app/setup/[step]/page.tsx:562-569`
- Como reproduzir:
  - completar activation sem importar appointments
  - clicar em `Go live with REVORY Seller`
- Comportamento atual:
  - o submit redireciona direto para `/app/dashboard`
- Comportamento esperado:
  - o go-live deveria reaproveitar o mesmo path resolution de `/app`
  - sem booked proof, o próximo destino deveria ser `/app/imports`

### 6. P1 — Booking path aparece “locked” antes de escolha real do usuário

- Severidade: P1
- Tela: Activation Path, Setup overview, Revenue View
- Evidência:
  - schema default: `prisma/schema.prisma:149-155`
  - setup overview usa null-check como lock: `src/app/(app)/app/setup/page.tsx:151`, `src/app/(app)/app/setup/page.tsx:167-173`
  - dashboard idem: `src/app/(app)/app/dashboard/page.tsx:172-175`
  - channel form nasce preselecionado: `src/app/(app)/app/setup/[step]/page.tsx:201-204`, `src/app/(app)/app/setup/[step]/page.tsx:366-397`
- Como reproduzir:
  - criar workspace novo
  - avançar pelo fluxo sem tocar no passo de channel
  - abrir setup overview ou dashboard depois
- Comportamento atual:
  - `primaryChannel` já nasce em `EMAIL`
  - o produto trata booking path como presente antes de escolha explícita
- Comportamento esperado:
  - ou channel deve ser decisão real sem default persistido
  - ou a UI precisa assumir honestamente que o sistema já escolheu o default pelo usuário

### 7. P2 — “Official mapping” depende da ordem exata dos headers

- Severidade: P2
- Tela: Booking Inputs / mapping review
- Evidência:
  - `services/imports/build-assisted-import-payload.ts:346-349`
  - CTA derivado disso: `components/imports/CsvUploadCard.tsx:367-374`
- Como reproduzir:
  - subir CSV com headers oficiais corretos, mas em ordem diferente do template
- Comportamento atual:
  - `exactTemplateMatch` vira falso
  - a UI cai para framing de guided mapping mesmo com fit estrutural correto
- Comportamento esperado:
  - “official fit” deveria depender do conjunto de headers válidos, não da ordem literal

## B. Inconsistências de UX / Copy / Estado

### 1. Semântica de estado ainda muda demais entre telas

- O que está inconsistente:
  - `Proof active`, `Proof ready`, `Proof next` no shell
  - `Live`, `Pending`, `Ready` em Booking Inputs
  - `Live`, `Pending`, `Locked`, `Missing` em Activation
  - `Live` em Revenue View baseado em `importSources.length > 0`
- Por que confunde:
  - “ready” às vezes significa “source escolhido”
  - às vezes significa “support opcional”
  - e às vezes significa “revenue já pode ler”
- Correção objetiva:
  - fixar uma semântica curta:
  - `Live` = dado realmente visível e sustentando a tela
  - `Ready` = pré-condição configurada, mas sem prova visível
  - `Pending` = ainda falta ação do usuário
  - `Locked` = configuração concluída, não prova operacional

### 2. Activation se apresenta como escolha explícita, mas parte do fluxo já vem decidida

- O que está inconsistente:
  - `template` começa visualmente em `Injectables`
  - `mode` começa visualmente em `MODE_A`
  - `channel` já nasce persistido como `EMAIL`
- Evidência:
  - `src/app/(app)/app/setup/[step]/page.tsx:200-204`
  - `src/app/(app)/app/setup/[step]/page.tsx:307-313`
  - `src/app/(app)/app/setup/[step]/page.tsx:381-385`
- Por que confunde:
  - a copy fala em “choose/lock”, mas a experiência já chega pré-resolvida
- Correção objetiva:
  - ou assumir copy de default recomendado
  - ou remover preseleção/persistência prematura

### 3. Source step não fica neutro quando nada foi escolhido

- O que está inconsistente:
  - sem source selecionado, a guidance layer cai no branch de `Guided CSV upload`
- Evidência:
  - input nulo: `src/app/(app)/app/setup/[step]/page.tsx:205`
  - branch implícito: `services/decision-support/build-activation-step-read.ts:148-186`
- Por que confunde:
  - o produto parece ter recomendado `MANUAL_IMPORT` antes de qualquer escolha real
- Correção objetiva:
  - adicionar estado neutro explícito para “source not chosen yet”

### 4. Booking Inputs diz “proof first”, mas mantém CTA de Revenue View mesmo sem proof

- O que está inconsistente:
  - a hero confirma `Revenue read next`, mas o CTA principal continua `Open Revenue View`
- Evidência:
  - `src/app/(app)/app/imports/page.tsx:115-150`
- Por que confunde:
  - o fluxo comercial fica menos didático exatamente no momento em que deveria ser mais óbvio
- Correção objetiva:
  - quando proof não existe, trocar CTA principal para `Start booked proof` ou rolar para o bloco de upload

## C. Gaps de Fluxo

### 1. O path macro prometido ainda não se materializa de forma confiável

- Onde quebra:
  - go-live manda ao dashboard antes de proof
  - dashboard aceita esse estado e tenta parecer revenue-first mesmo sem sustentação suficiente
- Onde o usuário perde confiança:
  - quando vê uma workspace “live” sem booked proof real
  - quando revenue parece depender de detalhes de import e não do activation contract

### 2. “Booked proof sustenta revenue” ainda não é uma cadeia técnica fechada

- Onde quebra:
  - o activation promete que `value per booking` ancora revenue
  - o dashboard usa `estimatedRevenue` importado no appointment
- Onde o usuário perde confiança:
  - quando o produto parece dizer uma coisa no setup e operar outra no dashboard

### 3. Lead base ainda consegue contaminar o centro perceptível do sistema

- Onde quebra:
  - shell
  - booked proof section do dashboard
  - status globais do workspace
- Onde o usuário perde confiança:
  - quando uma importação secundária parece “ativar proof” sozinha

### 4. Parte da compreensão do produto ainda depende de interpretação, não de sinalização limpa

- Onde quebra:
  - diferença entre configuração concluída e prova visível
  - diferença entre support import e booked proof
  - diferença entre revenue configurado e revenue observado
- Onde o usuário perde confiança:
  - quando precisa adivinhar o que cada badge realmente quer dizer

## D. Melhorias Prioritárias

### P0

- Corrigir `bookingInputsStatus` para usar somente o source de `appointments` como prova primária.
- Corrigir `workspaceSubtitle` e qualquer sinal global que hoje assume proof ativo por causa de `clients`.
- Fechar o contrato de revenue:
  - ou calcular fallback com `averageDealValue`
  - ou reduzir explicitamente a promessa de revenue view atual.

### P1

- Redirecionar o submit final de activation pelo mesmo resolver de `/app`.
- Remover ou neutralizar o default persistido de `primaryChannel`.
- Separar `Booked proof` de `Lead base` no dashboard.
- Reescrever semântica de estados entre shell, activation, imports e dashboard.

### P2

- Tornar `exactTemplateMatch` insensível à ordem.
- Neutralizar a guidance do source step quando ainda não houve escolha.
- Ajustar CTA da hero de Booking Inputs quando proof ainda está pendente.
- Rever os defaults visuais de template/mode para não parecerem já escolhidos.

## E. Quick Wins

- Em `submitOnboardingStep`, trocar `redirect("/app/dashboard")` por `redirect("/app")`.
- Em `layout.tsx`, derivar o status de Booking Inputs apenas de `csvSources.appointments`.
- Em `dashboard/page.tsx`, fazer a seção `Booked proof` ler somente `appointments`.
- Em `build-activation-step-read.ts`, criar branch explícito para `selectedDataSourceType === null`.
- Em `imports/page.tsx`, trocar o CTA principal quando `hasBookedProofVisible === false`.
- Em `build-assisted-import-payload.ts`, trocar `exactTemplateMatch` por comparação de conjunto de headers.

## Final Verdict

Veredito: **reprovado para fechamento final do fluxo sem correções**.

Motivo:

- existem bugs centrais de integridade entre proof, revenue e shell status
- o path activation -> Booking Inputs -> Revenue View ainda não é aplicado com consistência
- o dashboard ainda pode parecer mais comprovado do que realmente está

O produto está perto, mas ainda não está suficientemente honesto e coeso para ser tratado como fluxo final validado de ponta a ponta.
