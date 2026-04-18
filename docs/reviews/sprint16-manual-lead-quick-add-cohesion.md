# Sprint 16 — Manual Lead Quick Add Cohesion Review

## Problema de coesão

O `Manual Lead Quick Add` já criava a `LeadBookingOpportunity`, mas ainda corria o risco de terminar como uma entrada isolada. O usuário adicionava o lead, via um sucesso curto, e precisava descobrir sozinho onde aquele item aparecia dentro da `booking assistance`.

Esse gap era perigoso por dois motivos:

- enfraquecia a sensação de continuidade do trilho curto
- deixava a feature mais parecida com cadastro do que com ação operacional imediata

## Solução implementada

A coesão foi resolvida dentro da própria surface existente de `booking assistance`, sem abrir fluxo paralelo.

Após a criação manual:

- o quick add grava o `opportunityId` retornado pela action
- a URL recebe um anchor para a oportunidade criada
- a lista prioritária detecta esse foco
- a oportunidade entra em scroll suave e highlight discreto
- o card passa a mostrar `Current focus`

Também foi ajustada a copy ao redor da surface para deixar explícito que `Quick add` cai de volta no mesmo `booking read`, e não em um workflow novo.

## Fluxo pós-criação

1. O usuário abre `Quick add`.
2. Preenche `Lead name` e pelo menos `Email` ou `Phone`.
3. A action cria ou reaproveita `Client` e `LeadBookingOpportunity`.
4. O modal fecha.
5. A página faz refresh da leitura atual.
6. A oportunidade recém-criada vira o foco da `Priority booking list`.
7. O usuário já encontra, no mesmo card:
   - `status`
   - `readiness`
   - `blocked reason`, quando existir
   - `Next step`
   - `Action Pack`, quando aplicável

Na prática, o quick add deixou de ser “adicionar lead” e passou a ser “inserir um lead direto no booking read atual”.

## Arquivos alterados

- [components/lead-booking/ManualLeadQuickAdd.tsx](C:/Users/hriqu/Documents/revory-mvp/components/lead-booking/ManualLeadQuickAdd.tsx)
- [components/lead-booking/LeadBookingOpportunityList.tsx](C:/Users/hriqu/Documents/revory-mvp/components/lead-booking/LeadBookingOpportunityList.tsx)
- [src/app/(app)/app/imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)
- [src/app/(app)/app/imports/manual-lead-actions.ts](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/manual-lead-actions.ts)

## Trade-offs

- O foco pós-criação usa `hash + highlight`, não estado global mais pesado. Isso mantém a solução simples e narrow, mas o destaque continua deliberadamente leve.
- A continuidade acontece dentro da lista curta já existente. Isso é correto para o produto, mas também significa que o quick add continua dependente da qualidade dessa surface curta.
- Não foi criada camada de “recém-criado” persistente nem timeline de atividade. Isso evita CRM-by-accident, mas também mantém a prova de continuidade bem mínima.

## Veredito executivo

O quick add agora está coerente com o resto do produto.

Ele não termina mais como cadastro isolado. Ele entra no mesmo trilho de `booking assistance`, `readiness`, `next step` e `Action Pack`, com continuidade imediata e sem abrir escopo errado.

O resultado ficou mais narrow, mais premium e mais útil. A feature agora lê como `quick action into today’s booking read`, que é exatamente a forma certa para o REVORY Seller.
