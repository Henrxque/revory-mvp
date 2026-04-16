# Sprint 14 - Etapa 2 Review

## objetivo da etapa

Implementar a geracao real de `suggested message` para a camada de booking assistance, usando a arquitetura bounded definida na Etapa 1.

O objetivo desta etapa nao foi:

- criar conversa livre
- criar agente
- criar follow-up
- enviar mensagem automaticamente

O objetivo foi colocar em funcionamento uma geracao curta, contextual e util para:

- oportunidades `READY`
- alguns `BLOCKED` simples que ainda podem ser destravados por uma mensagem curta

## como a geracao funciona

A geracao agora funciona dentro da leitura server-side das oportunidades em `Booking Inputs`.

Fluxo implementado:

1. o sistema le a `LeadBookingOpportunity`
2. avalia a elegibilidade da suggested message
3. se o caso for elegivel:
   - tenta gerar via LLM bounded
   - se a LLM falhar, cai em fallback deterministico
4. a surface recebe:
   - `suggestedMessage`
   - `suggestedMessageLabel`
   - `suggestedMessageSource`

A geracao continua bounded porque:

- usa schema fechado
- usa prompt curto e restrito
- limita tamanho
- limita numero de frases
- proibe links, conversa longa, follow-up e linguagem de agente
- fica restrita as poucas oportunidades ja mostradas na surface

## diferencas entre READY e BLOCKED elegivel

### READY

Para `READY`, a mensagem sugerida funciona como a melhor proxima mensagem curta para abrir o `booking path` atual.

Exemplo de papel:

- abrir o caminho de email
- abrir o caminho de SMS
- dar o proximo passo sem virar conversa longa

Na UI, isso aparece como:

- `Suggested message`

### BLOCKED elegivel

Os casos `BLOCKED` elegiveis nesta etapa sao:

- `missing_contact`
- `ineligible_for_handoff`

Nesses casos, a mensagem nao tenta “continuar booking”.

Ela tenta destravar o minimo necessario para o booking path poder abrir.

Exemplo de papel:

- pedir o melhor email quando o caminho atual exige email
- pedir o melhor numero quando o caminho atual exige SMS

Na UI, isso aparece como:

- `Suggested ask`

Esse ajuste importa porque evita tratar todo bloqueio como problema de setup ou como se a camada ja fosse outreach engine.

## bloqueios que geram vs bloqueios que nao geram mensagem

### geram mensagem

- `missing_contact`
- `ineligible_for_handoff`

Esses casos geram porque ainda existe um proximo passo curto que pode ser resolvido com uma mensagem bounded.

### nao geram mensagem

- `missing_main_offer`
- `missing_booking_path`

Esses casos nao geram porque dependem de setup do workspace.

Seria desonesto pedir algo ao lead quando o bloqueio real ainda esta do lado do produto/workspace.

## arquivos alterados

- [services/lead-booking/generate-lead-suggested-message.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/generate-lead-suggested-message.ts)
- [services/lead-booking/get-lead-intake-routing-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/get-lead-intake-routing-read.ts)
- [components/lead-booking/LeadBookingOpportunityList.tsx](C:/Users/hriqu/Documents/revory-mvp/components/lead-booking/LeadBookingOpportunityList.tsx)
- [src/app/(app)/app/imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)
- [types/lead-suggested-message.ts](C:/Users/hriqu/Documents/revory-mvp/types/lead-suggested-message.ts)

## impacto em practical usefulness

O impacto em usefulness foi real.

Antes:

- havia readiness
- havia blocked reason
- havia handoff assistido

Agora:

- a camada tambem devolve uma mensagem curta pronta para uso nos casos certos

Isso aumenta utilidade pratica porque o produto passa a ajudar nao apenas na leitura, mas tambem no proximo passo concreto.

O ganho principal foi:

- `READY` deixa de depender so do handoff mecanico
- `BLOCKED` elegivel deixa de ser apenas diagnostico

## impacto em premium feel

O premium feel melhora quando a mensagem:

- muda com o contexto
- muda com o `booking path`
- muda com o `seller voice`
- continua curta
- nao parece bloco duro de template

Tambem melhora porque a UI nao apresenta isso como automacao ampla.

Ela apresenta como:

- uma mensagem sugerida
- curta
- contextual
- bounded

## riscos remanescentes

- `missing_contact` continua sendo um caso delicado, porque a mensagem sugerida existe como proximo ask, nao como envio real garantido
- a camada ainda nao distingue “mensagem melhor” de “mensagem comprovadamente enviada”; isso continua correto, mas precisa seguir claro na surface
- se a proxima etapa tentar deixar essa suggested message com protagonismo demais, o produto pode voltar a parecer outreach engine
- o custo continua bounded, mas qualquer ampliacao para mais superfices ou mais oportunidades por request precisa ser tratada com disciplina

## julgamento final da etapa

`Aprovada`.

Esta etapa resolveu bem o ponto levantado na review da Etapa 1:

- `READY` continua coberto
- `BLOCKED` elegivel agora tambem recebe utilidade pratica
- `BLOCKED` de setup continua sem mensagem, de forma honesta

Leitura final:

a camada de suggested message agora esta funcional e mais util, sem ter escorregado para agente, follow-up ou automacao ampla.
