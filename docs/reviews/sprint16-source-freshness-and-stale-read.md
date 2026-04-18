# REVORY Seller — Source Freshness and Stale Data Read

## Fonte de verdade usada

A fonte de verdade usada foi a mais estreita e honesta que o produto já tinha:

- `dataSource.lastImportedAt` de `appointments`
- `dataSource.lastImportedAt` de `clients`

Esses dados já chegam por [services/imports/get-csv-upload-sources.ts](C:/Users/hriqu/Documents/revory-mvp/services/imports/get-csv-upload-sources.ts) e já são a melhor base para responder:

- o read atual está recente?
- o read pode estar atrasado?
- qual fonte relevante ficou para trás?

Importante:

- `handoffOpenedAt` continua sendo sinal de atividade, não de freshness da base
- portanto ele não foi usado como truth principal de freshness

## Lógica de freshness/staleness

A lógica implementada foi curta e executiva.

### thresholds

- `fresh`:
  - até `48h`
- `holding / watch`:
  - acima de `48h` e abaixo de `7d`
- `stale`:
  - `7d+`

### regras aplicadas

#### quando booked proof ainda não está visível

- se `appointments` ainda não está live:
  - estado: `Read pending`
  - leitura: ainda não dá para confiar no read do dia

#### quando booked proof está visível

- se `appointments.lastImportedAt` >= `7d`
  - estado: `Read may be stale`
  - leitura: revenue/booking read pode estar atrás
  - sugestão curta: refresh booked proof if it feels behind

- se `appointments.lastImportedAt` entre `48h` e `7d`
  - estado: `Read holding`
  - leitura: ainda utilizável, mas já não está fresh-fresh

- se `appointments.lastImportedAt` <= `48h`
  - estado: `Read fresh`
  - leitura: current read está atual o suficiente para uso

#### quando lead support está visível

- se `clients.lastImportedAt` >= `7d`
  - estado: `Support stale`
  - leitura: o booking read pode estar atrás no suporte de lead
  - sugestão curta: refresh lead support if it feels behind

Essa regra foi mantida propositalmente estreita:

- appointments continua sendo a base principal da confiança
- clients entra como stale support warning quando realmente faz sentido

## UI implementada

A surface foi implementada dentro do `Daily Booking Brief`, não em painel novo.

Entrou em:

- [components/briefs/DailyBookingBrief.tsx](C:/Users/hriqu/Documents/revory-mvp/components/briefs/DailyBookingBrief.tsx)

E a lógica server-side ficou em:

- [services/briefs/get-daily-booking-brief-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/briefs/get-daily-booking-brief-read.ts)

### decisão de hierarchy

A camada entrou como um card curto no rail lateral do brief:

- `Today’s next move`
- `Since last check`
- `Read freshness`

Isso mantém a feature:

- visível no primeiro minuto
- útil para confiança
- sem virar observabilidade
- sem competir demais com os sinais principais

## Copy aplicada

Labels principais:

- `Read freshness`
- `Read pending`
- `Read fresh`
- `Read holding`
- `Read may be stale`
- `Support stale`

Microcopy foi apertada para:

- falar do read atual
- não soar técnica demais
- não parecer monitoramento
- sugerir refresh só quando isso faz sentido

Exemplo da linha editorial:

- “Booked proof was refreshed 9d ago. Refresh it if today’s revenue or booking read feels behind.”

Ou seja:

- curta
- executiva
- honesta
- sem alarmismo técnico

## Riscos ou limitações

- a lógica depende de `import-first`, então freshness ainda é frescor de base importada, não de ingestão contínua
- `48h / 7d` é uma heurística simples; boa para MVP, mas não altamente personalizada por operação
- `clients` entra só como warning de support stale quando visível; isso foi escolha deliberada para evitar peso demais
- se futuras etapas tentarem mostrar freshness por muitas fontes ou com detalhe demais, a feature pode escorregar para mini-monitoramento

## Veredito executivo

A camada ficou no lugar certo e no tamanho certo.

Ela melhora duas coisas que o REVORY precisava:

- confiança no estado atual do read
- sensação de produto menos indireto

Sem criar:

- painel técnico
- monitoramento complexo
- observabilidade pesada
- home inflada

Leitura final:

o `Daily Booking Brief` agora não só aponta o que fazer, mas também ajuda o usuário a confiar ou desconfiar do estado atual da base com honestidade. Isso aumenta utilidade e hábito sem quebrar o posicionamento narrow premium do produto.
