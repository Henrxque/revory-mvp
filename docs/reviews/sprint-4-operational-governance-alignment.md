# REVORY - Sprint 4 Governance Alignment Review

## Objetivo
Consolidar pequenos alinhamentos de governanca sobre as logicas operacionais ja aprovadas na Sprint 4, sem expandir escopo, sem criar novas features e sem alterar o comportamento funcional que ja estava aceito.

## Ordem oficial da Sprint 4
- Etapa 1:
  - fluxo executivo
  - definicao/gestao
- Etapa 2:
  - modelo operacional minimo
  - definicao/gestao
- Etapa 3:
  - confirmation logic base
- Etapa 4:
  - reminder logic base
- Etapa 5:
  - at-risk signals
- Etapa 6:
  - recovery opportunity
- Etapa 7:
  - review request eligibility
- Etapa 8:
  - superficie operacional agregada

Observacao:
- as etapas tecnicas da Sprint 4 comecam corretamente na confirmation logic base
- os artefatos de review foram alinhados para refletir essa ordem oficial

## Arquivos alterados
- Alterado: `types/confirmation.ts`
- Alterado: `types/at-risk.ts`
- Alterado: `services/confirmation/build-confirmation-classification.ts`
- Alterado: `services/reminder/build-reminder-classification.ts`
- Alterado: `services/at-risk/build-at-risk-classification.ts`
- Alterado: `services/recovery/build-recovery-opportunity-classification.ts`
- Alterado: `services/review-request/build-review-request-eligibility-classification.ts`
- Criado: `services/operations/get-usable-email.ts`
- Criado: `docs/reviews/sprint-4-operational-governance-alignment.md`
- Criado: `docs/reviews/generate_sprint_4_operational_governance_alignment_pdf.py`

## O que foi reforcado
- Todas as janelas operacionais atuais ficaram explicitamente tratadas como politicas iniciais de MVP.
- `usable email` passou a ter uma definicao operacional unica e centralizada.
- Buckets auxiliares, como `scheduled_later`, continuam marcados como visibilidade auxiliar, nao como prioridade operacional principal.
- Ficou documentado que a leitura conjunta entre `confirmation`, `reminder` e `at-risk` sera resolvida na camada agregada/UI posterior, nao dentro das classificacoes isoladas.
- Ficou reforcado que `recovery` e `review eligibility` continuam sendo insights operacionais iniciais, nao motores completos de rebooking ou reputation ops.

## Politicas iniciais de MVP agora explicitadas
- Confirmation:
  - janela operacional inicial de `48h`
  - email-first
  - `scheduled_later` continua como bucket auxiliar de visibilidade
- Reminder:
  - janela operacional inicial de `24h`
  - email-first
  - `scheduled_later` continua como bucket auxiliar de visibilidade
- At-risk:
  - janela imediata inicial de `6h`
  - usa a convivencia com as janelas de `confirmation` (`48h`) e `reminder` (`24h`) apenas como sinais base
  - continua sendo sinal explicavel, nao modelo preditivo
- Recovery:
  - janela operacional inicial de `14 dias`
  - continua como insight de oportunidade, nao agenda inteligente
- Review eligibility:
  - janela operacional inicial de `7 dias`
  - continua como elegibilidade simples, nao reputation ops completo

## Definicao centralizada de usable email
- Foi criado `services/operations/get-usable-email.ts` como definicao operacional unica.
- No estado atual do MVP, `usable email` significa apenas:
  - valor presente
  - trimmed
  - lowercased para consistencia
- Nao foi introduzida:
  - validacao MX
  - deliverability logic
  - historico de engajamento
  - enriquecimento externo
- As cinco classificacoes agora usam exatamente essa mesma definicao:
  - confirmation
  - reminder
  - at-risk
  - recovery
  - review request eligibility

## Buckets auxiliares continuam auxiliares
- `scheduled_later` continua existindo apenas para visibilidade e governanca de fila.
- Ele nao deve ser lido como prioridade operacional principal.
- A intencao permanece:
  - mostrar que o appointment existe
  - sem inflar a fila ativa do MVP
  - sem sugerir cadencia operacional complexa antes da hora

## Leitura conjunta entre confirmation, reminder e at-risk
- Essa convivencia continua intencionalmente separada nas classificacoes de base.
- Confirmation continua dizendo:
  - pronto agora
  - bloqueado por email
  - agendado para depois
- Reminder continua dizendo:
  - pronto agora
  - bloqueado por email
  - agendado para depois
- At-risk continua dizendo:
  - attention_now
  - watchlist
  - motivos explicitos
- A prioridade final entre esses sinais ainda sera resolvida na camada agregada/UI posterior, onde o produto podera:
  - mostrar quem precisa de acao primeiro
  - explicar o por que
  - preservar a clareza visual sem virar CRM ou inbox

## Recovery e review continuam insights iniciais
- Recovery continua sendo insight operacional simples:
  - cancelado ou no-show
  - sem rebook posterior
  - com ou sem bloqueio por email
- Isso ainda nao significa:
  - motor de rebooking
  - agenda inteligente
  - roteamento operacional completo
- Review eligibility continua sendo elegibilidade base:
  - completed recentemente
  - email utilizavel
  - reviews destination configurado
- Isso ainda nao significa:
  - campaign builder
  - cadence engine
  - reputation ops completo

## Evidencias de consistencia
- `npm run typecheck`
- `npm run build`
- `npx eslint 'services/operations/get-usable-email.ts' 'services/confirmation/build-confirmation-classification.ts' 'services/reminder/build-reminder-classification.ts' 'services/at-risk/build-at-risk-classification.ts' 'services/recovery/build-recovery-opportunity-classification.ts' 'services/review-request/build-review-request-eligibility-classification.ts' 'types/confirmation.ts' 'types/at-risk.ts' --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-3-confirmation-logic-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-4-reminder-logic-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-5-at-risk-logic-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-6-recovery-opportunity-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-7-review-request-eligibility-smoke.ts`

## Riscos remanescentes
- As janelas seguem politicas iniciais de MVP, nao regras definitivas por procedimento ou operacao.
- A base continua email-first, entao telefone nao vira fallback operacional nesta camada.
- A leitura final entre sinais concorrentes ainda depende da camada agregada/UI que vira depois.
- Recovery e review continuam honestamente estreitos; qualquer leitura de automacao completa ainda seria exagero neste momento.

## Proximos passos
- Construir a camada agregada/UI da Sprint 4 usando essas classificacoes ja alinhadas.
- Mostrar prioridade, contexto e proxima acao sugerida sem inflar o produto.
- Preservar identidade premium e honestidade funcional quando essa camada visual entrar no app.
