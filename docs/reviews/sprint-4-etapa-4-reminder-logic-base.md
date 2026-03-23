# REVORY - Sprint 4 Etapa 2 Review

## Objetivo da etapa
Implementar a base tecnica da reminder logic do MVP para identificar quais appointments entram em necessidade operacional de lembrete, mantendo a separacao clara em relacao a confirmation logic e sem abrir motor de cadencia, builder de campanha ou automacao multicanal.

## Arquivos criados/alterados
- Criado: `types/reminder.ts`
- Criado: `services/reminder/build-reminder-classification.ts`
- Criado: `services/reminder/get-reminder-classification.ts`
- Criado: `docs/testing/sprint-4-etapa-2-reminder-logic-smoke.ts`
- Criado: `docs/reviews/sprint-4-etapa-2-reminder-logic-base.md`
- Criado: `docs/reviews/generate_sprint_4_etapa_2_reminder_logic_base_pdf.py`

## Decisoes tomadas
- A reminder logic ficou separada da confirmation logic em:
  - tipos
  - constantes
  - service puro
  - wrapper com Prisma
- A regra foi mantida minima e previsivel:
  - email-first
  - sem historico de envios
  - sem engine de cadencia
  - sem prioridade por procedimento
  - sem fallback para outros canais
- A etapa usa apenas dados ja sustentados com honestidade pelo app:
  - `Appointment.status`
  - `Appointment.scheduledAt`
  - `Client.email`
- `usable email`, nesta etapa, significa apenas:
  - valor nao vazio
  - com espacos removidos nas bordas
  - normalizado para lowercase
- Nao foi aberta validacao mais profunda de deliverability ou verificacao externa nesta etapa.
- Nenhuma semantica de import, dashboard, KPI ou mapping foi alterada.

## Regra minima implementada
- A fila de reminder considera apenas appointments com:
  - `status = SCHEDULED`
  - `scheduledAt > now`
- A janela operacional inicial de reminder foi fixada em `24h`.
- Essa janela de `24h` deve ser lida explicitamente como politica inicial de MVP:
  - simples
  - previsivel
  - facil de explicar
  - sujeita a revisao futura quando a camada operacional ganhar mais profundidade
- Classificacao aplicada:
  - `ready_for_reminder`
    - appointment agendado no futuro
    - dentro da janela de 24h
    - cliente com email utilizavel
  - `blocked_missing_email`
    - appointment agendado no futuro
    - dentro da janela de 24h
    - cliente sem email utilizavel
  - `scheduled_later`
    - appointment agendado no futuro
    - fora da janela de 24h
- `scheduled_later` e um bucket auxiliar de visibilidade:
  - ele ajuda a UI a manter appointments futuros legiveis
  - mas nao deve ser tratado como fila operacional principal do reminder nesta etapa
- Appointments passados ou com status diferente de `SCHEDULED` ficam fora da classificacao.

## Separacao em relacao a confirmation logic
- A confirmation logic continua sendo a camada mais ampla de preparacao operacional.
- A reminder logic entra como camada mais proxima do horario do appointment.
- Nesta etapa, a separacao foi feita por:
  - service proprio
  - naming proprio
  - janela propria
  - reason codes proprios
- Esta etapa ainda nao tenta reconciliar historico ou prioridade final entre confirmation e reminder. Isso e intencional e honesto para o MVP atual.
- A convivencia entre confirmation e reminder ainda sera resolvida de forma mais visivel na camada agregada e na UI posterior, nao nesta etapa de base logica.

## Shape pronto para UI
- O payload final exposto por `RevoryReminderClassification` ja entrega:
  - `generatedAt`
  - `channel`
  - `windowHours`
  - `windowEndsAt`
  - `totalFutureScheduledAppointments`
  - `needsAttentionCount`
  - `readyForReminderCount`
  - `blockedMissingEmailCount`
  - `scheduledLaterCount`
  - `items`
- Cada item ja entrega dados suficientes para uma UI operacional premium e limpa:
  - `appointmentId`
  - `clientId`
  - `clientName`
  - `clientEmail`
  - `scheduledAt`
  - `hoursUntilAppointment`
  - `serviceName`
  - `providerName`
  - `estimatedRevenue`
  - `reminderState`
  - `reasonCode`
  - `requiresAttention`

## Heuristica usada
- A heuristica e deliberadamente simples:
  - tempo ate o appointment
  - status operacional do appointment
  - disponibilidade de email
- A reminder logic nao tenta:
  - decidir melhor horario de envio
  - inferir cadencia por tipo de tratamento
  - escolher entre multiplos canais
  - modelar varias etapas de lembrete
- Isso preserva previsibilidade, clareza e posicionamento premium sem parecer automation theater.

## Evidencias do que funciona
- `npm run typecheck`
- `npm run build`
- `npx eslint 'services/reminder/build-reminder-classification.ts' 'services/reminder/get-reminder-classification.ts' 'types/reminder.ts' 'docs/testing/sprint-4-etapa-2-reminder-logic-smoke.ts' --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-2-reminder-logic-smoke.ts`

Resultado observado no smoke:
- `totalFutureScheduledAppointments = 3`
- `readyForReminderCount = 1`
- `blockedMissingEmailCount = 1`
- `scheduledLaterCount = 1`
- `needsAttentionCount = 2`
- `appointment-ready -> ready_for_reminder`
- `appointment-missing-email -> blocked_missing_email`
- `appointment-later -> scheduled_later`
- `appointment-past` ficou fora da fila
- `appointment-completed` ficou fora da fila

## Impacto visual e UX desta etapa
- Nenhuma nova tela foi aberta nesta etapa.
- Isso foi intencional para manter a camada operacional limpa:
  - primeiro a regra
  - depois a superficie visual
- O shape ja nasce preparado para UI com:
  - estados simples
  - nomes legiveis
  - contagens claras
  - sinais honestos de bloqueio
- Isso ajuda a proxima UI a parecer premium sem fingir automacao completa.

## Edge cases conhecidos
- Email com espacos e casing inconsistente e normalizado antes da classificacao.
- `usable email` continua sendo uma definicao operacional minima de MVP, nao uma garantia de deliverability.
- `status != SCHEDULED` nao entra na fila.
- `scheduledAt <= now` nao entra na fila.
- Appointments fora da janela de 24h ficam como `scheduled_later`, sem cadencia adicional nesta etapa.

## Pendencias
- Consumir `getReminderClassification(workspaceId)` em uma UI operacional da Sprint 4.
- Definir como confirmation e reminder aparecerao juntos ou separados na superficie visual.
- Decidir em etapa futura quando a classificacao deixa de ser apenas necessidade operacional e passa a refletir execucao real.

## Riscos conhecidos
- A janela de 24h e uma decisao MVP e nao uma politica final por procedimento.
- Como a etapa continua email-first, clientes sem email ficam corretamente bloqueados mesmo se houver telefone.
- Ainda nao existe historico de reminder enviado, tentativa, resposta ou sucesso; esta etapa so prepara a base de classificacao.
- Confirmation e reminder continuam separados por logica, nao por historico de execucao; isso e adequado para agora, mas deve ser revisitado quando a camada de envio existir.
- Ate a camada agregada/UI posterior, a leitura conjunta entre confirmation e reminder ainda depende de composicao superior e nao desta regra isolada.

## Proximos passos
- Conectar `getReminderClassification(workspaceId)` a uma UI enxuta e operacional.
- Exibir claramente:
  - pronto para lembrete
  - bloqueado por falta de email
  - agendado para depois
- Manter a proxima etapa focada em visualizacao e clareza, sem abrir engine de automacao nem campanha multietapa.
