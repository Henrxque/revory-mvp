# REVORY Seller — Final Packaging Cleanup

> Atualizacao de direcao: este cleanup foi superado pela correcao `revory-seller-plan-direction-correction-basic-growth-premium.md`. A leitura atual dos planos e: Basic publico e limitado, Growth completo e principal, Premium futuro/indisponivel.

## 1. Pendências reproduzidas

- Stripe runtime ainda usava a premissa antiga de tres planos publicos de checkout, exigindo `STRIPE_BASIC_PRICE_ID`, `STRIPE_GROWTH_PRICE_ID` e `STRIPE_PREMIUM_PRICE_ID` para considerar billing configurado.
- Basic ainda tinha uma affordance imperfeita: `Ask about Basic fit` apontava para `/start?billing=basic-fit&plan=basic`, o que preservava uma mensagem de fit, mas nao abria contato real.
- A sprint tinha documentos intermediarios parcialmente superados, sem uma declaracao explicita de qual review deveria ser usado como fonte consolidada final.

## 2. Ajuste do Stripe runtime

### Problema real

Depois do hardening de packaging, `Growth` virou o unico checkout self-service publico. Mesmo assim, `isStripeBillingConfigured()` ainda exigia price IDs de `Basic` e `Premium`, o que poderia bloquear checkout Growth em um ambiente configurado de forma correta para a estrategia atual.

### Arquivos alterados

- `services/billing/stripe-runtime.ts`

### Solução aplicada

- `isStripeBillingConfigured()` passou a exigir apenas `STRIPE_SECRET_KEY` e `STRIPE_GROWTH_PRICE_ID`.
- `Basic` e `Premium` continuam existindo tecnicamente como `planKey` e como possiveis caminhos futuros/manuais, mas deixaram de ser obrigatorios para readiness do checkout publico.
- A rota de checkout continua protegendo `Basic` e `Premium` antes de qualquer chamada de Stripe.

### Validação final

- A readiness de billing agora reflete Growth-only self-service.
- A mudanca nao cria checkout publico para Basic ou Premium.
- A mudanca nao remove os planos tecnicos nem bloqueia uso futuro controlado.

## 3. Ajuste da affordance do Basic

### Problema real

O label `Ask about Basic fit` comunicava uma acao de contato, mas o clique levava para `/start?billing=basic-fit&plan=basic`. Isso era pequeno, mas semanticamente imperfeito para confianca comercial.

### Arquivos alterados

- `services/billing/workspace-billing.ts`
- `src/app/start/page.tsx`
- `src/content/revory-landing-reference.html`

### Solução aplicada

- O CTA do Basic passou para `Request Basic fit review`.
- A affordance do Basic agora aponta para `mailto:hello@revory.com?subject=REVORY%20Basic%20fit%20review`.
- A mensagem legacy de `/start?billing=basic-fit&plan=basic` foi mantida e apertada para explicar que Basic nao e checkout direto nem feature-lite.

### Validação final

- Basic continua fora da vitrine principal.
- Basic nao virou checkout publico.
- A affordance agora faz o que comunica: abre contato real para fit review.

## 4. Consolidação documental

### Qual documento passa a ser a fonte final

- Fonte consolidada da short sprint: `docs/reviews/revory-seller-plan-integrity-final-sprint-validation.md`.
- Addendum de fechamento das ressalvas: `docs/reviews/revory-seller-final-packaging-cleanup.md`.

### Como os docs intermediários devem ser tratados

- Os documentos das etapas 1-5 continuam uteis como trilha historica de decisao.
- Eles nao devem ser usados como fonte final de packaging, porque partes deles foram superadas pelos ajustes finais de Basic, Premium, pricing UI e runtime Stripe.

### O que foi ajustado/documentado

- O review final da sprint recebeu uma nota explicita de fonte consolidada.
- Este addendum documenta as tres pendencias fechadas e o estado final pos-cleanup.

## 5. Validação final consolidada

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run env:check`: passou.
- Source check do Stripe runtime: passou, com `isStripeBillingConfigured()` dependendo de `STRIPE_SECRET_KEY` + `STRIPE_GROWTH_PRICE_ID`.
- Source check da rota de checkout: passou, com Basic/Premium ainda bloqueados antes de qualquer chamada de Stripe e Growth ainda usando price ID de Stripe.
- Source check do Basic: passou, com CTA de Basic em `mailto:` na pricing UI autenticada e na landing estatica.
- Source check documental: passou, com `revory-seller-plan-integrity-final-sprint-validation.md` marcado como fonte consolidada e este arquivo referenciado como addendum de fechamento.

## 6. Veredito executivo

As tres pendencias residuais foram resolvidas em escopo cirurgico.

A short sprint agora pode ser considerada fechada do ponto de vista de packaging final: Growth e o unico self-service checkout, Basic nao compete como plano publico, Premium continua manual-fit, e a documentacao deixa claro qual e a fonte consolidada.

Pendencia residual real: nenhuma pendencia de packaging final ficou aberta. O que ainda nao existe continua intencionalmente fora: entitlement engine, quotas por plano, Premium operacionalmente diferenciado e checkout publico de Basic/Premium.
