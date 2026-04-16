# Sprint 14 — Etapa 6 Review

## objetivo da etapa

Blindar a camada de `suggested message` em runtime real para que:

- falha de LLM não quebre a assistance layer
- o produto continue útil em `READY` e `BLOCKED` elegível
- o custo de geração fique disciplinado
- o fallback continue honesto

## riscos identificados

- a geração podia fazer chamadas repetidas demais para o mesmo contexto de oportunidade
- a camada ainda dependia demais da resposta online da LLM para entregar a melhor versão da mensagem
- sem controle mais fino, uma saída curta podia consumir mais tokens do que precisava
- havia risco de concorrência duplicar requests quando a mesma leitura fosse pedida ao mesmo tempo

## mudanças realizadas

- a chamada estruturada em [services/llm/request-bounded-structured-output.ts](C:/Users/hriqu/Documents/revory-mvp/services/llm/request-bounded-structured-output.ts) passou a aceitar `maxOutputTokens` por caso de uso
- a geração de `suggested message` em [services/lead-booking/generate-lead-suggested-message.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/generate-lead-suggested-message.ts) ganhou:
  - limite de output tokens mais curto para essa surface
  - cache curto de resultados LLM bem-sucedidos
  - deduplicação de requests em voo
  - fallback preservado como resposta padrão quando a LLM falha
- a lógica continua retornando a mensagem determinística de fallback para:
  - `READY`
  - `BLOCKED` elegível

## arquivos alterados

- `services/llm/request-bounded-structured-output.ts`
- `services/lead-booking/generate-lead-suggested-message.ts`

## impacto em runtime safety

O impacto foi bom e concreto.

Agora:

- a surface não depende de sucesso da LLM para continuar funcional
- falha de API, timeout, schema inválido ou indisponibilidade continuam caindo em fallback útil
- requests concorrentes para a mesma oportunidade deixam de abrir múltiplas chamadas desnecessárias

Em termos práticos, a camada ficou mais segura para uso real sem quebrar a UI nem degradar o fluxo de booking assistance.

## impacto em cost discipline

O impacto em custo também foi positivo.

Os principais controles agora são:

- `maxOutputTokens` menor para esse caso de uso curto
- cache de curta duração para reutilizar respostas LLM já boas
- deduplicação de requests simultâneos

Isso mantém a camada econômica e mais compatível com a regra de IA mínima e de baixo custo do produto.

## riscos remanescentes

- o cache é em memória de runtime, então não é uma camada distribuída nem persistente
- a qualidade premium máxima da mensagem ainda depende da LLM estar disponível
- quando o fallback entrar, a camada continua útil, mas menos refinada
- ainda existe risco de custo subir se a surface passar a pedir geração em contextos mais amplos do que os elegíveis atuais

## julgamento final

Aprovada.

A Etapa 6 deixou a camada mais segura e mais disciplinada sem abrir escopo novo. O principal acerto foi manter a assistência útil mesmo quando a LLM falha, enquanto reduz custo e repetição de chamadas para um caso de uso que precisa continuar curto e econômico.
