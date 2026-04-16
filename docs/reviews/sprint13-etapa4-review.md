# Sprint 13 — Etapa 4 Review

## 1. Objetivo da etapa

Esta etapa precisava resolver uma coisa específica:

- decidir, com clareza operacional, se cada `LeadBookingOpportunity` já pode avançar
- ou se está travada
- e por qual motivo objetivo

Isso importa para a Sprint 13 porque a Etapa 3 já criou a base de intake e roteamento, mas ainda faltava transformar essa base em uma leitura realmente útil no dia a dia.

Sem essa camada, a oportunidade existiria no banco, mas ainda sem uma resposta clara para:

- pode avançar agora?
- o que está travando?
- o que falta para ficar pronta?

## 2. Lógica de readiness adotada

Os sinais mínimos escolhidos foram:

- existe `email` ou `phone`
- existe `main offer` no workspace
- existe `booking path` definido
- o lead consegue usar o `booking path` atual
- já existe `booking` futuro visível ou não

Esses sinais são suficientes porque cobrem exatamente o que o produto precisa para sustentar um handoff bounded:

- identidade mínima
- ancoragem na `main offer`
- caminho principal de booking
- elegibilidade real para usar esse caminho

O sistema decide `READY` quando:

- não há booking futuro visível
- existe `main offer`
- existe `booking path`
- existe identidade mínima de contato
- o lead é compatível com o `booking path` atual

Exemplo prático:

- se o workspace usa `EMAIL` como booking path, o lead precisa ter email
- se o workspace usa `SMS`, o lead precisa ter phone

## 3. Lógica de bloqueio adotada

Os blocked reasons escolhidos foram:

- `missing_contact`
- `missing_main_offer`
- `missing_booking_path`
- `ineligible_for_handoff`

Eles são suficientes porque cobrem os bloqueios mínimos e objetivos sem abrir semântica demais.

Como o sistema decide `BLOCKED`:

- `missing_main_offer`: o workspace ainda não tem `main offer` válida para roteamento
- `missing_booking_path`: o workspace ainda não tem `booking path`
- `missing_contact`: o lead não tem `email` nem `phone`
- `ineligible_for_handoff`: o lead até tem contato, mas não no canal que o `booking path` atual exige

Exemplo:

- booking path = `EMAIL`
- lead tem só phone
- resultado = `BLOCKED` com `ineligible_for_handoff`

Isso é mais honesto do que chamar esse lead de pronto só porque “algum contato existe”.

## 4. Relação com os estados do modelo

Os estados ficaram usados assim:

- `OPEN`
  - continua existindo como estado válido do modelo
  - mas, com a lógica atual, tende a aparecer pouco porque a oportunidade é classificada imediatamente

- `READY`
  - usada quando já existe condição mínima real de avançar para o próximo passo bounded

- `BLOCKED`
  - usada sempre que existe impedimento explícito e legível
  - falta de contato, `main offer` ou `booking path` cai aqui

- `BOOKED`
  - usada quando já existe booking futuro visível
  - a oportunidade sai da camada ativa

- `CLOSED`
  - continua possível no modelo
  - mas não recebeu regra nova nesta etapa

Essa etapa evita ambiguidade semântica porque:

- não reintroduz `INCOMPLETE`
- não reintroduz `HANDED_OFF`
- não cria estados intermediários com cara de pipeline
- usa `BLOCKED` para qualquer impedimento real

## 5. Mudanças realizadas

### backend

- criada uma camada central de avaliação de readiness em [opportunity-readiness.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/opportunity-readiness.ts)
- a sincronização de oportunidades passou a usar essa avaliação central
- a decisão de `READY`, `BLOCKED` e `BOOKED` ficou mais consistente

### regra

- removida a lógica anterior que deixava ausência de setup como `OPEN`
- `main offer` ausente agora cai em `BLOCKED`
- `booking path` ausente agora cai em `BLOCKED`
- contato incompatível com o canal do booking path agora cai em `BLOCKED`

### UI / surface

- a leitura server-side de intake passou a trazer:
  - `blockedReason`
  - `readinessLabel`
  - `readinessNote`
- a superfície de `Booking Inputs` agora mostra essa leitura de forma curta e legível
- os cards de oportunidade passaram a mostrar:
  - status
  - blocked reason quando existir
  - leitura curta de prontidão
  - nota curta do que está faltando ou do que já está pronto

### schema

- nenhum ajuste de schema foi necessário nesta etapa

## 6. Arquivos alterados

- [services/lead-booking/opportunity-readiness.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/opportunity-readiness.ts)
- [services/lead-booking/sync-lead-booking-opportunities.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/sync-lead-booking-opportunities.ts)
- [services/lead-booking/get-lead-intake-routing-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/get-lead-intake-routing-read.ts)
- [src/app/(app)/app/imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)

## 7. Impacto em booking assistance

Sim, a camada ficou mais útil.

Sim, o produto ficou mais acionável.

A leitura de prontidão ficou clara porque agora responde de forma curta:

- está pronto
- está bloqueado
- e por quê

Os bloqueios ficaram visíveis e úteis porque:

- são curtos
- são legíveis
- são operacionais
- não parecem scoring ou qualificação profunda

O resultado prático é que a camada agora ajuda mais como `booking assistance` e menos como simples leitura passiva de intake.

## 8. Riscos remanescentes

- a camada continua import-first; ela ainda não é intake amplo
- ainda não existe outreach real
- ainda não existe mensagem sugerida conectada a essa leitura
- ainda não existe ação operacional mais concreta além da leitura curta e do `nextAction` técnico

Isso significa que a Etapa 5 ainda é necessária para transformar essa leitura em algo mais diretamente acionável.

Também continua sendo importante não vender isso como:

- inbox
- CRM
- follow-up engine
- automação de contato
- chat com lead

## 9. Julgamento final

`Aprovada`.

A etapa cumpriu o que precisava cumprir:

- deixou readiness clara
- deixou bloqueios explícitos
- eliminou ambiguidade semântica importante
- preparou a base para `next action + suggested message`
- manteve a camada narrow

Resumo honesto:

- a camada agora sabe dizer se o lead pode avançar
- sabe dizer o que está travando
- e faz isso sem parecer CRM, inbox ou outreach engine
