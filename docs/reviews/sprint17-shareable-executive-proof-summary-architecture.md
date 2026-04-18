# REVORY Seller — Shareable Executive Proof Summary Architecture

## Leitura do estado atual

Hoje o REVORY Seller já tem matéria-prima suficiente para uma `Executive Proof Summary`, mas ela ainda está espalhada entre a `Revenue view` e camadas executivas do dashboard.

O que o produto já sustenta de verdade:

- `Revenue now` via `estimatedImportedRevenue`
- `Booked proof` via `bookedAppointments` e `BookedProofRead`
- `Recent momentum` via `recentMomentum`
- `Executive read` via `overview.executiveRead`
- `Commercial safeguard` via `overview.commercialSafeguard`
- `Support integrity` via `overview.supportIntegrity`
- `Attribution support` mínima via `attributionRead`
- `Proof/source freshness` já existente na lógica de brief

Onde isso vive hoje:

- [src/app/(app)/app/dashboard/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/dashboard/page.tsx)
- [services/dashboard/get-dashboard-overview.ts](C:/Users/hriqu/Documents/revory-mvp/services/dashboard/get-dashboard-overview.ts)
- [services/proof/get-booked-proof-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/proof/get-booked-proof-read.ts)
- [services/briefs/get-daily-booking-brief-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/briefs/get-daily-booking-brief-read.ts)

Leitura honesta do gap:

o produto já prova valor em tela, mas ainda não transforma essa prova em um artefato curto, apresentável e compartilhável. Hoje a leitura é boa para uso interno do workspace, mas ainda não está embalada em um formato simples para:

- mostrar valor atual do workspace
- justificar o software comercialmente
- compartilhar um snapshot executivo sem mandar o buyer navegar no dashboard

Ao mesmo tempo, esse tipo de feature é perigoso porque pode escorregar rápido para:

- BI
- reporting suite
- atribuição artificial
- PDF bonito vendendo mais do que o produto realmente sabe

## Arquitetura proposta

### Proposta central

Implementar `Shareable Executive Proof Summary` como uma **surface de resumo executivo derivada das leituras já existentes do dashboard**, com foco em:

- mostrar valor atual
- mostrar prova que já existe
- mostrar limites de suporte quando existirem
- permitir compartilhamento curto e controlado

### Forma correta da feature

A forma mais correta e narrow é:

- um **compact share sheet / modal executivo** aberto a partir da `Revenue view`
- alimentado por uma leitura server-side dedicada
- com duas saídas de shareability no v1:
  - `Copy executive summary`
  - `Export proof snapshot` (imagem ou PDF simples)

### Forma errada

Não recomendo:

- página nova de reporting
- centro de relatórios
- histórico de snapshots
- share link público já no v1
- suite de export com múltiplos templates
- drill-down analítico

### Princípio arquitetural

A feature não deve criar uma nova camada analítica.

Ela deve apenas **recompor, em formato compartilhável, uma seleção estreita do que o produto já sustenta no dashboard**.

Ou seja:

- mesma fonte de verdade
- nova embalagem
- sem nova interpretação analítica ampla

## Sinais selecionados

Os sinais que devem entrar no v1 são estes:

### 1. Revenue now

Fonte:

- `overview.estimatedImportedRevenue`

Por que entra:

- é o principal sinal econômico atual
- já é o núcleo do dashboard
- é o dado mais fácil de justificar comercialmente

### 2. Booked proof visible

Fonte:

- `overview.bookedAppointments`
- opcionalmente `bookedProofSource.importedAt`

Por que entra:

- ajuda a deixar explícito que a leitura está apoiada em booked proof
- reduz leitura de “número solto”

Formato recomendado:

- `X booked appointments visible`

### 3. Recent momentum

Fonte:

- `overview.recentMomentum`

Por que entra:

- aumenta prova de continuidade sem abrir analytics profunda
- ajuda pricing defense sem virar cohort/reporting

Formato recomendado:

- `last 3 months booked momentum`
- sem detalhamento excessivo

### 4. Supported revenue / support status

Fonte:

- `overview.executiveRead.tiles`
- `overview.attributionRead`
- `overview.supportIntegrity`

Por que entra:

- ajuda a mostrar quando a prova está suportada
- também permite honestidade quando o suporte ainda está fino ou degradado

Formato recomendado:

- se houver suporte suficiente: mostrar `Supported revenue`
- se não houver: mostrar uma nota executiva curta tipo `support layer still thin`

### 5. Commercial safeguard

Fonte:

- `overview.commercialSafeguard`

Por que entra:

- é a melhor camada atual para framing honesto
- ajuda a evitar oversell do snapshot
- reforça que a summary é executiva, não analítica

Formato recomendado:

- uma linha curta de `core read status`
- uma linha curta de `support status`

### 6. Freshness note

Fonte:

- lógica derivada da mesma base de freshness já usada no brief

Por que entra:

- melhora confiança
- reduz risco de compartilhar snapshot velho como se fosse atual

Formato recomendado:

- uma linha discreta: `Read fresh`, `Read holding` ou `Read may be stale`

## Sinais excluídos

Os seguintes sinais devem ficar fora:

### Atribuição profunda

- revenue by source
- channel ranking
- campaign attribution
- source contribution breakdown
- ROI por origem

Motivo:

- o produto não sustenta isso com honestidade suficiente hoje

### Analytics de funil

- lead-to-booking conversion
- contact rate
- response rate
- funnel stages
- no-show / save rate sofisticada

Motivo:

- isso empurra para BI e CRM
- não é a proposta atual do Seller

### Forecasting

- projected revenue
- expected bookings
- next month prediction

Motivo:

- capability não sustentada

### Performance operacional ampla

- team leaderboard
- front desk productivity
- seller productivity
- SLA / speed-to-lead

Motivo:

- categoria errada
- maintenance burden alto

### Raw import diagnostics

- row counts detalhados
- error rows detalhados
- file-level diagnostics completos

Motivo:

- técnico demais para share summary

## Shareability proposta

### V1 recomendado

Dois formatos apenas:

### 1. Copy executive summary

Saída:

- texto curto estruturado
- pronto para colar em email, WhatsApp ou doc

Exemplo de estrutura:

- workspace name
- revenue now
- booked proof visible
- recent momentum
- support status
- freshness note

Vantagens:

- barato
- simples
- fácil para founder solo
- zero risco de virar reporting engine

### 2. Export proof snapshot

Saída:

- uma peça visual única
- estilo executive card / short one-page proof snapshot

Formato recomendado:

- imagem ou PDF simples
- não editável no produto
- não multipágina

Vantagens:

- aumenta valor percebido
- ajuda venda
- continua narrow se ficar em um só template

### O que não recomendo no v1

- share link público
- página pública hospedada
- histórico de snapshots
- múltiplos layouts de export
- “send to” flow interno

Se um dia houver share link, ele deve vir depois, com regras fortes de expiração e escopo. Não é a melhor primeira implementação.

## Arquivos impactados

### Criar

- [services/proof/get-executive-proof-summary-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/proof/get-executive-proof-summary-read.ts)
  - leitura server-side dedicada para o share summary
- [components/proof/ExecutiveProofSummarySheet.tsx](C:/Users/hriqu/Documents/revory-mvp/components/proof/ExecutiveProofSummarySheet.tsx)
  - surface curta do resumo
- [components/proof/ExecutiveProofSummaryCard.tsx](C:/Users/hriqu/Documents/revory-mvp/components/proof/ExecutiveProofSummaryCard.tsx)
  - bloco visual reutilizável para tela/export
- [services/proof/build-executive-proof-summary-copy.ts](C:/Users/hriqu/Documents/revory-mvp/services/proof/build-executive-proof-summary-copy.ts)
  - versão textual curta para `copy`

### Alterar

- [src/app/(app)/app/dashboard/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/dashboard/page.tsx)
  - adicionar trigger curto tipo `Share proof`
- [services/dashboard/get-dashboard-overview.ts](C:/Users/hriqu/Documents/revory-mvp/services/dashboard/get-dashboard-overview.ts)
  - idealmente só reaproveitar, sem inflar
- [services/briefs/get-daily-booking-brief-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/briefs/get-daily-booking-brief-read.ts)
  - opcional, apenas se a lógica de freshness for extraída para reutilização limpa

### Não recomendo criar agora

- rotas públicas
- tabela de snapshots
- tokens de share
- histórico de export

## Riscos

### Riscos técnicos

- duplicar lógica do dashboard em vez de compor a partir do que já existe
- misturar demais leitura visual com lógica de export
- criar export visual complexo demais para solo founder manter
- tentar gerar PDF “bonito demais” e abrir buraco técnico desnecessário

### Riscos de escopo

- virar mini-reporting
- começar a pedir mais métricas para “enriquecer” a summary
- abrir share link público cedo demais
- usar a summary para vender atribuição que o produto ainda não sustenta

### Riscos comerciais

- buyer interpretar a peça como BI
- buyer interpretar supported revenue como attribution robusta
- founder usar a summary como se fosse prova universal, quando ela ainda é um read estreito do estado atual

## O que NÃO entra

- BI
- reporting suite
- cohort report
- source report
- campaign report
- export multipágina
- dashboard paralelo
- share link público no v1
- snapshots históricos
- benchmark externo
- forecast
- atribuição de revenue inventada
- ranking de canais
- drilldown por source
- suíte de configuração de templates

## Veredito executivo

`Shareable Executive Proof Summary` faz sentido e é estrategicamente boa para a Sprint 17, **desde que** seja tratada como:

- uma embalagem compartilhável da prova já existente
- curta
- executiva
- visualmente premium
- honesta sobre o que está suportado e o que ainda está thin

O caminho certo é:

- derivar da `Revenue view`
- usar sinais já sustentados
- manter um template único
- permitir `copy + export snapshot`
- deixar freshness e support status explícitos

O caminho errado é:

- transformar isso em reporting product
- inventar atribuição mais forte do que o produto prova
- abrir shareability pública antes da hora

Minha recomendação objetiva:

- `sim`, vale arquitetar e implementar
- `sim`, isso pode aumentar valor percebido e confiança comercial
- `sim`, é compatível com solo-founder fit se ficar em um template curto
- `não`, não deve abrir BI, reporting suite ou link público já no primeiro passo

Se mantida estreita, essa feature pode aumentar bastante a prova visível de valor do REVORY Seller sem quebrar a natureza premium narrow do produto.
