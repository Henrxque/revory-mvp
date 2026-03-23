# REVORY - Sprint 4 Etapa 6 Review

## Objetivo da etapa
Implementar os primeiros criterios de `recovery opportunity` no MVP como insight acionavel simples, honesto e explicavel, sem abrir sistema completo de rebooking nem gestao de agenda.

## Arquivos criados/alterados
- Criado: `types/recovery.ts`
- Criado: `services/recovery/build-recovery-opportunity-classification.ts`
- Criado: `services/recovery/get-recovery-opportunity-classification.ts`
- Criado: `docs/testing/sprint-4-etapa-6-recovery-opportunity-smoke.ts`
- Criado: `docs/reviews/sprint-4-etapa-6-recovery-opportunity-base.md`
- Criado: `docs/reviews/generate_sprint_4_etapa_6_recovery_opportunity_base_pdf.py`

## Decisoes tomadas
- Recovery foi mantido como insight operacional, nao como motor de rebooking.
- A etapa nao persiste `RecoveryOpportunity` no banco ainda. Nesta fase, a base funciona como classificacao pronta para UI.
- O criterio foi construido apenas com sinais ja sustentados pelo produto:
  - `Appointment.status`
  - `Appointment.scheduledAt`
  - `Client.email`
  - existencia ou ausencia de agendamento posterior para o mesmo cliente
- O fluxo nao abre:
  - agenda inteligente
  - roteamento operacional complexo
  - call center flow
  - automacao de reacendimento multietapa

## Criterios iniciais de recovery
- Um appointment so entra como `recovery opportunity` quando:
  - esta em estado `CANCELED` ou `NO_SHOW`
  - caiu dentro de uma janela operacional curta de `14 dias`
  - nao existe appointment `SCHEDULED` posterior para o mesmo cliente no workspace
- Se houver novo agendamento posterior, o appointment interrompido fica fora da lista, porque a oportunidade ja nao esta mais aberta no MVP.

## Classificacao entregue para UI
- `ready_for_recovery`
  - ha oportunidade aberta
  - cliente tem email utilizavel
- `blocked_missing_email`
  - ha oportunidade aberta
  - mas o caminho email-first esta bloqueado

## Razoes explicitas
- `canceled_without_rebooking`
  - o appointment foi cancelado
  - nao ha novo agendamento posterior
- `no_show_without_rebooking`
  - o cliente faltou
  - nao ha novo agendamento posterior
- `blocked_missing_email`
  - a oportunidade existe
  - mas a REVORY nao tem email utilizavel para este cliente no MVP atual

## Shape pronto para insight acionavel
- O payload `RevoryRecoveryOpportunityClassification` entrega:
  - `generatedAt`
  - `channel`
  - `windowDays`
  - `windowStartsAt`
  - `windowEndsAt`
  - `totalDisruptedAppointmentsInWindow`
  - `opportunityCount`
  - `readyForRecoveryCount`
  - `blockedMissingEmailCount`
  - `canceledOpportunityCount`
  - `noShowOpportunityCount`
  - `items`
- Cada item entrega:
  - `appointmentId`
  - `clientId`
  - `clientName`
  - `clientEmail`
  - `disruptionDate`
  - `serviceName`
  - `providerName`
  - `estimatedRevenue`
  - `status`
  - `recoveryState`
  - `reasons`

## Explicabilidade e honestidade
- Nao existe sugestao de slot inteligente.
- Nao existe promesa de rebooking automatico.
- Nao existe motor de agenda ou priorizacao complexa.
- O insight e simples:
  - houve interrupcao
  - ainda nao ha novo agendamento
  - entao existe oportunidade inicial de recovery
- Essa leitura continua dependente da completude da base importada no workspace:
  - se o rebook aconteceu fora da base atual, a oportunidade pode parecer aberta mesmo sem estar mais aberta na operacao real

## Evidencias do que funciona
- `npm run typecheck`
- `npm run build`
- `npx eslint 'types/recovery.ts' 'services/recovery/build-recovery-opportunity-classification.ts' 'services/recovery/get-recovery-opportunity-classification.ts' 'docs/testing/sprint-4-etapa-6-recovery-opportunity-smoke.ts' --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-6-recovery-opportunity-smoke.ts`

Resultado observado no smoke:
- `totalDisruptedAppointmentsInWindow = 3`
- `opportunityCount = 2`
- `readyForRecoveryCount = 1`
- `blockedMissingEmailCount = 1`
- `canceledOpportunityCount = 1`
- `noShowOpportunityCount = 1`
- `appointment-canceled-open -> ready_for_recovery / canceled_without_rebooking`
- `appointment-no-show-blocked -> blocked_missing_email / no_show_without_rebooking`
- `appointment-canceled-rebooked` ficou fora da lista porque ja havia appointment `SCHEDULED` posterior

## Impacto visual e UX desta etapa
- Nenhuma nova tela foi aberta nesta etapa.
- Isso foi intencional para proteger a experiencia premium:
  - primeiro a logica
  - depois a apresentacao
- O shape ja nasce pronto para:
  - card de insight
  - lista curta de oportunidades abertas
  - destaque de bloqueio por falta de email
- A interface futura pode ser clara e elegante sem parecer CRM operacional pesado.

## Limitacoes conhecidas
- A etapa nao tenta sugerir melhor horario de rebook.
- A etapa nao tenta casar cliente com slot vago especifico.
- A etapa nao tenta medir chance real de conversao.
- A etapa nao persiste oportunidade como entidade operacional ativa nesta fase.

## Riscos conhecidos
- A janela de `14 dias` e uma politica inicial de MVP, nao regra definitiva.
- A exclusao por agendamento posterior depende apenas da base atual do workspace; se o dado estiver incompleto, a oportunidade pode parecer aberta quando o cliente rebookou fora da base importada.
- Como o MVP continua email-first, a ausencia de email vira bloqueio mesmo que exista telefone fora do caminho atual.

## Proximos passos
- Consumir `getRecoveryOpportunityClassification(workspaceId)` em uma UI operacional simples.
- Exibir com clareza:
  - oportunidade aberta
  - bloqueado por falta de email
  - cancelado vs no-show
- Manter a proxima etapa focada em visualizacao e priorizacao simples, sem abrir sistema de agenda completo.
