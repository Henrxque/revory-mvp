# Sprint 13 — Etapa 1 Review

## objetivo da etapa

Avaliar se existe um caminho viável para implantar uma camada mínima de lead-to-booking no REVORY Seller sem empurrar o produto para CRM, inbox, chatbot ou operação manual disfarçada de software.

Esta avaliação foi feita com base em:

- estado atual do código
- [source-of-truth.md](C:/Users/hriqu/Documents/revory-mvp/docs/source-of-truth.md)
- [revory-current-product-state.md](C:/Users/hriqu/Documents/revory-mvp/docs/reviews/revory-current-product-state.md)

Observação objetiva: a lousa externa referenciada no repo não estava disponível no caminho configurado durante esta review.

## gap identificado

O gap real hoje é este:

- o produto já entrega bem `setup -> imports -> dashboard -> billing`
- o produto ainda não entrega uma camada real de condução operacional do lead até booking

No estado atual do código:

- não existe modelo de `Lead`
- não existe fila de leads ativa na UI
- não existe surface real de outreach para lead
- não existe thread, mensagem, inbox, histórico de contato ou estado de conversa
- não existe runtime real de email outbound, SMS outbound ou Meta outbound para lead handling

O que existe no repo como base operacional hoje não é lead-to-booking. É outra coisa:

- classificações de `confirmation`, `reminder`, `recovery`, `review request` e `at-risk`
- templates operacionais curtos
- uma `operational surface` no backend

Mas essa base trabalha majoritariamente em cima de:

- `Client`
- `Appointment`
- janelas pós-booking ou pré-atendimento

Ou seja:

- o produto lê melhor o que já aconteceu ou o que já está agendado
- ele ainda não opera bem o momento anterior ao booking

O gap não é “falta um chat”.
O gap é: falta um objeto, uma leitura e uma superfície operacional mínima para dizer, com honestidade, quais leads estão prontos para o próximo passo rumo ao booking.

## riscos principais

- Abrir escopo sem perceber: a camada pode escorregar rápido para inbox, CRM, cadência, pipeline ou assistente conversacional.
- UI desonesta: é fácil criar uma aparência de “lead handling” sem haver runtime real de contato.
- Dados insuficientes: hoje `Client` e `lead base` não são equivalentes a uma fila confiável de leads ativos prontos para booking.
- Canal inconsistente: o setup aceita `EMAIL` e `SMS`, mas o que existe de operacional real no código hoje é essencialmente email-first.
- Carga operacional escondida: se a camada exigir exceções, acompanhamento manual e decisões ad hoc, ela quebra o posicionamento self-service.

## avaliação de viabilidade

Sim, existe um caminho viável.

Mas ele só é viável se “lead-to-booking” for definido de forma muito estreita:

- não como conversa com lead
- não como chat
- não como inbox
- não como automação multicanal
- não como CRM

O caminho viável é:

- uma camada mínima de `lead readiness + next action`
- com uma única leitura operacional
- um único caminho principal de booking
- e um único canal realmente executável no MVP

Se a expectativa for “falar com o lead” de forma ampla, o caminho não é viável no MVP atual.

Se a expectativa for “dar visibilidade operacional curta sobre quais leads estão prontos, bloqueados ou já resolvidos em direção ao booking”, então o caminho é viável.

O motivo técnico para considerar isso viável:

- o produto já tem padrões úteis para classificação operacional curta
- o repo já tem linguagem de readiness (`blocked`, `prepared`, `ready`)
- o repo já tem templates operacionais bounded
- o produto já está estruturado para trabalhar com superfícies estreitas e classificações pequenas

O motivo para não superestimar a viabilidade:

- a base atual é appointment-centric, não lead-centric
- então não dá para “ligar uma UI” em cima do que existe e chamar isso de lead-to-booking entregue

## caminho mínimo recomendado

O caminho mínimo recomendado é este:

1. Criar uma camada estreita de `LeadBookingOpportunity`

Não como CRM lead. Não como pipeline amplo.

A função desse objeto seria apenas:

- representar um lead elegível para o próximo passo rumo ao booking
- manter estado mínimo e explícito

Estados mínimos aceitáveis:

- `OPEN`
- `CONTACTED`
- `BOOKED`
- `CLOSED`
- opcionalmente `BLOCKED`

2. Derivar elegibilidade de forma narrow

Uma oportunidade só deve existir quando:

- o workspace já passou pelo setup principal
- existe identidade mínima de contato
- existe um main offer definido
- existe um booking path definido
- o lead ainda não tem um booking futuro visível

3. Entregar uma superfície operacional curta, não uma inbox

A superfície mínima deveria mostrar:

- quantos leads estão prontos para o próximo passo
- quantos estão bloqueados
- quais são os principais bloqueios
- uma lista curta de itens prioritários

Sem thread. Sem histórico. Sem chat.

4. Ficar em um único canal real no começo

O canal mínimo recomendado é:

- `EMAIL`

Não porque email é ideal para sempre, mas porque:

- o repo já tem base operacional email-first
- os templates existentes já seguem esse padrão
- adicionar SMS ou Meta agora aumentaria escopo demais

5. A ação mínima deve ser assistida, não automatizada

O produto pode recomendar:

- o próximo passo
- o template-base
- o motivo do bloqueio

O produto não precisa, nesta etapa, executar automaticamente o contato.

O ponto do MVP é:

- reduzir ambiguidade operacional
- não prometer engine de outreach que ainda não existe

## o que não deve entrar

- inbox
- chat com lead
- assistente conversacional aberto
- multi-channel runtime
- Meta DM
- SMS runtime
- automação de sequência
- cadência multietapa
- pipeline visual estilo CRM
- lead scoring complexo
- engine de follow-up “inteligente”
- IA livre para escrever ou responder conversa
- qualquer superfície que pareça operação humana escondida atrás do produto

## julgamento final da etapa

O julgamento honesto é:

- existe viabilidade
- mas só para uma camada mínima de `lead readiness -> next action -> booking path`

Não existe viabilidade segura, no MVP atual, para implantar uma camada mais ambiciosa de lead-to-booking sem abrir escopo demais.

Em termos de product/tech lead responsável:

- `sim`, vale seguir
- `não`, não vale seguir se o time estiver imaginando chat, inbox, outreach engine ou CRM

Resumo executivo da decisão:

- viável como camada operacional curta
- inviável como camada conversacional ou operacional ampla

O maior cuidado estratégico daqui para frente é não chamar de “lead-to-booking” algo que, na prática, vire mini-CRM ou automação comercial que o produto ainda não sustenta.
