# Sprint 18 — Badge, Label And Microcopy Rebalance

## Ruidos encontrados

- alguns badges repetiam o que o proprio bloco ja comunicava
- havia pequenos sinais perifericos que adicionavam densidade visual sem aumentar clareza
- alguns contextos podiam ser mostrados como texto silencioso, mas ainda estavam em formato de badge
- a soma desses detalhes deixava certas surfaces um pouco mais “marcadas” do que o necessario

## Ajustes aplicados

- removi badges redundantes do `Daily Booking Brief` em [components/briefs/DailyBookingBrief.tsx](C:\Users\hriqu\Documents\revory-mvp\components\briefs\DailyBookingBrief.tsx)
- removi o badge `Core read` do hero da proof summary e reduzi repeticao de freshness em [components/proof/ExecutiveProofSummaryCard.tsx](C:\Users\hriqu\Documents\revory-mvp\components\proof\ExecutiveProofSummaryCard.tsx)
- troquei badges de contexto do `Quick add` por texto mais silencioso em [components/lead-booking/ManualLeadQuickAdd.tsx](C:\Users\hriqu\Documents\revory-mvp\components\lead-booking\ManualLeadQuickAdd.tsx)
- retirei badges perifericos da `booking assistance` em [src/app/(app)/app/imports/page.tsx](C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\imports\page.tsx)

## Itens removidos ou rebaixados

- removidos:
  - `Short daily read`
  - `Current`
  - `Latest`
  - `Core read`
  - `Bounded assist`
  - `Bounded proof`

- rebaixados:
  - contexto de `main offer` + `booking path` no quick add saiu de badge para texto curto
  - feedback `Read updated` no quick add saiu de badge para sinal textual mais leve
  - freshness deixou de aparecer duas vezes no footer da proof summary

## Como isso melhora maturidade percebida

- o app fica menos “anotado demais”
- os sinais fortes continuam claros, mas os sinais secundarios deixam de competir
- a leitura parece mais premium porque depende mais de hierarchy e menos de marcadores extras
- a UI comunica mais confianca quando para de sublinhar o obvio o tempo inteiro

## Veredito executivo

Esse rebalance foi pequeno, mas importante.

Nao aumentou signal density. Fez o oposto.

O produto ficou:

- mais maduro
- mais silencioso
- mais claro
- menos propenso a theater visual

Veredito: `aprovado`.
