# REVORY - Sprint 4 Etapa 5 Review

## Objetivo da etapa
Implementar sinais iniciais de `at-risk appointments` no MVP de forma simples, util e explicavel, sem abrir modelo estatistico, score magico ou risk engine enterprise.

## Arquivos criados/alterados
- Criado: `types/at-risk.ts`
- Criado: `services/at-risk/build-at-risk-classification.ts`
- Criado: `services/at-risk/get-at-risk-classification.ts`
- Criado: `docs/testing/sprint-4-etapa-5-at-risk-logic-smoke.ts`
- Criado: `docs/reviews/sprint-4-etapa-5-at-risk-logic-base.md`
- Criado: `docs/reviews/generate_sprint_4_etapa_5_at_risk_logic_base_pdf.py`

## Decisoes tomadas
- A etapa foi mantida deliberadamente estreita:
  - sem score numerico
  - sem IA fake
  - sem predicao estatistica
  - sem motor de risco com dezenas de fatores
- Os sinais foram construidos apenas com dados ja existentes e honestos no produto:
  - `Appointment.status`
  - `Appointment.scheduledAt`
  - `Client.email`
- O resultado final nasce pronto para cards e listas na UI, mas sem abrir nova superficie visual nesta etapa.

## Criterios iniciais de risco
- A classificacao considera apenas appointments:
  - `SCHEDULED`
  - no futuro
- O appointment entra em `at-risk` apenas quando ha pelo menos um motivo explicavel:
  - `reminder_blocked_missing_email`
    - appointment dentro da janela de reminder
    - cliente sem email utilizavel
  - `confirmation_blocked_missing_email`
    - appointment dentro da janela de confirmation
    - cliente sem email utilizavel
  - `same_day_tight_window`
    - appointment muito proximo do horario
    - pouca margem operacional restante
- Se nao houver nenhum desses sinais, o appointment nao entra na lista de risco desta etapa.

## Classificacao entregue para UI
- `attention_now`
  - sinais que pedem atencao operacional imediata
  - ex.: `same_day_tight_window`
  - ex.: `reminder_blocked_missing_email`
- `watchlist`
  - sinais que merecem observacao, mas ainda nao sao a faixa mais urgente
  - ex.: `confirmation_blocked_missing_email`

## Shape pronto para cards/listas
- O payload `RevoryAtRiskClassification` entrega:
  - `generatedAt`
  - `totalFutureScheduledAppointments`
  - `atRiskCount`
  - `attentionNowCount`
  - `watchlistCount`
  - `blockedContactCount`
  - `tightWindowCount`
  - `policy`
  - `items`
- Cada item entrega:
  - `appointmentId`
  - `clientId`
  - `clientName`
  - `clientEmail`
  - `scheduledAt`
  - `hoursUntilAppointment`
  - `serviceName`
  - `providerName`
  - `estimatedRevenue`
  - `attentionLevel`
  - `primaryReasonCode`
  - `reasons`

## Explicabilidade da logica
- Nao existe score escondido.
- Nao existe ponderacao opaca.
- Nao existe claims de IA ou modelo preditivo.
- `same_day_tight_window` deve ser lido como alerta de urgencia operacional, nao como previsao de no-show.
- Cada appointment entra na lista porque ha um motivo operacional legivel e exibivel para o usuario.
- Isso mantem o produto premium e honesto:
  - simples de entender
  - simples de defender
  - simples de mostrar em UI

## Evidencias do que funciona
- `npm run typecheck`
- `npm run build`
- `npx eslint 'types/at-risk.ts' 'services/at-risk/build-at-risk-classification.ts' 'services/at-risk/get-at-risk-classification.ts' 'docs/testing/sprint-4-etapa-5-at-risk-logic-smoke.ts' --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-5-at-risk-logic-smoke.ts`

Resultado observado no smoke:
- `totalFutureScheduledAppointments = 4`
- `atRiskCount = 3`
- `attentionNowCount = 2`
- `watchlistCount = 1`
- `blockedContactCount = 2`
- `tightWindowCount = 1`
- `appointment-tight-window -> attention_now / same_day_tight_window`
- `appointment-reminder-blocked -> attention_now / reminder_blocked_missing_email`
- `appointment-confirmation-watch -> watchlist / confirmation_blocked_missing_email`
- appointment futuro sem sinal de risco ficou fora da lista
- appointment `COMPLETED` ficou fora da lista

## Impacto visual e UX desta etapa
- Nenhuma nova tela foi aberta nesta etapa.
- Isso foi intencional para evitar `automation theater`.
- A base foi preparada para uma UI que mostre:
  - por que o appointment entrou em risco
  - se exige atencao agora ou observacao
  - qual e o contexto operacional do risco
- Essa abordagem protege a identidade visual da REVORY porque a proxima UI podera nascer:
  - limpa
  - premium
  - sem parecer risk engine enterprise

## Limitacoes conhecidas
- Esta etapa nao mede chance real de no-show.
- Esta etapa nao usa historico comportamental.
- Esta etapa nao usa cadencia de envios, porque isso ainda nao existe no produto.
- Esta etapa nao tenta priorizar por valor clinico ou categoria de procedimento.

## Riscos conhecidos
- `same_day_tight_window` e um sinal operacional, nao uma predicao.
- `blocked_missing_email` reflete falta de caminho email-first, nao impossibilidade absoluta de contato fora do escopo atual.
- A leitura final entre confirmation, reminder e at-risk ainda dependera da camada agregada/UI da Sprint 4.

## Proximos passos
- Consumir `getAtRiskClassification(workspaceId)` em cards ou listas do produto.
- Exibir o motivo do risco de forma explicita, sem score magico.
- Compor a leitura conjunta entre:
  - confirmation
  - reminder
  - at-risk
- Manter a proxima etapa visual e operacional, sem abrir engine preditiva ou automacao enterprise.
