# REVORY Seller — Manual Lead Quick Add Implementation

## O que foi implementado

Foi implementada a surface funcional do `Manual Lead Quick Add` dentro da própria `booking assistance` em `/app/imports`.

A feature agora permite:

- abrir uma surface curta de quick add
- informar:
  - `Lead name`
  - `Email`
  - `Phone`
  - `Source label` opcional
- validar o preenchimento mínimo
- criar ou reutilizar `Client`
- criar ou atualizar `LeadBookingOpportunity`
- herdar automaticamente:
  - `main offer`
  - `booking path`
  - contexto do workspace
- revalidar a página e fazer a nova oportunidade aparecer na leitura atual

Também foram preservados os guardrails do produto:

- sem CRM
- sem inbox
- sem tabela de leads
- sem área separada de gestão contínua
- sem override manual de `main offer` ou `booking path`

## Arquivos alterados

- [components/lead-booking/ManualLeadQuickAdd.tsx](C:/Users/hriqu/Documents/revory-mvp/components/lead-booking/ManualLeadQuickAdd.tsx)
- [services/lead-booking/create-manual-lead-booking-opportunity.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/create-manual-lead-booking-opportunity.ts)
- [src/app/(app)/app/imports/manual-lead-actions.ts](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/manual-lead-actions.ts)
- [src/app/(app)/app/imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)

## Decisões de UX

- a entrada foi implementada dentro da própria `booking assistance`
  - isso mantém a feature contextual
  - evita sugerir módulo novo de leads
- a surface escolhida foi um `modal compacto`
  - mais premium e discreto do que um form permanente
  - menos propenso a parecer tela de gestão
- os campos ficaram no mínimo correto:
  - `name`
  - `email`
  - `phone`
  - `source label` opcional
- `main offer` e `booking path` aparecem como contexto herdado, mas não são editáveis
  - isso reforça o modelo narrow
  - evita exceções por lead
- o feedback de sucesso ficou curto e sem exagero:
  - a modal fecha
  - a página refresca
  - a UI mostra a confirmação curta

## Validações

Validações implementadas:

- `Lead name` obrigatório
- pelo menos um entre `email` ou `phone`
- deduplicação por identidade existente:
  - tenta casar por `email`
  - tenta casar por `phone`
- conflito entre `email` e `phone` apontando para clientes diferentes retorna erro explícito

Comportamento de criação:

- se já existir `Client`, ele é reutilizado e atualizado
- se não existir, um novo `Client` é criado
- a `LeadBookingOpportunity` é criada ou atualizada usando a mesma lógica de readiness já existente

Validação técnica:

- `npm run typecheck` passou
- `npm run build` passou

## Trade-offs

- o quick add reaproveita o modelo de `Client`, não cria um objeto separado de lead
  - isso é o certo para narrowness
  - mas significa que quick add manual já entra direto no modelo principal
- se o usuário quick-add um cliente já existente vindo de import, a implementação preserva a origem da oportunidade existente
  - isso evita sobrescrever contexto útil com `Manual quick add`
- a feature depende de `router.refresh()` para refletir imediatamente a nova oportunidade
  - isso é simples e suficiente agora
  - mas não é uma experiência “live” no sentido mais avançado
- a validação de phone ficou propositalmente leve
  - evita inflar o form
  - aceita alguma imperfeição de dado em troca de baixa fricção

## Resultado executivo

O `Manual Lead Quick Add` agora existe como feature real, funcional e compatível com o produto atual.

O resultado final está alinhado ao que a Sprint 16 precisava:

- reduz fricção de entrada
- deixa o produto parecer mais vivo
- reduz dependência absoluta de import-first
- mantém a experiência curta e executiva
- não abre CRM, inbox ou gestão contínua de leads

Leitura honesta:

a feature ficou suficientemente funcional e narrow para entrar no REVORY Seller sem quebrar solo-fit. O principal cuidado daqui para frente é não começar a adicionar campos, filtros ou estados que transformem esse quick add em porta de entrada para um módulo de lead management.
