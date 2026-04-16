# Sprint 13 — Etapa 2 Adjusted Review

## 1. Objetivo do ajuste

O objetivo deste ajuste é refinar a semântica do modelo definido na Etapa 2 sem mudar sua estrutura geral.

O que precisava ser refinado:

- a sobreposição potencial entre `INCOMPLETE` e `BLOCKED`
- o risco de `HANDED_OFF` soar mais executado do que o produto realmente sustenta hoje

O problema da semântica anterior não era o modelo em si. O problema era de leitura operacional e honestidade de produto.

Se os estados principais sugerem:

- outreach já executado
- lead já trabalhado
- fluxo operacional mais real do que o produto entrega

então a camada começa a parecer maior do que ela é.

## 2. Problemas identificados no modelo anterior

### sobreposição entre estados

`INCOMPLETE` e `BLOCKED` podiam ser lidos como quase a mesma coisa.

Se falta:

- contato mínimo
- `main offer`
- `booking path`

isso já é, na prática, um bloqueio operacional.

Manter os dois como estados principais criava ambiguidade desnecessária.

### risco de oversell semântico

`HANDED_OFF` como estado principal podia sugerir:

- contato já aconteceu
- outreach já foi executado
- lead já foi operacionalmente trabalhado

Isso é perigoso porque o produto atual ainda não é:

- inbox
- runtime multicanal
- engine de outreach
- automação operacional ampla

### risco de parecer mini-CRM

Quanto mais estados intermediários orientados a “processo comercial”, maior o risco de o modelo começar a parecer pipeline.

Essa não é a função da camada.

### risco de sugerir execução real demais

O modelo precisa ser compatível com uma camada curta de:

- readiness
- next action
- booking handoff

não com uma camada que afirma ter feito o trabalho.

## 3. Modelo ajustado

O modelo geral foi mantido:

- objeto mínimo: `LeadBookingOpportunity`
- fluxo geral: `lead readiness -> next action -> booking handoff`
- encaixe no produto atual: mantido
- escopo narrow: mantido

O ajuste foi semântico.

### objeto mínimo mantido

O objeto continua tendo a mesma função:

- representar uma oportunidade curta de avanço para booking
- registrar o próximo passo explícito
- registrar se existe bloqueio
- registrar quando a oportunidade já saiu da camada ativa

### fluxo mantido

O fluxo continua o mesmo:

1. lead identificado
2. readiness avaliada
3. next action definida
4. handoff para booking path preparado ou exibido
5. oportunidade resolvida

### mudanças de semântica

As mudanças principais são:

- remover `INCOMPLETE` como estado principal
- remover `HANDED_OFF` como estado principal
- consolidar a leitura principal em um conjunto mais curto e menos ambíguo

### novo conjunto de estados

Estados finais recomendados:

- `OPEN`
- `READY`
- `BLOCKED`
- `BOOKED`
- `CLOSED`

Leitura objetiva de cada estado:

- `OPEN`: a oportunidade existe e ainda está em leitura operacional, mas ainda não está pronta para seguir.
- `READY`: a oportunidade já pode seguir pelo próximo passo bounded rumo ao booking path principal.
- `BLOCKED`: existe impedimento explícito que trava o avanço.
- `BOOKED`: já existe booking futuro visível, então a oportunidade sai da camada ativa.
- `CLOSED`: a oportunidade foi encerrada sem booking e sem seguir em operação.

## 4. Justificativa dos estados finais

Esses estados são mais honestos e mais claros por cinco motivos:

1. `OPEN` absorve o papel de “existe oportunidade em avaliação” sem insinuar execução operacional.

2. `BLOCKED` passa a concentrar a leitura de impedimento real, inclusive quando faltam requisitos essenciais.

3. `READY` comunica prontidão sem afirmar que o produto já fez outreach.

4. `BOOKED` e `CLOSED` continuam sendo estados finais simples e fáceis de ler.

5. O conjunto inteiro fica mais curto, menos parecido com pipeline comercial e menos sujeito a interpretação de mini-CRM.

Esse desenho ajuda a camada a responder apenas:

- existe oportunidade ativa?
- ela está pronta?
- ela está bloqueada?
- ela já saiu da camada ativa?

Isso é mais compatível com o produto atual do que um conjunto de estados mais processual.

## 5. O que virou estado vs o que virou campo auxiliar

`handoff` deixa de ser estado principal.

Isso é importante porque o handoff, no estado atual do produto, pode significar coisas diferentes:

- próximo passo preparado
- template sugerido
- booking path exibido
- orientação pronta para uso

Nenhuma dessas leituras, por si só, prova que houve contato executado.

Por isso, o mais honesto é tratar handoff como campo auxiliar ou metadata.

Exemplos aceitáveis:

- `handoffPreparedAt`
- `handoffShownAt`
- `nextActionPreparedAt`
- `bookingPathShown`

Esses campos ajudam a registrar preparação ou exposição do próximo passo sem inflar o estado principal.

Resumo da divisão:

- `estado principal`: onde a oportunidade está, de forma curta e operacional
- `campo auxiliar`: o que já foi preparado, exibido ou sinalizado para o próximo passo

## 6. Impacto em product honesty

O modelo ficou mais honesto porque:

- não sugere mais execução real demais
- não afirma outreach onde talvez só exista preparação
- reduz a chance de a UI parecer maior do que o backend realmente sustenta

O modelo ficou mais narrow porque:

- usa menos estados
- evita estágio intermediário com cara de pipeline
- preserva foco em prontidão e resolução

O risco de oversell foi reduzido porque:

- `HANDED_OFF` saiu do estado principal
- `INCOMPLETE` deixou de competir semanticamente com `BLOCKED`
- a camada passa a parecer menos CRM e mais leitura operacional curta

## 7. Julgamento final

`Aprovado`.

O modelo ajustado é melhor do que a versão anterior porque:

- mantém o espírito da Etapa 2
- melhora a honestidade semântica
- reduz ambiguidade entre estados
- evita insinuar execução operacional que o produto ainda não sustenta
- continua compatível com o posicionamento narrow do REVORY Seller

Resumo final:

- modelo mantido
- semântica refinada
- estados mais curtos
- menos risco de mini-CRM
- menos risco de oversell
