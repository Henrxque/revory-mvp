# Sprint 14 - Etapa 1 Review

## objetivo da etapa

Definir a arquitetura da camada de `suggested message` com LLM para o trilho curto de booking assistance.

O objetivo desta etapa nao foi:

- abrir conversa livre
- criar agente
- criar follow-up engine
- enviar mensagem automaticamente

O objetivo foi preparar uma base segura para gerar uma unica mensagem curta e util quando a oportunidade realmente estiver pronta para isso.

## papel da LLM

O papel da LLM foi definido de forma estreita:

- gerar a melhor proxima mensagem curta para uma oportunidade especifica
- respeitar `main offer`, `booking path`, `seller voice` e status atual
- ficar dentro de um schema fechado
- cair em fallback deterministico quando a LLM nao estiver disponivel ou sair dos guardrails

A LLM nao foi posicionada como:

- agente conversacional
- camada de follow-up
- sistema de resposta
- automacao de envio
- thread manager

Em resumo:

a LLM entra como `message polisher` bounded para uma unica mensagem curta, nao como runtime de conversacao.

## inputs escolhidos

Os inputs escolhidos foram:

- `mainOfferLabel`
- `bookingPath`
- `sellerVoiceLabel`
- `status`
- `blockedReason`
- `workspaceName`
- `clientFirstName`
- `clientName`
- `hasEmail`
- `hasPhone`
- `intakeLabel`

Esses inputs sao suficientes porque cobrem:

- o contexto comercial minimo
- o canal atual
- o tom do Seller
- a elegibilidade real da oportunidade
- o minimo de contexto do lead sem inflar a camada

Tambem foi implementada uma camada de elegibilidade antes da LLM.

Hoje a arquitetura so considera a mensagem geravel quando a oportunidade esta, de fato:

- `READY`
- com `bookingPath` valido
- com contato compativel com esse caminho

Se a oportunidade estiver:

- `BLOCKED`
- `OPEN`
- `BOOKED`
- `CLOSED`

ou sem encaixe real no caminho atual, a arquitetura nao gera mensagem.

Isso foi uma escolha deliberada de honestidade.

## outputs definidos

O output definido foi o menor necessario:

- `message`

Com metadado tecnico minimo:

- `source`
  - `llm`
  - `fallback`

E no resultado final:

- `bookingPath`
- `eligibilityReason`
- `suggestedMessage`

Isso mantem a camada curta e util.

Nao foi adicionado:

- subject separado
- thread state
- follow-up suggestion
- multi-message pack
- score
- confidence band

## guardrails definidos

Os guardrails implementados foram:

- geracao permitida apenas para oportunidade realmente `READY`
- schema fechado de structured output
- mensagem com tamanho minimo e maximo controlado
- no maximo 2 frases
- sem links
- sem placeholders
- sem mencionar AI, assistant ou chatbot
- sem descontos
- sem promessas de disponibilidade
- sem linguagem de automacao ampla
- sem abrir conversa longa

Tambem entrou fallback deterministico.

Se a LLM:

- estiver desabilitada
- nao tiver API key
- falhar
- voltar fora do schema
- quebrar os guardrails

o sistema retorna uma mensagem curta de fallback, baseada em:

- `main offer`
- `booking path`
- `seller voice`
- primeiro nome do lead

Isso melhora confiabilidade e mantem custo disciplinado.

## arquivos alterados

- [types/lead-suggested-message.ts](C:/Users/hriqu/Documents/revory-mvp/types/lead-suggested-message.ts)
- [services/lead-booking/generate-lead-suggested-message.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/generate-lead-suggested-message.ts)
- [services/lead-booking/seller-voice-labels.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/seller-voice-labels.ts)

## impacto em usefulness

Esta etapa melhora usefulness de forma estrutural.

Ainda nao colocou `suggested message` visivel na UI, mas deixou pronta a parte mais importante:

- quando gerar
- quando nao gerar
- com quais inputs
- com qual schema
- com qual fallback

Isso evita que a proxima etapa precise improvisar prompt, elegibilidade ou semantica.

O ganho real aqui e:

- a camada ja nasce util do ponto de vista de arquitetura
- e nao como LLM solta acoplada de forma oportunista

## impacto em scope safety

O impacto em scope safety foi forte e positivo.

A arquitetura foi desenhada para bloquear exatamente os escorregoes mais perigosos:

- chat livre
- thread
- follow-up
- automacao de envio
- amplitude de CRM

O principal acerto desta etapa foi:

- limitar a LLM a uma unica mensagem curta
- limitar a geracao a oportunidades realmente prontas
- manter fallback deterministico

Isso reduz bastante o risco de a camada virar “mini sales agent”.

## riscos remanescentes

- a UX ainda nao mostra essa camada, entao o valor ainda e arquitetural, nao percebido pelo usuario final
- `suggested message` continua sendo um termo que pode ser interpretado como automacao se a superficie futura exagerar
- o fallback hoje e curto e honesto, mas ainda simples; a qualidade percebida vai depender de como a etapa seguinte integrar isso na UI
- se a proxima etapa tentar gerar mensagens para estados bloqueados, o produto pode voltar a sugerir participacao maior do que realmente sustenta

## julgamento final da etapa

`Aprovada`.

Esta etapa fez o que precisava fazer:

- definiu onde a LLM entra
- definiu onde ela nao entra
- fechou inputs e outputs
- implementou guardrails reais
- manteve custo e escopo sob controle

Leitura final:

o REVORY Seller agora tem uma arquitetura segura para `suggested message`, mas ainda nao tem essa camada exposta como funcionalidade de produto. A etapa acertou em preparar a base primeiro, em vez de ligar uma LLM solta direto na UI.
