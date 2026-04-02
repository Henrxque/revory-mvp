# Final Flow Smoke Test

Date: 2026-04-01

## A. Resumo executivo

O fluxo principal do REVORY Seller ficou **coerente e honesto no núcleo funcional** depois da remediation de integridade. Os blockers centrais do flow audit passaram:

- lead base não promove booked proof
- revenue usa a mesma base lógica do booked proof
- `Value per booking` sustenta revenue quando `estimatedRevenue` não existe
- go-live respeita o path real do app
- Booking Inputs respeita proof readiness
- defaults de setup não estão mais sendo promovidos como decisão explícita já travada
- a semântica principal de status ficou consistente o suficiente no path ativo

Evidência executada:

- app rodando localmente em `http://localhost:3000`
- smoke browser público: `/app` redirecionando para sign-in
- smoke funcional real por cenários em banco + services reais do app

Limitação explícita:

- o path privado inteiro **não foi percorrido visualmente no browser autenticado** porque o ambiente local atual depende de OAuth Google via NextAuth e não há um helper automatizado de sessão local válido neste setup
- por isso, a navegação privada foi validada por execução real das mesmas funções/server services que governam routing, proof, revenue e CTA, com confirmação estática dos ramos de UI onde necessário

Confiança geral após remediation: **alta no núcleo do fluxo**, com **ressalva baixa de cobertura visual autenticada**.

## B. Tabela de cenários testados

| Cenário | Status | Observação curta |
| --- | --- | --- |
| 1. Workspace novo sem activation concluído | PASS | `/app` resolve para `/app/setup/template`; shell não promove proof; booking path não aparece locked cedo |
| 2. Activation concluído sem appointments importados | PASS | go-live lógico resolve para `Booking Inputs`; shell fala `booked proof next`; CTA vira `Start booked proof` |
| 3. Importar apenas lead base / clients | PASS | clients ficam como support; não ativam booked proof nem liberam `Revenue View` |
| 4. Importar appointments válidos com booked outcomes | PASS | proof vira live de verdade; `/app` resolve para dashboard; appointments viram a source central |
| 5. Appointments sem `estimatedRevenue`, com `averageDealValue` | PASS | revenue cai no fallback correto: booked appointments × value per booking |
| 6. Appointments com `CANCELED` / `NO_SHOW` | PASS | canceled e no-show não entram no booked proof nem inflacionam revenue |
| 7. Channel/default honesty | PASS | Email segue como recommended default; setup overview não trata path como locked antes da hora |
| 8. Source step neutro | PASS | source read fica neutro quando nada foi escolhido; não assume manual import |
| 9. Booking Inputs hero CTA logic | PASS | CTA muda corretamente entre `Start booked proof`, `Review booked proof` e `Open Revenue View` |
| 10. Official mapping header order | PASS | official fit aceita headers oficiais fora de ordem |

## Evidência

- Resultado detalhado dos cenários: [scenario-results.json](C:/Users/hriqu/Documents/revory-mvp/.tmp/final-flow-smoke-2026-04-01/scenario-results.json)
- Evidência visual pública do app rodando: [app-redirect-signin.png](C:/Users/hriqu/Documents/revory-mvp/.tmp/final-flow-smoke-2026-04-01/app-redirect-signin.png)

## Como cada cenário foi validado

- Execução browser real:
  - redirect público de `/app` para sign-in em app rodando localmente
- Execução funcional real contra banco + services:
  - `getInitialAppPath`
  - `getBookedProofRead`
  - `getDashboardOverview`
  - `getCsvUploadSources`
  - `hasLiveCsvUploadSource`
  - `buildActivationStepRead`
  - `buildAssistedImportPayloadFromCsv`
- Confirmação estática complementar:
  - [layout.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/layout.tsx)
  - [imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)
  - [dashboard/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/dashboard/page.tsx)
  - [setup/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/page.tsx)
  - [setup/actions.ts](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/actions.ts)
  - [setup/[step]/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/[step]/page.tsx)

## C. Bugs remanescentes

Nenhum bug remanescente crítico apareceu nesta passada.

Nenhum dos blockers do flow audit reapareceu:

- lead base mascarando proof: não reproduziu
- revenue solto da base de proof: não reproduziu
- fallback de `Value per booking` ausente: não reproduziu
- redirect de go-live empurrando cedo para dashboard: não reproduziu
- CTA principal de Booking Inputs empurrando cedo para Revenue View: não reproduziu
- exact match dependente da ordem dos headers: não reproduziu

## D. Inconsistências leves

- A única ressalva real desta rodada é de **cobertura**, não de comportamento do produto: o fluxo privado inteiro não foi navegado visualmente no browser com sessão autenticada real porque o ambiente local atual usa Google OAuth via NextAuth sem helper de login automatizado.
- Isso não impediu a validação funcional dos contratos centrais do produto, mas ainda vale um último pass visual autenticado quando houver um auth helper local ou um ambiente de staging com login controlado.

## E. Recomendaçāo final

**Aprovado com pequenos ajustes.**

Motivo:

- o fluxo e os contratos centrais do Seller estão aprovados
- os blockers que impediam sign-off funcional foram resolvidos
- a pequena ressalva restante é cobertura visual autenticada, não bug do produto

## Julgamento de produto

Pela régua do REVORY Seller, o produto agora volta a contar a verdade:

- proof central = booked appointments visíveis
- lead base = suporte, não centro
- revenue = prova econômica derivada da mesma base de booked proof
- activation = readiness, não prova falsa
- routing = conduz para o próximo passo real do workspace

Isso mantém o app narrow, booking-first, revenue-first e longe de CRM, BI inchado ou operação confusa.
