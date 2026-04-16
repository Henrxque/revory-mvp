# Sprint 13 — Etapa 2 Review

## objetivo da etapa

Definir o menor modelo viável de interação com lead que permita ao REVORY Seller sustentar uma promessa estreita de `lead-to-booking` sem escorregar para chat, inbox, CRM ou automação ampla.

O objetivo desta etapa não é desenhar uma experiência conversacional. É definir uma camada curta de:

- `lead readiness`
- `next action`
- `booking handoff`

Essa definição foi ancorada em:

- estado atual do produto
- [source-of-truth.md](C:/Users/hriqu/Documents/revory-mvp/docs/source-of-truth.md)
- [sprint13-etapa1-review.md](C:/Users/hriqu/Documents/revory-mvp/docs/reviews/sprint13-etapa1-review.md)
- [revory-current-product-state.md](C:/Users/hriqu/Documents/revory-mvp/docs/reviews/revory-current-product-state.md)

## modelo proposto

O modelo mínimo proposto é um fluxo curto de cinco momentos:

1. `Lead identified`

Existe uma identidade mínima utilizável para o lead:

- nome ou identificador
- canal principal
- contato mínimo

Sem isso, não existe interação. Existe apenas dado insuficiente.

2. `Readiness evaluated`

O produto verifica se o lead está apto para seguir pelo caminho principal de booking do workspace.

A checagem mínima é:

- existe `main offer`
- existe `booking path`
- existe contato mínimo
- o lead ainda não está resolvido em booking futuro visível

3. `Next action assigned`

O produto não conversa livremente. Ele apenas determina qual é a próxima ação curta e bounded.

Exemplos aceitáveis:

- `send booking handoff`
- `confirm offer fit`
- `complete contact identity`
- `resolve booking block`

4. `Booking handoff`

Quando o lead está pronto, o produto entrega um handoff curto para o caminho principal de booking.

Esse handoff é o ponto em que o REVORY Seller para de “avaliar prontidão” e passa a empurrar o lead para o `booking path` já configurado no workspace.

5. `Resolved state`

Depois do handoff, o item precisa sair rapidamente da camada ativa para um estado de resolução simples:

- booked
- closed
- blocked

O modelo não deve manter trilha longa de relacionamento.

## objeto mínimo proposto

O objeto mínimo proposto é `LeadBookingOpportunity`.

Ele não deve ser um `Lead` amplo de CRM.
Ele deve ser apenas um registro curto de elegibilidade operacional para booking.

Campos mínimos recomendados:

- `id`
- `workspaceId`
- `clientId` ou referência equivalente
- `primaryChannel`
- `bookingPath`
- `mainOfferSnapshot`
- `readinessState`
- `nextAction`
- `blockingReason`
- `handoffReadyAt`
- `resolvedAt`
- `resolution`

Função real desse objeto:

- dizer se existe oportunidade curta de avançar para booking
- registrar o próximo passo explícito
- registrar quando o handoff já aconteceu ou quando o item saiu da camada ativa

Função que esse objeto não deve ter:

- histórico de conversa
- timeline longa
- múltiplos owners
- pipeline comercial
- score complexo
- automações abertas

## estados mínimos

Estados mínimos recomendados:

- `INCOMPLETE`
- `READY`
- `HANDED_OFF`
- `BOOKED`
- `CLOSED`
- `BLOCKED`

Leitura objetiva de cada estado:

- `INCOMPLETE`: falta identidade mínima, main offer, booking path ou outro pré-requisito essencial.
- `READY`: o lead já pode receber o próximo passo rumo ao booking.
- `HANDED_OFF`: o produto já entregou a orientação ou o template para o caminho principal de booking.
- `BOOKED`: já existe booking futuro visível, então a oportunidade sai da camada ativa.
- `CLOSED`: o item foi encerrado sem booking e sem permanecer em operação.
- `BLOCKED`: existe impedimento explícito que trava o avanço.

Esses estados são curtos de propósito. Eles servem para leitura operacional, não para gestão comercial extensa.

## por que ele é narrow

Ele é narrow porque:

- trabalha com um único objetivo: avançar para booking
- usa um único `booking path` por workspace
- não cria conversa livre
- não cria inbox
- não cria múltiplos trilhos paralelos
- não cria relacionamento comercial contínuo
- não exige múltiplos canais ativos
- não tenta operar o ciclo inteiro do lead

Na prática, essa camada só responde três perguntas:

- esse lead está pronto?
- qual é o próximo passo?
- o handoff para booking já aconteceu ou não?

Isso mantém o modelo compatível com a promessa atual do REVORY Seller e com o desenho `booking-first` do MVP.

## por que ele é viável

Ele é viável porque conversa com padrões que o produto já tem hoje:

- setup com `main offer`
- setup com `booking path`
- leitura bounded de readiness
- superfícies operacionais curtas
- dashboard revenue-first

Ele também é viável porque não exige, nesta etapa:

- runtime conversacional
- thread de mensagens
- outbound multicanal
- CRM visual
- automação de cadência

Em termos técnicos, o encaixe mais honesto no produto atual é:

- usar a lógica de setup como pré-condição
- derivar readiness a partir de dados já existentes
- tratar `next action` como classificação curta
- usar o `booking path` atual como ponto explícito de handoff

O modelo é viável como camada de leitura e operação mínima.
Ele não é viável como camada ampla de relacionamento com lead.

## o que ficou fora

Ficou fora de propósito:

- inbox
- chat
- assistente conversacional
- sequência automática
- cadência multietapa
- CRM pipeline
- múltiplos owners
- SLA operacional
- lead scoring complexo
- priorização preditiva
- Meta DM runtime
- SMS runtime
- envio automático amplo
- histórico completo de conversa
- console de atendimento

Também ficou fora qualquer tentativa de fazer o produto parecer que “fala com o lead” quando, na prática, ele só está classificando prontidão e sugerindo o próximo passo.

## riscos remanescentes

- O objeto pode inflar rápido e virar mini-CRM se começar a absorver campos demais.
- A UI pode mentir capacidade se mostrar handoff como se fosse outreach real já executado.
- A equipe pode confundir `HANDED_OFF` com “lead trabalhado”, quando isso pode significar apenas que o próximo passo foi preparado.
- Se o modelo tentar cobrir mais de um canal cedo demais, ele sai do narrow e vira infra operacional.
- Se o produto não separar bem `READY` de `BOOKED`, a camada perde clareza e vira duplicação confusa de dashboard ou imports.

## julgamento final da etapa

O julgamento honesto é:

- existe um modelo mínimo viável
- ele é curto o bastante para caber no produto atual
- ele sustenta uma leitura estreita de `lead-to-booking`
- ele só continua alinhado se permanecer como `readiness -> next action -> booking handoff`

Em termos práticos:

- `sim`, vale seguir com esse modelo
- `não`, não vale expandir isso para conversa, CRM, inbox ou automação ampla

Resumo executivo da etapa:

- modelo viável: camada curta de oportunidade operacional para booking
- modelo não viável: camada ampla de relacionamento e condução contínua do lead
