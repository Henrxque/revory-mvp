# REVORY - Sprint 4 Etapa 1 Review

## Objetivo da etapa
Implementar a base tecnica da confirmation logic do MVP para identificar quais appointments entram em necessidade operacional de confirmacao, usando apenas dados ja existentes no produto e sem abrir automacoes, estados complexos ou promessas funcionais fora do escopo atual.

## Arquivos criados/alterados
- Criado: `types/confirmation.ts`
- Criado: `services/confirmation/build-confirmation-classification.ts`
- Criado: `services/confirmation/get-confirmation-classification.ts`
- Criado: `docs/testing/sprint-4-etapa-1-confirmation-logic-smoke.ts`
- Criado: `docs/reviews/sprint-4-etapa-1-confirmation-logic-base.md`
- Criado: `docs/reviews/generate_sprint_4_etapa_1_confirmation_logic_base_pdf.py`

## Decisoes tomadas
- A regra foi mantida estreita por alinhamento de escopo da Sprint 4:
  - email-first
  - sem WhatsApp
  - sem envio real
  - sem historico de tentativas
  - sem estados como sent, delivered, confirmed, failed
- A classificacao usa apenas sinais que o app ja sustenta com honestidade:
  - `Appointment.status`
  - `Appointment.scheduledAt`
  - `Client.email`
- O resultado foi estruturado como payload server-side pronto para UI, sem obrigar retrabalho estrutural na proxima superficie visual.
- Nenhuma semantica de import, dashboard ou KPI existente foi reaberta nesta etapa.

## Regra minima implementada
- A fila de confirmacao considera apenas appointments com:
  - `status = SCHEDULED`
  - `scheduledAt > now`
- A janela operacional inicial do MVP foi fixada em `48h`.
- Classificacao aplicada:
  - `ready_for_confirmation`
    - appointment agendado no futuro
    - dentro da janela de 48h
    - cliente com email utilizavel
  - `blocked_missing_email`
    - appointment agendado no futuro
    - dentro da janela de 48h
    - cliente sem email utilizavel
  - `scheduled_later`
    - appointment agendado no futuro
    - fora da janela atual de 48h
- Appointments passados ou com status diferente de `SCHEDULED` ficam fora da classificacao desta etapa.

## Estrutura tipada pronta para UI
- O payload final exposto por `RevoryConfirmationClassification` ja entrega:
  - `generatedAt`
  - `channel`
  - `windowHours`
  - `windowEndsAt`
  - `totalFutureScheduledAppointments`
  - `needsAttentionCount`
  - `readyForConfirmationCount`
  - `blockedMissingEmailCount`
  - `scheduledLaterCount`
  - `items`
- Cada item ja entrega dados suficientes para UI operacional:
  - `appointmentId`
  - `clientId`
  - `clientName`
  - `clientEmail`
  - `scheduledAt`
  - `hoursUntilAppointment`
  - `serviceName`
  - `providerName`
  - `estimatedRevenue`
  - `confirmationState`
  - `reasonCode`
  - `requiresAttention`

## Heuristica usada
- Esta etapa nao tenta inferir comportamento inteligente de canal nem score de risco.
- A heuristica e deliberadamente simples:
  - tempo ate o appointment
  - status operacional do appointment
  - disponibilidade de email
- Isso mantem a base premium e honesta:
  - o produto mostra o que ja consegue sustentar
  - sem fingir que a automacao de confirmacao ja existe de ponta a ponta

## Evidencias do que funciona
- `npm run typecheck`
- `npm run build`
- `npx eslint 'services/confirmation/build-confirmation-classification.ts' 'services/confirmation/get-confirmation-classification.ts' 'types/confirmation.ts' 'docs/testing/sprint-4-etapa-1-confirmation-logic-smoke.ts' --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-1-confirmation-logic-smoke.ts`

Resultado observado no smoke:
- `totalFutureScheduledAppointments = 3`
- `readyForConfirmationCount = 1`
- `blockedMissingEmailCount = 1`
- `scheduledLaterCount = 1`
- `needsAttentionCount = 2`
- `appointment-ready -> ready_for_confirmation`
- `appointment-missing-email -> blocked_missing_email`
- `appointment-later -> scheduled_later`
- `appointment-past` ficou fora da fila
- `appointment-cancelled` ficou fora da fila

## Impacto visual e UX desta etapa
- Nenhuma nova superficie visual foi aberta nesta etapa.
- Isso foi intencional:
  - a base operacional foi preparada primeiro
  - a UI entra depois consumindo um payload ja tipado e estavel
- Essa escolha preserva a identidade premium da REVORY porque evita:
  - blocos falsamente operacionais
  - estados visuais que sugerem automacao pronta quando ela ainda nao existe
  - telas tecnicas inchadas antes da hora

## Edge cases conhecidos
- Email com espacos e casing inconsistente e normalizado antes da classificacao.
- `status != SCHEDULED` nao entra na fila.
- `scheduledAt <= now` nao entra na fila.
- Appointments muito distantes ainda aparecem como `scheduled_later`, o que e adequado para a etapa atual, mas nao equivale a uma estrategia completa de cadencia.

## Pendencias
- Consumir essa classificacao em uma superficie visual operacional da Sprint 4.
- Decidir o formato minimo do primeiro bloco visual de confirmacao:
  - card de overview
  - fila curta
  - ou ambos
- Definir, em etapa futura, quando um appointment deixa de aparecer apenas como necessidade e passa a ter estado de execucao real.

## Riscos conhecidos
- A janela de 48h e uma decisao MVP e nao uma politica definitiva por tipo de procedimento.
- Como a etapa ainda e email-first, clientes com telefone mas sem email aparecem corretamente como bloqueio, nao como fallback.
- Ainda nao existe trilha operacional de envio, tentativa, resposta ou confirmacao final; esta etapa so prepara a base de classificacao.

## Proximos passos
- Conectar `getConfirmationClassification(workspaceId)` a uma UI operacional enxuta.
- Exibir claramente:
  - pronto para confirmacao
  - bloqueado por falta de email
  - agendado para depois
- Manter a proxima etapa focada em visualizacao e clareza operacional, sem abrir automacao enterprise nem workflow builder.
