# REVORY - Sprint 4 Etapa 7 Review

## Objetivo da etapa
Implementar a base de `eligibility` para review request no MVP, de forma simples, separada das outras logicas operacionais e sem abrir um sistema inchado de reputation ops.

## Arquivos criados/alterados
- Criado: `types/review-request.ts`
- Criado: `services/review-request/build-review-request-eligibility-classification.ts`
- Criado: `services/review-request/get-review-request-eligibility-classification.ts`
- Criado: `docs/testing/sprint-4-etapa-7-review-request-eligibility-smoke.ts`
- Criado: `docs/reviews/sprint-4-etapa-7-review-request-eligibility-base.md`
- Criado: `docs/reviews/generate_sprint_4_etapa_7_review_request_eligibility_base_pdf.py`

## Decisoes tomadas
- A etapa ficou limitada a eligibility base, nao a envio real.
- A logica foi mantida separada de:
  - confirmation
  - reminder
  - recovery
- O criterio usa apenas sinais que o produto ja sustenta:
  - `Appointment.status`
  - `Appointment.completedAt`
  - fallback para `Appointment.scheduledAt` quando `completedAt` vier ausente em import legado
  - `Client.email`
  - `ActivationSetup.googleReviewsUrl`
- Nao houve abertura de:
  - campanhas multiplas
  - cadencia multietapa
  - reputation ops completo
  - automacao de disparo nesta etapa

## Criterios simples de elegibilidade
- O appointment so entra na base de review request quando:
  - esta em estado `COMPLETED`
  - caiu dentro de uma janela inicial de `7 dias`
- A classificacao final fica assim:
  - `eligible_for_review_request`
    - appointment concluido recentemente
    - cliente com email utilizavel
    - workspace com `googleReviewsUrl` configurado
  - `blocked_missing_email`
    - appointment concluido recentemente
    - sem email utilizavel
  - `blocked_missing_reviews_url`
    - appointment concluido recentemente
    - sem destino de Google Reviews configurado

## Shape pronto para UI e evolucao futura
- O payload `RevoryReviewRequestEligibilityClassification` entrega:
  - `generatedAt`
  - `channel`
  - `windowDays`
  - `windowStartsAt`
  - `windowEndsAt`
  - `totalCompletedAppointmentsInWindow`
  - `eligibleCount`
  - `blockedMissingEmailCount`
  - `blockedMissingReviewsUrlCount`
  - `items`
- Cada item entrega:
  - `appointmentId`
  - `clientId`
  - `clientName`
  - `clientEmail`
  - `completedAt`
  - `serviceName`
  - `providerName`
  - `estimatedRevenue`
  - `googleReviewsUrl`
  - `reviewEligibilityState`
  - `reasons`

## Explicabilidade e honestidade
- Nao existe envio nesta etapa.
- Nao existe automacao de review request nesta etapa.
- Nao existe operacao completa de reputacao nesta etapa.
- O insight e simples:
  - houve visita concluida
  - existe caminho email-first?
  - existe destino de Google Reviews?
  - se sim, o appointment esta elegivel para a proxima camada operacional

## Evidencias do que funciona
- `npm run typecheck`
- `npm run build`
- `npx eslint 'types/review-request.ts' 'services/review-request/build-review-request-eligibility-classification.ts' 'services/review-request/get-review-request-eligibility-classification.ts' 'docs/testing/sprint-4-etapa-7-review-request-eligibility-smoke.ts' --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-7-review-request-eligibility-smoke.ts`

Resultado observado no smoke:
- Com destino configurado:
  - `eligibleCount = 1`
  - `blockedMissingEmailCount = 1`
  - `blockedMissingReviewsUrlCount = 0`
- Sem destino configurado:
  - `eligibleCount = 0`
  - `blockedMissingEmailCount = 1`
  - `blockedMissingReviewsUrlCount = 2`
- Appointment antigo fora da janela de `7 dias` ficou fora da lista

## Impacto visual e UX desta etapa
- Nenhuma nova tela foi aberta nesta etapa.
- Isso foi intencional para manter a experiencia premium:
  - primeiro a elegibilidade
  - depois a superficie visual
- O shape ja nasce pronto para:
  - card de elegibilidade de review
  - lista curta de clientes/appointments prontos
  - destaque de bloqueios explicitos
- Isso evita prometer que a REVORY ja opera uma maquina completa de reputacao.

## Limitacoes conhecidas
- A etapa nao verifica satisfacao do cliente.
- A etapa nao decide melhor horario de envio.
- A etapa nao mede propensao real de review.
- A etapa nao evita duplicidade por historico operacional completo, porque esse fluxo ainda nao esta ativo.

## Riscos conhecidos
- O fallback de `scheduledAt` para appointments `COMPLETED` sem `completedAt` e uma aproximacao MVP para imports legados.
- Se o `googleReviewsUrl` nao estiver configurado, toda a base recente pode aparecer bloqueada por destino ausente.
- A camada futura ainda precisara decidir como review eligibility convive visualmente com confirmation, reminder, at-risk e recovery.

## Proximos passos
- Consumir `getReviewRequestEligibilityClassification(workspaceId)` em uma UI enxuta.
- Exibir claramente:
  - elegivel para review request
  - bloqueado por falta de email
  - bloqueado por falta de reviews destination
- Manter a proxima etapa focada em visualizacao e primeiro fluxo operacional real, sem abrir reputation ops complexo.
