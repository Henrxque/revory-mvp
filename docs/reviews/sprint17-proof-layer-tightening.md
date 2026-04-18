# Sprint 17 — Proof Layer Tightening Review

## Problemas encontrados

- a proof summary estava começando a parecer “quatro boxes” com peso muito parecido
- `Support status` ainda estava competindo com sinais mais fortes como `Revenue now` e `Booked proof`
- badges repetidos em todos os cards secundários adicionavam ruído sem aumentar compreensão
- a camada de prova corria risco de parecer mais uma pequena grade de KPIs do que uma leitura executiva curta
- havia sinais corretos, mas nem todos mereciam o mesmo protagonismo comercial

## Ajustes aplicados

- reduzi o núcleo da proof layer para `3` sinais:
  - `Revenue now`
  - `Booked proof`
  - `Recent proof`
- removi `Support status` da fileira principal de sinais
- rebaixei `support status` para o bloco de `Commercial safeguard`
- movi `freshness` para contexto de confiança no fechamento, em vez de tratá-lo como KPI
- removi badges redundantes dos cards secundários
- deixei a hierarchy mais clara:
  - `Revenue now` como hero signal
  - `Booked proof` e `Recent proof` como validação curta
  - `Commercial safeguard + freshness` como camada de confiança e honestidade

## Sinais mantidos

- `Revenue now`
  - continua sendo o sinal principal
  - é o melhor número para buyer e pricing defense

- `Booked proof`
  - continua porque ancora o read em prova real
  - ajuda a evitar leitura de “revenue solta”

- `Recent proof`
  - ficou no lugar de continuidade curta
  - mantém defesa de repetição sem virar analytics profunda

- `Commercial safeguard`
  - continua como framing de confiança
  - importante para honesty e anti-oversell

- `Freshness`
  - continua, mas rebaixado
  - serve para confiança no snapshot, não para competir como KPI principal

## Sinais removidos ou rebaixados

- `Support status`
  - saiu da linha principal de sinais
  - continuou no safeguard
  - motivo: é importante para confiança, mas não é sinal principal de valor

- badges de `Visible` nos cards secundários
  - removidos
  - motivo: ruído visual maior do que ganho de leitura

- excesso de equivalência visual entre todos os cards
  - reduzido
  - motivo: a summary precisava parecer leitura executiva, não mini-grid de métricas

## Como a proof layer ficou mais forte

Ela ficou mais forte porque agora responde mais rápido à pergunta comercial certa:

- existe valor visível?
- esse valor está apoiado em booked proof?
- esse valor parece isolado ou já mostra alguma continuidade?

E deixa o resto no lugar certo:

- `support` como camada de confiança
- `freshness` como contexto de atualidade
- não como sinais competindo pelo mesmo protagonismo

O resultado é melhor para:

- compreensão em poucos segundos
- defesa comercial
- retenção visual
- product truth

## Veredito executivo

O tightening foi correto.

A proof layer ficou mais curta, mais legível e mais comercialmente forte sem inflar KPI nem escorregar para BI. O resumo agora parece mais uma peça executiva de prova e menos uma grade de sinais tentando justificar seu próprio espaço.
