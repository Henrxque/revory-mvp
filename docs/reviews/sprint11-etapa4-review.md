# Sprint 11 — Etapa 4 Review

## Objetivo da etapa

Reforçar a defesa do `Basic` sem baratear o produto, sem criar sensação de plano fraco e sem enfraquecer a hierarquia natural do `Growth`.

O objetivo era melhorar percepção e enquadramento, não inventar feature de preenchimento.

## Diagnóstico anterior

Antes desta etapa, o problema do `Basic` não era falta total de valor. O problema era de leitura.

O plano já ficava mais defensável quando visto junto do produto, mas no billing/start flow ainda podia parecer:

- plano menor demais
- versão mais apertada do produto
- escolha mais fraca por falta de enquadramento

Ao mesmo tempo, o `Growth` já aparecia corretamente como plano mais forte.

O risco era este:

- `Growth` parecer claramente premium
- `Basic` parecer apenas a sobra mais barata

Isso reduz defesa de entrada e enfraquece pricing perception logo no momento de compra.

## Mudanças realizadas

- O catálogo interno de planos ganhou framing centralizado.
- Cada plano agora tem:
  - `fitLabel`
  - `framing`
  - `supportPoints`
  - `ctaLabel`
- O `Basic` foi reenquadrado como:
  - `Premium entry`
  - `Lean core`
  - mesma espinha narrow do Seller, com menos headroom e não com menos identidade
- A página `/start` ganhou um bloco curto de `Plan read`, explicando que todos os planos compartilham o mesmo modelo narrow:
  - one offer
  - one booking path
  - booked proof first
  - revenue read second
- Os cards de plano deixaram de depender só de um subtítulo solto e passaram a mostrar:
  - sinal de fit
  - framing claro
  - três pontos de suporte curtos
- O `Growth` continuou com destaque de `Best fit`, preservando a hierarquia principal.
- O `Premium` continua como maior headroom, sem parecer outro produto.

## Arquivos alterados

- [C:\Users\hriqu\Documents\revory-mvp\types\billing.ts](C:\Users\hriqu\Documents\revory-mvp\types\billing.ts)
- [C:\Users\hriqu\Documents\revory-mvp\services\billing\workspace-billing.ts](C:\Users\hriqu\Documents\revory-mvp\services\billing\workspace-billing.ts)
- [C:\Users\hriqu\Documents\revory-mvp\src\app\start\page.tsx](C:\Users\hriqu\Documents\revory-mvp\src\app\start\page.tsx)

## Impacto em Basic defense

Esse foi o ganho principal da etapa.

O `Basic` agora aparece menos como “plano de baixo” e mais como:

- entrada premium
- Seller core mais contido
- escolha correta para quem tem volume menor e operação mais enxuta

Isso melhora a defesa porque o plano deixa de parecer amputado.

Ele passa a dizer:

- você entra pelo mesmo sistema narrow
- você não entra por uma versão rebaixada

Essa diferença é importante para justificar o ticket sem baratear a marca.

## Impacto em pricing perception

A percepção de preço melhora porque o plano passa a parecer mais intencional.

Antes:

- o preço podia ser lido como alto para um plano pequeno

Depois:

- o preço é mais facilmente lido como valor de entrada de um produto premium narrow

O produto não ficou mais barato em linguagem. Ficou mais coerente.

## Impacto em plan hierarchy

A hierarquia entre planos ficou melhor.

O `Basic`:

- ficou mais respeitável
- sem virar o plano principal

O `Growth`:

- segue claramente como a melhor escolha padrão
- ficou protegido de diluição

O `Premium`:

- continua acima
- sem parecer expansão artificial de escopo

Ou seja: a etapa fortaleceu o plano de entrada sem achatar a escada de valor.

## Riscos remanescentes

- O `Basic` continua dependente do estado real do produto; o framing melhorou, mas ele ainda não vira magicamente um plano ultra-blindado.
- O topo da escada continua mais exigente do que a profundidade atual do produto sustenta.
- A percepção de valor do `Basic` ainda vai depender de como a venda enquadra volume e necessidade de headroom.

## Julgamento final da etapa

Etapa aprovada.

Foi um ajuste de positioning interno, não de escopo.

O `Basic` agora ficou mais defensável porque:

- parece mais intencional
- parece menos apertado
- parece menos “versão menor”
- continua premium

E o mais importante: isso aconteceu sem enfraquecer o `Growth`, que segue como plano mais forte e mais vendável.

## Base de validação

- `npm run lint` passou
- `npm run typecheck` passou
- `npm run build` passou
