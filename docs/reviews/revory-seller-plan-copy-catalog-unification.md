# REVORY Seller - Plan Copy Catalog Unification

## Divergencias encontradas

- A pricing UI em `/start` repetia labels que ja existiam no catalogo interno de billing.
- `ctaLabel`, `fitLabel`, `label` e `framing` estavam duplicados entre `src/app/start/page.tsx` e `services/billing/workspace-billing.ts`.
- O shell in-app ja lia `billingSummary.plan.inAppSignal`, mas a pricing UI nao usava a mesma fonte de verdade para os textos principais.
- Alguns `supportPoints` do catalogo ainda carregavam linguagem de "room/headroom" que podia soar como diferenciacao operacional maior do que o produto sustenta.
- A landing HTML continua sendo uma surface estatica separada, o que ainda pode gerar drift se a copy for alterada somente no catalogo.

## Ajustes aplicados

- A `/start` agora importa `getBillingPlanDefinition`.
- A pricing UI passou a usar o catalogo interno para:
  - `label`
  - `fitLabel`
  - `ctaLabel`
  - `framing`
  - `valueSignal`
- Mantive local na pricing UI apenas o que ainda e especifico da surface:
  - preco exibido
  - `ctaHref`
  - bullets comerciais da vitrine
  - classes visuais
- Ajustei os `supportPoints` do catalogo para reduzir linguagem que sugeria tiering artificial.
- Mantive Growth como plano principal, Basic como caminho nao publico e Premium como manual-fit.
- A landing foi mantida alinhada manualmente com os mesmos conceitos criticos: Growth principal, Premium manual-fit, Basic fora da aquisicao publica.

Arquivos alterados:

- `src/app/start/page.tsx`
- `services/billing/workspace-billing.ts`
- `docs/reviews/revory-seller-plan-copy-catalog-unification.md`

Validacoes executadas:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Resultado:

- Todas passaram.

## O que ficou alinhado

- O shell in-app e a pricing UI agora compartilham o mesmo catalogo para linguagem central de plano.
- `Growth` usa o catalogo como `Main plan`.
- `Premium` usa o catalogo como `Manual fit`.
- `Basic` usa o catalogo como `Not public`.
- CTA label de Premium vem do catalogo: `Request Premium fit review`.
- CTA label de Growth vem do catalogo: `Start with Growth`.
- CTA label de Basic vem do catalogo: `Ask about Basic fit`.
- O texto de framing da pricing UI agora acompanha o mesmo framing usado pelo catalogo interno.
- O rodape da pricing UI usa `valueSignal` do Growth em vez de copy solta.

## O que ficou para depois

- A landing continua em `src/content/revory-landing-reference.html`, que e HTML estatico. Ela foi alinhada manualmente, mas ainda nao consome o catalogo TypeScript.
- Os precos ainda ficam na pricing UI/landing, nao no catalogo interno. Isso foi mantido de proposito para evitar refactor grande nesta etapa.
- Os bullets de pricing continuam locais, porque sao presentation copy da vitrine e nao entitlements.
- Nao foi criado sistema de entitlements.
- Nao foi criada tabela central de quotas, limites ou gates por plano.
- Nao foi criado refactor de CMS/content layer.

## Veredito executivo

A unificacao pragmatica foi aprovada.

O risco de drift caiu nas areas mais criticas: labels, fit labels, CTAs e framing principal agora saem do catalogo interno para a pricing UI autenticada e para o shell. A landing ainda exige disciplina manual, mas esta alinhada no conteudo atual.

Veredito final:

- consistencia melhorou
- refactor excessivo foi evitado
- fake entitlements nao foram introduzidos
- Growth, Basic e Premium agora falam a mesma lingua entre catalogo, shell e pricing UI
