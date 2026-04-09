# Sprint 10 — Etapa 4 Review

## Objetivo da etapa
Refatorar a superfície de `Booking Inputs` para deixá-la mais clara, mais hierárquica, menos repetitiva e menos ambígua, reforçando que `booked proof` é a lane principal e `lead base` é apenas suporte secundário.

## Diagnóstico da surface anterior
A surface anterior já seguia a tese correta do produto, mas ainda tinha quatro fragilidades práticas:

- `Booked proof` e `Lead base` apareciam próximos demais em peso visual
- as duas lanes ainda podiam ser confundidas no uso real
- alguns CTAs e labels eram corretos, porém pouco distintos
- a linguagem da tela ainda tinha um acabamento mais operacional do que o restante do shell

Na prática, a página explicava a hierarquia certa, mas ainda não a impunha com clareza suficiente no momento de uso.

## Mudanças realizadas
- A hero da tela foi reenquadrada para enfatizar `proof first`.
- Os chips do topo agora reforçam a ordem real:
  - `Proof first`
  - `Lead support optional` ou `Lead support live`
- O bloco lateral passou de um framing mais genérico para `Input snapshot`.
- Os quick states foram renomeados para reduzir ambiguidade:
  - `Lead base` virou `Lead base support`
  - `Revenue read` virou `Revenue view`
- `Booked proof` ganhou framing mais forte como lane principal.
- `Lead base` ganhou framing explícito como lane secundária.
- A grid das duas lanes agora começa com dois blocos curtos de orientação:
  - `Primary lane`
  - `Secondary lane`
- O card de appointments ganhou cromia e hierarchy de lane principal.
- O card de clients foi deliberadamente rebaixado para parecer apoio, não centro do sistema.
- Os CTAs dos cards ficaram mais distintos:
  - `Get proof template`
  - `Get support template`
- O input principal ficou mais concreto:
  - `Upload booked appointments file`
  - `Upload lead-base support file`
- O apoio de footer do card agora reforça melhor a lógica correta:
  - proof antes de revenue
  - lead base apenas quando necessário
- A decision-support layer da página foi suavizada para não repetir wording de “support” em excesso.

## Arquivos alterados
- [C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\imports\page.tsx](C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\imports\page.tsx)
- [C:\Users\hriqu\Documents\revory-mvp\components\imports\ImportsFlowGrid.tsx](C:\Users\hriqu\Documents\revory-mvp\components\imports\ImportsFlowGrid.tsx)
- [C:\Users\hriqu\Documents\revory-mvp\components\imports\CsvUploadCard.tsx](C:\Users\hriqu\Documents\revory-mvp\components\imports\CsvUploadCard.tsx)
- [C:\Users\hriqu\Documents\revory-mvp\services\decision-support\build-import-decision-support.ts](C:\Users\hriqu\Documents\revory-mvp\services\decision-support\build-import-decision-support.ts)

## Por que reduz confusão
- A tela agora deixa mais explícito que o primeiro upload certo é o de appointments.
- `Lead base` deixou de competir perceptivamente com `Booked proof`.
- Os cards não parecem mais duas entradas equivalentes do mesmo peso.
- A distinção entre template, upload e função da lane ficou mais forte sem abrir workflow novo.

## Impacto em UX
- O usuário entende mais rápido onde começar.
- O risco de importar no lugar errado cai porque a UI não trata mais as duas lanes como quase simétricas.
- O fluxo fica menos repetitivo visualmente mesmo sem adicionar mais chrome.

## Impacto em valor percebido
- A surface passa a parecer mais conectada a booked appointments e revenue, e menos a um import manager genérico.
- A percepção de produto narrow melhora porque a tela agora reforça melhor a lógica central do Seller.

## Impacto em prontidão para venda
- A página fica mais demo-friendly e menos sujeita a interpretação errada durante uma primeira navegação.
- O produto parece mais maduro porque a hierarquia operacional está mais silenciosa e mais óbvia ao mesmo tempo.

## Riscos remanescentes
- `Booking Inputs` ainda é uma das superfícies mais densas do produto, então continua exigindo disciplina futura para não crescer demais.
- A lane secundária já está mais rebaixada, mas ainda precisa continuar claramente subordinada nas próximas etapas para não reintroduzir ambiguidade.
- A experiência de import continua relativamente rica para um MVP narrow; ela está mais clara, mas segue sendo uma área sensível para excesso de detalhe.

## Julgamento final da etapa
Etapa aprovada.

`Booking Inputs` agora comunica melhor a ação correta, reduz a confusão entre `booked proof` e `lead base`, e se aproxima mais do acabamento premium do restante do app sem virar workflow mais complexo.
