# Sprint 10 — Etapa 6 Review

## Objetivo da etapa
Endurecer a camada mínima de tracking/atribuição do REVORY Seller sem abrir analytics suite, CRM pipeline ou um data model exagerado, reforçando a ligação entre `lead base`, `booked proof` e `revenue view`.

## Diagnóstico da camada anterior
A camada anterior já era honesta e suficiente para snapshot, mas ainda tinha uma limitação estrutural importante:

- o produto mostrava proof e revenue com clareza, mas a sustentação de atribuição ainda era curta demais
- o elo entre `lead base` e `booked proof` ainda era fraco para retenção
- o modelo atual sobrescrevia a origem operacional do cliente a cada import, o que enfraquecia a capacidade de defender suporte de lead base no tempo

Em outras palavras: a leitura econômica existia, mas a cadeia de suporte por trás dela ainda estava mais implícita do que o ideal.

## Mudanças realizadas
- Foi adicionada a flag persistente `hasLeadBaseSupport` no model `Client`.
- Essa flag é marcada como `true` quando o cliente passa por import de `CLIENTS_CSV`.
- O import de appointments não remove essa marca, preservando a memória de suporte de lead base sem criar um histórico complexo.
- O dashboard overview passou a calcular uma leitura curta de atribuição com:
  - `leadBaseClients`
  - `bookedAppointmentsWithIdentity`
  - `bookedAppointmentsWithLeadBaseSupport`
  - `revenueWithLeadBaseSupport`
  - `identityCoveragePercent`
  - `leadBaseCoveragePercent`
- O dashboard ganhou uma nova surface compacta de `Attribution clarity`.
- Essa surface mostra:
  - quantos clientes já carregam lead context
  - quanto do booked proof já está apoiado por lead-base support
  - quanto da revenue visible já está apoiada por esse suporte
- A leitura continua curta, econômica e comercial, sem virar analytics pesada.

## Modelo lógico adotado
Em vez de inventar um pipeline novo ou uma engine de atribuição, o modelo adotado foi:

- `lead base support` é uma propriedade persistente do cliente
- `booked proof` continua vindo de appointments visíveis
- `revenue` continua vindo apenas de booked appointments visíveis
- a nova camada apenas mede quanto desse proof e dessa revenue já estão sustentados por clientes que carregam contexto de lead base

Esse desenho foi o menor salto útil porque:

- não cria CRM
- não cria múltiplas fontes de verdade
- não exige tracking temporal pesado
- melhora honestidade e retenção sem inflar o app

## Arquivos alterados
- [C:\Users\hriqu\Documents\revory-mvp\prisma\schema.prisma](C:\Users\hriqu\Documents\revory-mvp\prisma\schema.prisma)
- [C:\Users\hriqu\Documents\revory-mvp\prisma\migrations\20260408000100_sprint_10_tracking_attribution_hardening\migration.sql](C:\Users\hriqu\Documents\revory-mvp\prisma\migrations\20260408000100_sprint_10_tracking_attribution_hardening\migration.sql)
- [C:\Users\hriqu\Documents\revory-mvp\services\imports\persist-import-client.ts](C:\Users\hriqu\Documents\revory-mvp\services\imports\persist-import-client.ts)
- [C:\Users\hriqu\Documents\revory-mvp\services\imports\persist-clients-import.ts](C:\Users\hriqu\Documents\revory-mvp\services\imports\persist-clients-import.ts)
- [C:\Users\hriqu\Documents\revory-mvp\services\imports\persist-appointments-import.ts](C:\Users\hriqu\Documents\revory-mvp\services\imports\persist-appointments-import.ts)
- [C:\Users\hriqu\Documents\revory-mvp\services\dashboard\get-dashboard-overview.ts](C:\Users\hriqu\Documents\revory-mvp\services\dashboard\get-dashboard-overview.ts)
- [C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\dashboard\page.tsx](C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\dashboard\page.tsx)

## Impacto em tracking
- O produto agora lê melhor a espinha curta do tracking real:
  - lead context
  - booked proof
  - revenue
- A camada fica mais confiável porque deixa de depender apenas do estado atual do import e passa a reter se um cliente já recebeu support de lead base.

## Impacto em atribuição
- A atribuição fica mais legível porque o dashboard agora mostra quanto da leitura de booked proof e revenue já tem suporte de lead base por trás.
- A cadeia comercial fica mais defensável sem prometer multi-touch attribution ou analytics avançada.

## Impacto em risco de churn
- O risco de churn por “valor bonito, mas pouco defensável” cai porque o dashboard passa a explicar melhor a sustentação da leitura econômica.
- A nova surface ajuda o founder a mostrar que o produto não está só exibindo revenue, mas revenue com mais contexto e coerência.

## Impacto em pricing defense
- `Basic` e `Growth` ficam um pouco mais defendáveis porque a leitura econômica fica mais sustentada.
- A camada superior ainda continua exigindo mais robustez do que o produto tem hoje, mas a base de defesa melhorou.

## Riscos remanescentes
- A nova flag `hasLeadBaseSupport` melhora muito a clareza daqui para frente, mas não reconstitui perfeitamente histórico antigo.
- A migração adiciona o campo com default `false`, então workspaces já existentes só ganham a nova leitura conforme passam por imports novos ou atualizações futuras.
- A atribuição continua minimalista por design; isso é correto para o MVP, mas significa que ainda não existe explicação profunda de canal, cohort ou multi-offer.

## Julgamento final da etapa
Etapa aprovada.

A camada de tracking/atribuição ficou mais útil, mais comercial e mais defensável sem sair do escopo narrow do REVORY Seller. O ganho principal veio de preservar melhor a memória de `lead base support` e de transformar isso numa leitura econômica curta dentro do dashboard.
