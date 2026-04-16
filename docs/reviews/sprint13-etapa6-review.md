# Sprint 13 — Etapa 6 Review

## objetivo da etapa

Implementar o menor tracking possível do estado do lead dentro do trilho curto, sem transformar o REVORY Seller em pipeline operacional amplo.

O ponto central desta etapa foi:

- se o Seller já tocou o lead
- isso precisa ficar registrável
- e essa participação precisa ficar legível no futuro

sem abrir:

- CRM
- estágios demais
- timeline longa
- tracking operacional pesado

## estados implementados

Os estados mínimos de lead implementados foram:

- `NEW`
- `HANDOFF_OPENED`
- `BOOKED`
- `CLOSED`

Esses estados são separados da `LeadBookingOpportunity.status`.

Isso é importante porque:

- `LeadBookingOpportunity.status` continua dizendo se a oportunidade está `READY`, `BLOCKED`, `BOOKED`, etc.
- o `lead state` agora diz o mínimo necessário sobre a participação do Seller naquele lead

## como eles funcionam

O tracking foi implementado de forma derivada e leve.

Não foi criado um novo stage operacional no banco.
O estado do lead é derivado de:

- `LeadBookingOpportunity.status`
- `handoffPreparedAt`

Leitura final:

- `NEW`
  - a oportunidade existe
  - o Seller ainda não abriu o handoff

- `HANDOFF_OPENED`
  - o Seller já abriu o handoff real
  - isso significa participação mínima registrada

- `BOOKED`
  - já existe booking futuro visível
  - o lead saiu da camada ativa e o estado final fica explícito

- `CLOSED`
  - a oportunidade foi encerrada sem seguir ativa

Essa escolha mantém o modelo leve porque:

- não adiciona uma nova máquina de estados paralela
- não adiciona múltiplos timestamps novos
- não abre tracking de thread, envio ou resposta

## mudanças realizadas

- criado helper de `lead state` derivado em [lead-state.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/lead-state.ts)
- a leitura de `Lead intake routing` passou a devolver:
  - `leadState`
  - `leadStateLabel`
  - `summary.touched`
- a lista de oportunidades passou a mostrar o estado mínimo do lead
- a surface passou a mostrar quantos leads já foram tocados
- a sincronização de oportunidades foi corrigida para não apagar `handoffPreparedAt` durante reavaliações

Essa última correção foi importante porque, sem ela, o produto perderia justamente o registro mínimo de participação que a etapa precisava preservar.

## arquivos alterados

- [services/lead-booking/lead-state.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/lead-state.ts)
- [services/lead-booking/get-lead-intake-routing-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/get-lead-intake-routing-read.ts)
- [services/lead-booking/sync-lead-booking-opportunities.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/sync-lead-booking-opportunities.ts)
- [components/lead-booking/LeadBookingOpportunityList.tsx](C:/Users/hriqu/Documents/revory-mvp/components/lead-booking/LeadBookingOpportunityList.tsx)
- [src/app/(app)/app/imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)

## impacto em product honesty

O impacto em honesty é bom porque agora o produto consegue separar duas coisas que antes ficavam coladas demais:

- oportunidade operacional
- participação mínima do Seller no lead

Isso deixa a leitura mais honesta porque:

- `READY` não significa mais automaticamente “Seller já tocou”
- `HANDOFF_OPENED` deixa explícito quando o handoff realmente foi aberto
- o produto não precisa fingir inbox, envio ou conversa para provar participação

## impacto em future value proof

O impacto em future value proof também é bom porque agora existe uma trilha mínima para responder depois:

- quantos leads só entraram
- quantos já tiveram handoff aberto
- quantos já apareceram como booked

Isso ainda é curto, mas já sustenta leitura futura melhor do que antes.

Em especial, a etapa prepara o produto para provar com mais honestidade:

- Seller só leu a oportunidade
- Seller abriu o handoff
- Seller já viu booking acontecer depois disso

Sem precisar inventar tracking de relacionamento amplo.

## riscos remanescentes

- o tracking continua mínimo; ele não mostra resposta nem conversa
- `HANDOFF_OPENED` ainda não prova envio concluído, apenas abertura do handoff
- ainda não existe confirmação de resposta do lead
- ainda não existe valor probatório completo de “contato gerou booking”
- isso continua dependendo de futuras etapas e de leitura cuidadosa do que o produto realmente sustenta

Também continua importante não vender isso como:

- CRM
- outreach engine
- follow-up tracking
- timeline comercial

## julgamento final

`Aprovada`.

A etapa entregou o que precisava:

- estados mínimos do lead
- coerência com `LeadBookingOpportunity`
- registro mínimo de participação
- base mais honesta para leitura futura

E entregou isso do jeito certo:

- leve
- narrow
- sem inflar schema
- sem abrir pipeline novo
