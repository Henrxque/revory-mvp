# REVORY - Sprint 4 Etapa 10 QA Review

## Veredito
Reprovado.

Sprint 4 ficou tecnicamente consistente na camada operacional inicial, mas a validacao funcional autenticada no browser nao ficou confiavel o bastante para sign-off. O bloqueio principal nao esta na classificacao operacional em si; esta na borda de autenticacao Clerk/browser/protected routes, que continua impedindo a regressao ponta a ponta de dashboard + imports sob sessao ativa.

## Escopo testado
- Camada operacional inicial da Sprint 4
- Classification logic de confirmation, reminder, at-risk, recovery e review eligibility
- Superficie operacional no dashboard
- Baseline tecnico do app
- Tentativa de regressao autenticada de dashboard, import oficial e import assistido
- Honestidade funcional e clareza visual da UI operacional

## Cenarios executados
- `npm run typecheck`
- `npm run db:validate`
- `npm run lint`
- `npx tsx docs/testing/sprint-4-etapa-3-confirmation-logic-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-4-reminder-logic-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-5-at-risk-logic-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-6-recovery-opportunity-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-7-review-request-eligibility-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`
- Campanhas autenticadas no browser entre 23 de marco de 2026 e 26 de marco de 2026 via runner dedicado e reprodutores Playwright
- Repro minima de `sign-in`, `sign-up`, `factor-two`, acesso a `/app/dashboard` e `/app/imports`

## O que passou
- `typecheck` passou em 26 de marco de 2026.
- `db:validate` passou em 26 de marco de 2026.
- A logica base da Sprint 4 passou em todos os smokes dedicados.
- Confirmation logic:
  - `readyForConfirmationCount = 1`
  - `blockedMissingEmailCount = 1`
- Reminder logic:
  - `readyForReminderCount = 1`
  - `blockedMissingEmailCount = 1`
- At-risk logic:
  - `atRiskCount = 3`
  - `attentionNowCount = 2`
  - `blockedContactCount = 2`
- Recovery logic:
  - `readyForRecoveryCount = 1`
  - `opportunityCount = 2`
- Review eligibility:
  - com Google Reviews URL: `eligibleCount = 1`
  - sem Google Reviews URL: `blockedMissingReviewsUrlCount = 2`
- Operational surface smoke:
  - `hasLiveSignals = true`
  - `blockedCount = 2`
  - headline principal: `A small set of appointments needs attention now.`
  - prioridade curta: `at_risk`, `at_risk`, `reminder`, `recovery`, `review_request`
- A UI vazia da camada operacional chegou a renderizar corretamente em browser autenticado durante a campanha de 23 de marco de 2026, com evidencia em screenshot.

## O que falhou
- `lint` continua falhando por warnings antigos em arquivo temporario de `.tmp`, nao por erro de app:
  - `C:\Users\hriqu\Documents\revory-mvp\.tmp\sprint-3-etapa-5-qa-import-assisted.mjs`
- A campanha autenticada principal da Etapa 10 nao conseguiu fechar o fluxo ponta a ponta de browser para dashboard/imports por instabilidade de auth.
- O `sign-up` no browser falhou com resposta Clerk `captcha_missing_token`.
- O `sign-in` em sessao nova entrou em `factor-two` e a persistencia da sessao para rotas protegidas continuou instavel.
- Mesmo quando a sessao client-side foi criada, `/app/dashboard` ainda caiu em `/sign-in?redirect_url=%2Fapp%2Fdashboard` em repros do dia 26 de marco de 2026.
- Regressao autenticada completa de import oficial e import assistido nao ficou conclusiva no browser por causa desses bloqueios de auth.

## Bugs encontrados
- `P1` Sign-up autenticado bloqueado por validacao de seguranca do Clerk (`captcha_missing_token`)
  - Passos:
    - abrir `/sign-up`
    - preencher email e senha
    - clicar em `Continue`
  - Resultado observado:
    - `POST /v1/client/sign_ups` retorna `400`
    - mensagem: `Authentication unsuccessful due to failed security validations`
    - codigo: `captcha_missing_token`
  - Impacto:
    - bloqueia criacao confiavel de workspace autenticado no browser
    - impede regressao funcional de Sprint 4 por fluxo real de sessao

- `P1` Sessao autenticada nao se sustenta ao entrar em rotas protegidas
  - Passos:
    - autenticar com helper Clerk ou concluir parte do fluxo de auth
    - navegar para `/app/dashboard`
  - Resultado observado:
    - app volta para `/sign-in?redirect_url=%2Fapp%2Fdashboard`
    - `AuthSessionGate` fica em `Checking workspace session` ou a tela volta ao sign-in
  - Impacto:
    - impede validacao confiavel de dashboard e imports sob sessao ativa
    - cria risco real de acesso quebrado ao shell privado

- `P1` Auth recovery interrompia o proprio login/reauth
  - Passos:
    - abrir `/sign-in`
    - submeter credenciais
    - cair em `factor-two`
  - Resultado observado antes da correcao:
    - requests de auth eram abortadas no meio do fluxo
    - o bridge disparava redirect sem sessao validada
  - Impacto:
    - quebrava sign-in e reauth justamente quando o Clerk ainda estava concluindo o fluxo
  - Status:
    - corrigido nesta campanha

- `P2` Dashboard mistura metricas futuras dentro da superficie operacional viva
  - Local:
    - `North-star metrics` em `C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\dashboard\page.tsx`
  - Impacto:
    - a camada operacional real fica correta, mas o dashboard ainda sugere capacidade futura dentro da tela viva
    - isso enfraquece honestidade funcional do MVP

## Bugs corrigidos durante a QA
- Corrigido em `C:\Users\hriqu\Documents\revory-mvp\components\auth\AuthRecoveryBridge.tsx`
- Ajuste aplicado:
  - removido o auto-redirect sem sessao valida que forçava `window.location.replace(redirectTarget)` mesmo com `userId` ausente
- Efeito da correcao:
  - o fluxo de `sign-in` parou de abortar requests de auth no meio da etapa de `factor-two`
  - a tela de auth ficou menos propensa a interromper o proprio Clerk
- Limitacao restante:
  - a correcao removeu um bug real, mas nao resolveu sozinha a instabilidade total de sign-up/sign-in do ambiente Clerk local

## Regressao do import oficial e import assistido
- Backend e parsing:
  - nao apareceu regressao nova nos smokes da camada operacional
  - a Sprint 3 ja estava previamente aprovada e nao surgiu evidencia tecnica de quebra direta nas services de import
- Browser autenticado:
  - nao foi possivel concluir a regressao ponta a ponta com confiabilidade suficiente nesta etapa
  - o bloqueio foi auth/session, nao mapeamento/import da Sprint 4

## Evidencias principais
- Screenshot do dashboard vazio operacional:
  - `C:\Users\hriqu\Documents\revory-mvp\.tmp\qa-sprint4-etapa10\2026-03-23T03-14-52-560Z\01-dashboard-initial.png`
- Tentativa autenticada da Etapa 10 bloqueada em sign-up/sign-in:
  - `C:\Users\hriqu\Documents\revory-mvp\.tmp\qa-sprint4-etapa10\2026-03-27T01-17-07-935Z\results.json`
  - `C:\Users\hriqu\Documents\revory-mvp\.tmp\qa-sprint4-etapa10\2026-03-27T01-16-08-922Z\results.json`
- Evidencia visual do sign-in/factor-two:
  - `C:\Users\hriqu\Documents\revory-mvp\.tmp\qa-sprint4-etapa10-debug\after-sign-in-submit.png`
  - `C:\Users\hriqu\Documents\revory-mvp\.tmp\qa-sprint4-etapa10-debug\stage-after-password.png`
  - `C:\Users\hriqu\Documents\revory-mvp\.tmp\qa-sprint4-etapa10-debug\factor-two-after-continue.png`

## Recomendacao final
- Nao dar sign-off final da Etapa 10 ainda.
- Considerar a camada operacional tecnicamente valida no backend e na classificacao.
- Tratar a borda `Clerk auth -> sessao persistida -> protected routes` como bloqueador de QA funcional.
- Depois de estabilizar:
  - sign-up sem `captcha_missing_token`
  - sign-in/reauth sem cair em loop de `/sign-in`
  - acesso consistente a `/app/dashboard` e `/app/imports`
- rerodar a campanha autenticada completa antes de aprovar Sprint 4.
