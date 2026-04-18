# REVORY Seller — Manual Lead Quick Add Architecture

## Leitura do estado atual

Hoje o REVORY Seller já tem uma camada real de `LeadBookingOpportunity`, mas ela nasce quase toda por derivação de dados importados.

O que existe de verdade:

- `LeadBookingOpportunity` já está no schema e já sustenta:
  - `status`
  - `bookingPath`
  - `mainOfferKey`
  - `blockingReason`
  - `nextAction`
  - `handoffOpenedAt`
- a leitura operacional já está pronta em [services/lead-booking/get-lead-intake-routing-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/get-lead-intake-routing-read.ts)
- a surface curta já está pronta em [src/app/(app)/app/imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx) e [components/lead-booking/LeadBookingOpportunityList.tsx](C:/Users/hriqu/Documents/revory-mvp/components/lead-booking/LeadBookingOpportunityList.tsx)
- a lógica de readiness já está encapsulada em [services/lead-booking/opportunity-readiness.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/opportunity-readiness.ts)
- o contexto do workspace já entrega automaticamente:
  - `selectedTemplate` como main offer
  - `primaryChannel` como booking path
  - `recommendedModeKey` como seller voice
  - workspace atual via [services/app/get-app-context.ts](C:/Users/hriqu/Documents/revory-mvp/services/app/get-app-context.ts)

O que ainda não existe:

- criação manual curta de oportunidade
- entrada rápida de lead fora do fluxo import-first
- ação server-side dedicada para criar `Client + LeadBookingOpportunity` manualmente

Leitura honesta do gap:

o produto hoje já sabe `ler`, `priorizar`, `assistir` e `abrir handoff`, mas ainda depende demais de import para a oportunidade existir. Isso enfraquece:

- sensação de produto vivo
- primeiro minuto
- utilidade em casos de lead novo chegando agora

Ao mesmo tempo, é exatamente aqui que existe risco de escorregar para CRM por acidente.

## Arquitetura proposta

### Proposta central

Implementar `Manual Lead Quick Add` como uma **entrada manual curta para criar uma `LeadBookingOpportunity` diretamente dentro da booking assistance surface**, sem criar módulo novo de leads.

### Forma correta da feature

Entrada por **compact drawer/modal curto** disparado de dentro da própria section de `booking assistance` em `/app/imports`.

Escolha recomendada:

- **compact drawer ou modal compacto**

Motivo:

- fica contextual à booking assistance
- não polui a página com formulário permanente
- é mais premium e narrow do que inline form aberto
- não sugere “área de gestão de leads”

Evitar:

- página nova
- board
- lista separada de leads
- card fixo expansivo tipo mini-CRM

### Estrutura lógica

O quick add deve fazer apenas isto:

1. receber dados mínimos do lead
2. criar ou reutilizar um `Client` do workspace
3. herdar `mainOfferKey` e `bookingPath` do workspace
4. avaliar readiness com a mesma lógica já existente
5. criar ou atualizar a `LeadBookingOpportunity`
6. revalidar `/app/imports`
7. deixar a oportunidade aparecer no topo da `booking assistance`

### Princípio arquitetural

O quick add **não cria um novo sistema**. Ele apenas abre uma segunda forma de alimentar o mesmo objeto já existente:

- import-first continua existindo
- quick add vira a entrada curta manual
- ambos convergem para `Client + LeadBookingOpportunity`

Esse é o ponto mais importante para manter narrowness.

## Campos mínimos

Payload mínimo recomendado:

- `fullName` — obrigatório
- `email` — opcional
- `phone` — opcional
- `sourceLabel` — opcional curto

Regra crítica:

- pelo menos um entre `email` ou `phone` deve ser preenchido

Campos que **não** devem entrar agora:

- owner
- notes longas
- stage
- score
- pipeline status
- task
- due date
- tags livres
- source taxonomy complexa
- campaign
- offer override
- booking path override
- seller voice override

### Por que esse conjunto é suficiente

`fullName + email/phone` já permitem:

- criar ou reconciliar `Client`
- avaliar readiness
- gerar suggested message
- abrir handoff assistido

`sourceLabel` opcional é aceitável só como contexto leve e curto do tipo:

- `Front desk`
- `Instagram DM`
- `Phone lead`

Sem dropdown complexo e sem taxonomia larga.

## Regras de herança do workspace

O quick add deve herdar automaticamente:

- `mainOfferKey` <- `activationSetup.selectedTemplate`
- `bookingPath` <- `activationSetup.primaryChannel`
- `seller voice` <- `activationSetup.recommendedModeKey` (só para a leitura posterior, não precisa persistir no quick add)
- `workspaceId` <- `appContext.workspace.id`

### Regras de segurança

Não permitir no quick add:

- escolher outra offer
- escolher outro booking path
- escolher outro workspace
- criar exceções por lead

Se o workspace não tiver `main offer` ou `booking path`:

- ainda pode criar a oportunidade
- ela nasce `BLOCKED`
- usando as mesmas blocked reasons já existentes:
  - `missing_main_offer`
  - `missing_booking_path`

Isso mantém honestidade e reaproveita a modelagem atual.

## Fluxo de criação

### Fluxo recomendado

1. usuário clica em `Quick add lead` dentro da surface de `booking assistance`
2. abre modal/drawer curto
3. usuário informa:
   - name
   - email ou phone
   - source label opcional
4. server action recebe o payload
5. action busca o `appContext`
6. action verifica se já existe `Client` no workspace por:
   - email
   - ou phone
   - fallback: cria novo cliente
7. action cria ou atualiza `Client`
8. action roda `evaluateLeadBookingOpportunity(...)`
9. action cria ou atualiza `LeadBookingOpportunity`
10. revalidate `/app/imports`
11. modal fecha
12. nova oportunidade aparece na lista prioritária, se entrar no top 3

### Regra de upsert recomendada

Preferência:

- se existir cliente por `email`
  - reutilizar
- senão, se existir por `phone`
  - reutilizar
- senão
  - criar novo `Client`

Depois:

- `LeadBookingOpportunity` continua 1:1 por `clientId`

Isso preserva compatibilidade com o schema atual sem inventar lead duplicado fora do modelo.

### Efeito esperado pós-criação

Se o lead tiver contato compatível com o booking path atual:

- nasce `READY`

Se faltar contato:

- nasce `BLOCKED` com `missing_contact`

Se o workspace ainda estiver sem configuração mínima:

- nasce `BLOCKED` com reason correspondente

Se o booking path do workspace for `EMAIL` e o lead só tiver phone:

- nasce `BLOCKED` com `ineligible_for_handoff`

Tudo isso já é compatível com a lógica atual.

## Arquivos impactados

### Criar

- [components/lead-booking/ManualLeadQuickAdd.tsx](C:/Users/hriqu/Documents/revory-mvp/components/lead-booking/ManualLeadQuickAdd.tsx)
  - modal/drawer curto
- [src/app/(app)/app/imports/manual-lead-actions.ts](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/manual-lead-actions.ts)
  - server action de criação
- [services/lead-booking/create-manual-lead-booking-opportunity.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/create-manual-lead-booking-opportunity.ts)
  - service central da criação
- [types/manual-lead-quick-add.ts](C:/Users/hriqu/Documents/revory-mvp/types/manual-lead-quick-add.ts)
  - payload/schema curto, se quiser separar

### Alterar

- [src/app/(app)/app/imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)
  - adicionar trigger curto do quick add dentro de `booking assistance`
- [services/lead-booking/get-lead-intake-routing-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/get-lead-intake-routing-read.ts)
  - sem mudança estrutural grande; no máximo garantir label clara para `MANUAL_IMPORT`
- [prisma/schema.prisma](C:/Users/hriqu/Documents/revory-mvp/prisma/schema.prisma)
  - opcional e idealmente **sem mudança**

### Não recomendo alterar agora

- [services/lead-booking/opportunity-readiness.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/opportunity-readiness.ts)
  - já está correta e deve ser reutilizada
- [components/lead-booking/LeadBookingOpportunityList.tsx](C:/Users/hriqu/Documents/revory-mvp/components/lead-booking/LeadBookingOpportunityList.tsx)
  - no máximo copy pequena, sem expansão estrutural

## Riscos

### Riscos técnicos

- deduplicação fraca entre leads manuais e clientes já importados
  - principal risco real
  - precisa de regra simples por `email/phone`
- risco de criar cliente manual sem identidade suficiente
  - resolver exigindo `email` ou `phone`
- risco de action criar muitos caminhos condicionais
  - evitar isso reaproveitando `evaluateLeadBookingOpportunity`
- risco de precisar mexer no schema sem necessidade
  - ideal é não mexer no schema agora

### Riscos de escopo

- adicionar campos demais e transformar quick add em mini ficha de lead
- deixar escolher offer/path manualmente e quebrar o narrow model
- colocar quick add em página própria e sugerir módulo de lead management
- começar a adicionar histórico, dono, tags, notas longas ou fila
- tentar mostrar mais de um bloco de quick add no app

### Risco de manutenção

Baixo a moderado, **se** a feature permanecer:

- um modal curto
- uma server action
- um service único
- reaproveitamento da lógica já existente

Fica ruim se tentar:

- criar form state complexo
- múltiplas variações por canal
- validações ricas demais
- lógica paralela de lead status

## O que NÃO entra

- CRM
- inbox
- pipeline
- kanban
- owner
- stage
- lead scoring
- notes longas
- timeline
- reminders
- follow-up engine
- envio automático
- múltiplas offers por lead
- múltiplos booking paths por lead
- override manual do workspace context
- search/list screen de leads manuais
- filtros e gestão contínua

Também não entra:

- tabela grande de leads
- board de “new / contacted / won / lost”
- qualquer coisa que mude a natureza do produto para operação contínua de sales workflow

## Veredito executivo

`Manual Lead Quick Add` faz sentido **se** for tratado como uma segunda entrada curta para o mesmo objeto narrow que já existe.

O caminho certo é:

- entrada curta
- modal/drawer compacto
- payload mínimo
- herança automática do workspace
- reutilização da lógica de readiness
- criação de `Client + LeadBookingOpportunity`
- reentrada imediata na mesma booking assistance

O caminho errado é transformar isso em “módulo de leads”.

Minha recomendação objetiva:

- **sim, vale implementar**
- **sim, é compatível com solo founder**
- **sim, dá para implementar com CODEX sem loucura técnica**
- **não, não deve abrir schema novo se não for estritamente necessário**
- **não, não deve ter página própria nem gestão contínua**

Se mantido desse jeito, o quick add aumenta sensação de produto vivo e reduz fricção de entrada sem quebrar a natureza narrow premium do REVORY Seller.
