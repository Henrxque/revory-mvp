# REVORY Seller — Plan Integrity QA + Final Sprint Validation

> Atualizacao de direcao: este documento foi superado pela correcao `revory-seller-plan-direction-correction-basic-growth-premium.md`. A leitura atual dos planos e: Basic publico e limitado, Growth completo e principal, Premium futuro/indisponivel.

## 1. Leitura geral do estado final da short sprint

### O que parece resolvido

- `Growth` agora e tratado como o plano principal real.
- `Basic` saiu da vitrine principal e nao compete mais visualmente com Growth.
- `Premium` nao abre checkout direto pela UI e agora usa um CTA manual real via `mailto:`.
- A rota antiga `/api/billing/checkout?plan=basic` nao cria checkout e redireciona para fit messaging.
- A rota antiga `/api/billing/checkout?plan=premium` nao cria checkout e redireciona para fit messaging.
- A landing publica nao mostra mais card Basic como tier comparavel.
- A landing publica usa `Premium` como `Manual Fit`, com CTA de email.
- A pricing UI autenticada passou a puxar copy central de plano do catalogo interno para labels, fit labels, CTAs e framing.
- Nenhum sistema artificial de quotas, limits ou entitlements foi criado.

### O que parece ainda parcial

- Stripe runtime ainda considera Basic e Premium obrigatorios para dizer que billing esta configurado, mesmo depois de Growth virar o unico checkout self-service.
- A landing HTML continua sendo uma fonte estatica separada; esta alinhada hoje, mas ainda pode driftar no futuro.
- Basic ainda tem um link "Ask about Basic fit" que leva a `/start?billing=basic-fit&plan=basic`, nao a um contato direto. Isso e menos grave porque Basic foi rebaixado, mas ainda e semanticamente imperfeito.

### O que parece mais bonito no papel do que na pratica

- A "unificacao" nao e total: o catalogo interno agora alimenta `/start`, mas nao alimenta a landing estatica.
- `Premium` ainda existe tecnicamente como `planKey`, price ID e badge, mas continua sem entrega operacional superior. A sprint corrigiu a comunicacao, nao a diferenca de produto.
- `Basic` continua tecnicamente possivel e pode acessar o core inteiro se ativado manualmente. A sprint corrigiu a vitrine, nao criou enforcement.

## 2. Fluxos e áreas validadas

- Strategy / packaging: documentos da sprint e estado atual do codigo.
- Pricing UI: `src/app/start/page.tsx`.
- Landing pricing: `src/content/revory-landing-reference.html`.
- CTAs: Growth, Basic, Premium.
- Basic: visibilidade, copy, rota antiga de checkout e nota publica.
- Growth: hierarquia, checkout self-service e copy de plano principal.
- Premium: CTA manual, mailto, copy e rota antiga de checkout.
- Catalogo interno: `services/billing/workspace-billing.ts`.
- Shell / badges / messaging: `src/app/(app)/app/layout.tsx`.
- Billing route: `src/app/api/billing/checkout/route.ts`.
- Stripe runtime: `services/billing/stripe-runtime.ts`.
- Sanity operacional: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run env:check`.

QA hands-on executado em `http://localhost:3050`:

- `/api/billing/checkout?plan=basic` retornou `307` para `/start?billing=basic-fit&plan=basic`.
- `/api/billing/checkout?plan=premium` retornou `307` para `/start?billing=premium-fit&plan=premium`.
- `/api/billing/checkout?plan=growth` retornou `307` para sign-up com redirect de checkout Growth.
- `/start?billing=basic-fit&plan=basic` redireciona usuario nao autenticado para sign-up preservando o redirect.
- `/start?billing=premium-fit&plan=premium` redireciona usuario nao autenticado para sign-up preservando o redirect.
- `/` carregou com pricing publico sem card Basic, com Growth como plano principal e Premium com `mailto:`.

## 3. Bugs críticos encontrados

Nenhum bug critico encontrado.

Nao encontrei:

- Premium abrindo checkout direto pela UI publica.
- Premium abrindo checkout direto pela rota antiga.
- Basic abrindo checkout direto pela rota antiga.
- Basic como card principal na landing.
- Basic como card principal na pricing UI autenticada.
- Claim ativo de volume/capacidade que o produto nao aplica.
- Build quebrado.
- Typecheck quebrado.
- Lint quebrado.
- Env check quebrado.

## 4. Bugs médios encontrados

### Stripe config ainda exige price IDs de planos nao self-service

- Severidade: media
- Onde acontece: `services/billing/stripe-runtime.ts`
- Como reproduzir: configurar somente `STRIPE_SECRET_KEY` e `STRIPE_GROWTH_PRICE_ID`, deixando `STRIPE_BASIC_PRICE_ID` e `STRIPE_PREMIUM_PRICE_ID` vazios; chamar qualquer fluxo que dependa de `isStripeBillingConfigured()`.
- Comportamento esperado: depois da sprint, Growth e o unico checkout self-service; portanto Growth checkout deveria depender de secret key + Growth price ID, nao de Basic/Premium.
- Comportamento atual: `isStripeBillingConfigured()` exige `priceIdsByPlan.BASIC`, `priceIdsByPlan.GROWTH` e `priceIdsByPlan.PREMIUM`.
- Impacto: pode bloquear o checkout Growth em ambiente real se a configuracao seguir a nova estrategia de packaging e nao criar price IDs ativos para Basic/Premium.
- Causa provavel: billing foundation ainda reflete a estrutura antiga de tres planos self-service.
- Recomendacao: corrigir agora, de forma cirurgica, separando `isStripeBillingConfigured()` para Growth checkout de uma eventual validacao completa de todos os price IDs.

## 5. Problemas pequenos, mas perigosos para confiança comercial

### Basic ainda usa "Ask" sem abrir contato real

- Severidade: pequena
- Onde acontece: `src/app/start/page.tsx` e `src/content/revory-landing-reference.html`
- Como reproduzir: clicar em `Ask about Basic fit` na landing ou na nota de Basic.
- Comportamento esperado: por usar "Ask", o CTA deveria abrir email, formulario curto ou outra acao clara de contato.
- Comportamento atual: o link vai para `/start?billing=basic-fit&plan=basic`; usuario anonimo cai em sign-up antes de ver a mensagem.
- Impacto: baixo no core, mas pode parecer affordance meio falsa. Basic foi rebaixado, entao o dano e contido, mas ainda e um micro risco de confianca.
- Causa provavel: Basic foi rebaixado depois de ja existir fit messaging em `/start`.
- Recomendacao: corrigir depois ou em ajuste curto, idealmente trocando para `mailto:` como Premium ou mudando o label para algo menos ativo, como `See Basic fit note`.

### Landing ainda tem CTAs gerais antigos com "Start Your Booking Flow"

- Severidade: pequena
- Onde acontece: `src/content/revory-landing-reference.html`
- Como reproduzir: revisar nav, hero e CTA final da landing.
- Comportamento esperado: a linguagem principal poderia estar totalmente alinhada a `Start with Growth`.
- Comportamento atual: CTAs gerais ainda dizem `Start Your Booking Flow`, embora apontem para `/start?plan=growth`.
- Impacto: baixo. Nao e promessa falsa, porque ainda leva ao plano correto. Mas cria pequeno drift de label entre catalogo e landing.
- Causa provavel: landing e HTML estatico e nao consome o catalogo interno.
- Recomendacao: corrigir depois se quiser consistencia total de GTM copy. Nao e bloqueador.

### Docs historicos da sprint ficaram parcialmente superados

- Severidade: pequena
- Onde acontece: docs intermediarios da sprint, especialmente etapa de pricing UI antes do rebalance final de Basic/Premium.
- Como reproduzir: comparar `revory-seller-pricing-ui-packaging-hardening.md` com o estado final atual.
- Comportamento esperado: docs intermediarios podem ser historicos, mas o leitor precisa saber qual e a fonte final.
- Comportamento atual: docs anteriores ainda descrevem Basic como card seletivo lateral e Premium como `Check Premium fit`, antes dos ajustes finais.
- Impacto: baixo no produto, medio se alguem usar doc antiga como referencia comercial.
- Causa provavel: sprint incremental.
- Recomendacao: usar este review final como fonte consolidada da short sprint.

## 6. O que a sprint resolveu de verdade

- Growth ficou realmente mais protegido como plano principal.
- Basic parou de corroer o posicionamento na vitrine principal.
- Premium deixou de ser checkout publico direto.
- A rota antiga de checkout Basic/Premium foi protegida.
- A landing publica ficou mais honesta.
- A pricing UI autenticada ficou mais coerente.
- O catalogo interno passou a alimentar a pricing UI em pontos criticos.
- O shell in-app e a pricing UI ficaram mais proximos semanticamente.
- Claims de volume/capacidade sem enforcement foram removidos das surfaces principais.
- O produto parou de se apresentar como uma tabela SaaS generica de tres tiers funcionais.

Ganho real:

- a sprint nao criou plan integrity funcional completa, mas corrigiu a integridade comercial e semantica do packaging atual.

## 7. O que ainda está parcial ou preocupante

### Riscos residuais

- `Basic` e `Premium` ainda existem tecnicamente e podem receber o core inteiro se ativados manualmente.
- `Premium` ainda nao entrega produto superior; agora isso esta melhor comunicado, mas continua verdade operacional.
- `Basic` ainda nao tem enforcement de limite; agora esta escondido/rebaixado, mas continua tecnicamente possivel.

### Drift residual

- Landing estatica ainda pode driftar do catalogo TypeScript no futuro.
- Precos e bullets de pricing ainda ficam fora do catalogo.
- CTAs gerais da landing ainda usam `Start Your Booking Flow`, nao `Start with Growth`.

### Pontos ainda não íntegros

- Nao existe entitlement por plano.
- Nao existe quota.
- Nao existe upgrade/downgrade nativo.
- Nao existe plano Premium operacionalmente diferenciado.
- Nao existe Basic tecnicamente limitado.

### Dependencias de Stripe ou decisao futura

- Growth checkout real ainda depende de Stripe env real.
- A funcao `isStripeBillingConfigured()` ainda precisa ser atualizada para a nova realidade Growth-only self-service.
- Se Premium for vendido manualmente no futuro, sera preciso decidir como criar/atribuir assinatura Premium sem reabrir checkout publico.

## 8. Veredito final da short sprint

### A sprint foi aprovada ou não?

Aprovada com ressalva.

### Growth agora está bem tratado como plano principal?

Sim.

Growth e dominante na pricing UI, e o unico caminho de checkout self-service. A landing tambem aponta os CTAs principais para Growth.

### Basic parou de corroer o posicionamento?

Sim, na surface principal.

Basic saiu dos cards, perdeu status de plano publico e ficou como nota discreta de fit. Ainda existe um pequeno ajuste recomendado no CTA `Ask about Basic fit`, mas o dano comercial principal foi resolvido.

### Premium ficou coerente com fit/manual?

Sim.

Premium agora usa `Manual fit`, CTA de email e rota antiga protegida contra checkout. Isso esta coerente com a entrega atual.

### Pricing e CTAs ficaram íntegros?

Quase.

Os CTAs principais estao corretos:

- Growth: checkout/self-service
- Premium: email/manual fit
- Basic: nao checkout

Ressalva:

- Basic ainda usa linguagem de `Ask` sem abrir contato real.
- Stripe config ainda esta desalinhado com Growth-only self-service.

### Ainda existe risco real de vender tiering fake?

Baixo nas surfaces principais.

O risco caiu muito. Hoje o maior risco nao e mais a UI vender fake tiering, e sim uma operacao futura reativar Basic/Premium como checkout publico sem criar product truth correspondente.

### O que seria o próximo passo recomendado?

Proximo passo cirurgico:

1. Ajustar `isStripeBillingConfigured()` para refletir Growth-only checkout self-service.
2. Trocar `Ask about Basic fit` para email ou rebaixar label para `See Basic fit note`.
3. Declarar este review final como fonte consolidada da short sprint.

Nao recomendo criar entitlements agora.

## 9. Status executivo final

**Aprovado com ressalva.**

Por que:

- A sprint resolveu o problema principal de packaging fake na camada comercial.
- Growth agora esta corretamente posicionado.
- Basic foi rebaixado de verdade.
- Premium ficou manual-fit e nao checkout publico.
- As rotas antigas de checkout Basic/Premium estao protegidas.
- Build, lint, typecheck e env check passaram.

Ressalva brutal:

- o runtime Stripe ainda carrega a premissa antiga de tres planos configurados para checkout.
- Basic ainda tem uma micro affordance imperfeita.
- a landing estatica continua sendo ponto potencial de drift.

Nada disso invalida a sprint. Mas impede dizer que plan integrity esta 100% madura. O estado correto e: comercialmente alinhado, tecnicamente seguro no gating binario, ainda parcial em billing config e operacao futura de planos seletivos.
