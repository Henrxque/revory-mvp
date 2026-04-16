# Sprint 13 — Etapa 6 Adjusted Review

## 1. Objetivo do ajuste

Este ajuste precisava corrigir um ponto de semântica e clareza:

- o tracking mínimo do lead estava usando `HANDOFF_OPENED`
- mas o campo persistido ainda se chamava `handoffPreparedAt`

Isso importava porque a camada precisava continuar honesta.

Se o produto registra o momento em que o usuário realmente aciona o handoff, o nome do campo precisa refletir isso.
Se o nome do campo sugere apenas preparação, enquanto a UI fala em abertura, a leitura fica ambígua.

## 2. Problema semântico identificado

O problema central era a diferença entre:

- `prepared`
- `opened`

No comportamento atual do produto:

- o registro acontece no clique real que abre o canal de handoff
- portanto o produto não está apenas preparando o handoff
- ele está registrando que o handoff foi aberto

O risco disso antes do ajuste era:

- oversell semântico
- leitura ambígua sobre o que realmente aconteceu
- UI sugerindo um tipo de prova enquanto o banco registrava outra coisa

Também existia um segundo risco:

- o status principal da oportunidade
- e o estado auxiliar do lead

estavam começando a competir demais na UI, porque ambos apareciam como badges de peso parecido.

## 3. Decisão tomada

A abordagem escolhida foi a preferida:

- manter o estado auxiliar `HANDOFF_OPENED`
- renomear o campo persistido para `handoffOpenedAt`

Essa foi a decisão mais honesta porque ela bate exatamente com o comportamento real do produto:

- o timestamp agora registra abertura real do handoff
- o estado derivado continua refletindo abertura real do handoff

Isso mantém o tracking leve e semanticamente alinhado.

## 4. Mudanças realizadas

### backend

- renomeado o campo do schema para `handoffOpenedAt`
- atualizada a server action de handoff para gravar `handoffOpenedAt`
- atualizada a derivação de `lead state` para usar `handoffOpenedAt`
- atualizado o summary para `handoffsOpened`

### naming

- `handoffPreparedAt` -> `handoffOpenedAt`
- a leitura agregada deixou de usar `touched` e passou a usar `handoffs opened`

### UI / surface

- o estado auxiliar do lead deixou de competir como badge no mesmo nível do status principal
- o status principal da oportunidade continua sendo o badge principal
- o sinal auxiliar passou a aparecer como texto curto e discreto:
  - `Seller signal: Handoff opened on ...`

Isso reduz bastante a sensação de “dois sistemas de status” brigando entre si.

### schema

- houve ajuste de schema mínimo para renomear o campo
- a migration de alinhamento foi adicionada em [migration.sql](C:/Users/hriqu/Documents/revory-mvp/prisma/migrations/20260415000200_sprint_13_handoff_opened_alignment/migration.sql)

## 5. Impacto em product honesty

Sim, o modelo ficou mais honesto.

Sim, a ambiguidade foi reduzida.

Sim, a camada agora evita sugerir algo diferente do que realmente existe.

Depois do ajuste:

- `HANDOFF_OPENED` significa abertura real do handoff
- `handoffOpenedAt` registra exatamente esse momento

O modelo agora fala a mesma língua no:

- banco
- backend
- estado derivado
- UI

## 6. Impacto em UI clarity

Sim, a UI ficou menos confusa.

A leitura auxiliar ficou melhor posicionada porque:

- não aparece mais como badge no mesmo peso do status principal
- aparece como sinal discreto de participação do Seller

Isso reduz competição visual e deixa mais claro:

- status principal = estado da oportunidade
- sinal auxiliar = participação mínima já ocorrida

O resultado é uma surface mais narrow e menos parecida com mini-CRM.

## 7. Julgamento final

`Aprovado`.

O ajuste foi o menor necessário e corrigiu o ponto certo:

- semântica alinhada
- naming alinhado
- UI mais clara
- sem escopo novo
- sem tracking pesado

Resumo final:

- o tracking mínimo continua existindo
- agora ele está semanticamente correto
- e a UI deixa isso mais claro sem inflar o produto
