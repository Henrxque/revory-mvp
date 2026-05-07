# REVORY Seller — Plan Integrity Audit

## 1. Leitura geral do estado dos planos

- Os planos existem de verdade no modelo técnico: `BillingPlanKey` tem `BASIC`, `GROWTH` e `PREMIUM` em `prisma/schema.prisma`, e `Workspace` guarda `planKey`, `billingStatus`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `currentPeriodEnd` e `cancelAtPeriodEnd`.
- Existe catálogo interno de planos em `services/billing/workspace-billing.ts`, com labels, framing e sinais in-app para Basic, Growth e Premium.
- Existe pricing UI em `src/app/start/page.tsx`, com cards públicos para Basic, Growth e Premium.
- Existe integração Stripe preparada para checkout, portal e webhook em `src/app/api/billing/*` e `services/billing/*`.
- O sistema já trata billing como realidade para acesso ao app: se `billingStatus` não for `ACTIVE` ou se não houver `planKey`, o usuário não entra no app protegido.
- O sistema ainda não trata plano como entitlement real por feature. Depois que o workspace tem acesso ativo, Basic, Growth e Premium recebem essencialmente a mesma aplicação.
- Não existe plano `Pro` no estado atual do código. O tier superior implementado se chama `PREMIUM`.

Veredito geral:

- Billing foundation: real, funcional estruturalmente, mas dependente de env Stripe real.
- Plan modeling: existe.
- Plan differentiation: parcial/frágil.
- Feature gating por plano: não implementado.
- Risco principal: vender três planos como se entregassem diferenças operacionais reais quando o produto atualmente faz apenas gating binário de acesso.

## 2. Auditoria por plano

### Basic

#### Existe de verdade?

Sim.

Basic existe em:

- `BillingPlanKey.BASIC`
- `types/billing.ts`
- `services/billing/workspace-billing.ts`
- `src/app/start/page.tsx`
- `STRIPE_BASIC_PRICE_ID`

#### O que o usuário Basic recebe hoje?

Se o billing estiver ativo, o usuário Basic recebe acesso ao app protegido inteiro:

- setup/onboarding
- dashboard/revenue read
- Booking Inputs
- Daily Booking Brief
- Booking Assistance
- readiness e blocked reasons
- Manual Lead Quick Add
- Action Pack
- suggested message bounded
- Executive Proof Summary
- share/copy/print summary
- booking handoff
- app shell com badge Basic

#### O que está funcional?

- O plano pode ser selecionado na página `/start`.
- O checkout usa `plan=basic`.
- O workspace grava `planKey: BASIC` antes de abrir Stripe Checkout.
- O webhook/sync consegue mapear `stripePriceId` de volta para `BASIC`, se `STRIPE_BASIC_PRICE_ID` estiver configurado corretamente.
- O app mostra badge Basic no shell quando `planKey` é Basic.
- O acesso ao app funciona se `billingStatus` estiver `ACTIVE` e `planKey` existir.

#### O que está incompleto?

- Não existe limitação real de "Lower lead volume".
- Não existe limite real de volume, oportunidades, imports, handoffs, proof summaries, LLM usage ou workspace activity por Basic.
- Não existe gating que remova recursos de Basic.
- "Light async support" é promessa operacional/comercial, não uma capability implementada no produto.
- Basic recebe o mesmo core de Growth/Premium após ativação.

#### A UI e o gating estão coerentes?

Parcialmente.

- Coerente no sentido de que o card Basic leva a um checkout Basic e o app consegue mostrar "Basic".
- Não coerente se a intenção comercial for Basic como plano com menor volume/capacidade. O código não impõe isso.
- Existe risco de undersell/revenue leakage: Basic pode acessar o mesmo produto que Growth.

#### Veredito

Parcial.

Basic existe e pode dar acesso real ao produto, mas não é um plano íntegro como tier diferenciado. Hoje ele é mais uma opção de preço/acesso do que um pacote técnico separado.

### Growth

#### Existe de verdade?

Sim.

Growth existe em:

- `BillingPlanKey.GROWTH`
- `types/billing.ts`
- `services/billing/workspace-billing.ts`
- `src/app/start/page.tsx`
- `STRIPE_GROWTH_PRICE_ID`
- scripts de QA/rerun que ativam workspace como Growth

#### O que o usuário Growth recebe hoje?

O usuário Growth recebe o app protegido inteiro:

- setup/onboarding
- dashboard/revenue read
- imports
- Daily Booking Brief
- Booking Assistance
- Manual Lead Quick Add
- Action Pack
- suggested message bounded
- Executive Proof Summary
- shareability curta
- booking handoff
- app shell com badge Growth

Na prática, Growth é o plano que melhor representa o produto real atual.

#### O que está funcional?

- Growth é o default quando o parâmetro de plano é inválido ou ausente no checkout.
- O card Growth existe e é destacado como "Best Fit".
- O checkout usa `plan=growth`.
- O workspace grava `planKey: GROWTH` antes do checkout.
- O sync Stripe consegue mapear price ID para Growth, se env estiver configurada.
- O app mostra badge Growth e sinal in-app específico.
- O gating binário libera o app inteiro quando Growth está ativo.

#### O que está incompleto?

- "Higher lead volume" não é implementado como limite ou entitlement.
- "Priority async support" não é implementado no produto.
- "Stronger booking playbook" e "Stronger booking lane" são framing, não diferenças técnicas em relação a Basic.
- Não existe medição, quota ou enforcement por Growth.

#### A UI e o gating estão coerentes?

Mais coerentes que Basic e Premium, porque Growth parece ser o plano principal do produto real.

Mas ainda não existe integridade de tier: Growth não desbloqueia nada diferente de Basic/Premium. Ele funciona como plano comercial principal, não como entitlement técnico distinto.

#### Veredito

Parcial, mas é o plano mais defensável.

Growth entrega o produto real atual. O problema não é falta de acesso, e sim o fato de a diferenciação contra Basic/Premium não existir operacionalmente.

### Premium / Pro

#### Esse plano existe de verdade no estado atual?

Premium existe.

Pro não existe.

Não encontrei `PRO`/`Pro` como plano, enum, rota, card, entitlement ou tipo no código atual.

Premium existe em:

- `BillingPlanKey.PREMIUM`
- `types/billing.ts`
- `services/billing/workspace-billing.ts`
- `src/app/start/page.tsx`
- `STRIPE_PREMIUM_PRICE_ID`

#### Se existir, o que o usuário recebe?

O usuário Premium recebe o mesmo app protegido que Basic e Growth:

- todas as superfícies principais do Seller
- badge Premium no shell
- sinal in-app de "more room"
- acesso ativo se billing estiver `ACTIVE`

#### O que está funcional?

- O card Premium aparece em `/start`.
- O CTA diz "Review Premium Fit".
- O link do CTA, porém, vai direto para `/api/billing/checkout?plan=premium`.
- O workspace pode gravar `planKey: PREMIUM`.
- O Stripe sync consegue mapear `STRIPE_PREMIUM_PRICE_ID` para `PREMIUM`, se a env existir.
- O app pode mostrar Premium no badge.

#### O que está incompleto?

- Não existe "review fit" real. A UI fala "Review Premium Fit", mas o comportamento é checkout direto.
- Não existe gating seletivo de Premium.
- Não existe maior volume implementado.
- Não existe "Stronger attribution support" implementado como capacidade exclusiva.
- Não existe "Stronger renewal read" implementado como capacidade exclusiva.
- Não existe suporte prioritário implementado no produto.
- Premium não entrega um produto tecnicamente diferente de Growth.

#### A UI e o gating estão coerentes?

Não o suficiente.

O maior problema é semântico/comercial: Premium parece seletivo, mas o CTA abre checkout direto. Isso cria risco de venda errada e oversell.

#### Veredito

Não íntegro como tier premium diferenciado.

Premium existe tecnicamente como plano Stripe/app badge, mas não existe como pacote operacionalmente diferenciado. Se for vendido, deve ser tratado como fit seletivo/manual ou "mais intensidade dentro do mesmo core", não como tier de produto mais completo.

## 3. Gating e enforcement

### Onde o gating está implementado

O gating principal está em:

- `services/billing/workspace-billing.ts`
- `src/app/(app)/app/layout.tsx`
- `src/app/start/page.tsx`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/portal/route.ts`

A regra efetiva é:

- `billingStatus === ACTIVE`
- `planKey` existe
- `currentPeriodEnd` é nulo ou futuro

Se isso passa, `hasActiveAccess` é `true`.

### O que está centralizado

- Normalização de plano: `normalizeBillingPlanKey`.
- Catálogo interno de plano: `billingPlanCatalog`.
- Leitura de status Stripe: `mapStripeSubscriptionStatus`.
- Acesso ativo do workspace: `isWorkspaceBillingActive`.
- Resumo de billing: `getWorkspaceBillingSummary`.

### O que está frágil ou espalhado

- O catálogo de planos em `services/billing/workspace-billing.ts` não é a mesma fonte da apresentação de preço em `src/app/start/page.tsx`. Isso cria risco de divergência entre app shell, pricing e plano real.
- Não existe camada central de entitlements, por exemplo `canUseFeature(planKey, feature)`.
- Não existe enforcement de limites de volume, imports, leads, handoffs, proof summary, LLM usage ou support.
- O app protegido inteiro está atrás de um gate binário, não de gates por tier.
- Active users são redirecionados de `/start` para `/app`, então upgrade/downgrade self-service não é claramente acessível pela pricing page depois da assinatura. O caminho real é o portal Stripe, se configurado.

### Riscos de usuário acessar o que não deveria

Alto, se Basic deveria ter menos recursos ou menor volume.

Hoje Basic acessa o mesmo produto que Growth/Premium. Isso pode ser intencional se os planos forem apenas packaging/fit, mas contradiz qualquer promessa de tiering por capacidade.

### Riscos de usuário certo ficar sem acesso

Moderado.

- Se `currentPeriodEnd` vier ausente, o sistema trata `ACTIVE` como acesso válido.
- Se Stripe/Webhook falhar e o sync não atualizar `billingStatus`, o usuário pode ficar preso em `/start?checkout=success` com "Sync in progress".
- Se a env Stripe estiver incompleta, checkout/portal ficam indisponíveis de forma controlada, mas venda real não acontece.

## 4. Billing flow readiness

### Checkout

Existe e é bem encaminhado tecnicamente:

- usuário não autenticado é mandado para sign-up com redirect de retorno
- plano inválido cai para Growth
- env Stripe ausente redireciona para `/start?billing=unavailable`
- workspace recebe `planKey`, `stripeCustomerId` e `stripePriceId`
- Stripe Checkout é criado em modo subscription
- metadata inclui `planKey`, `userId` e `workspaceId`
- success URL volta para `/start?checkout=success&session_id=...`

Limite real:

- No ambiente atual, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e todos os `STRIPE_*_PRICE_ID` estão vazios em `.env.local` e `.env`. Portanto checkout real não está pronto localmente.

### Portal

Existe:

- `src/app/api/billing/portal/route.ts` cria Stripe Billing Portal Session se Stripe estiver configurado e o workspace tiver `stripeCustomerId`.

Limite real:

- Não encontrei uma surface forte no app para "Manage billing" ou upgrade/downgrade.
- Portal depende de env Stripe e configuração real no Stripe.
- Como `/start` redireciona assinantes ativos para `/app`, a página de planos não funciona como tela de upgrade para usuário ativo.

### Status da assinatura

Existe:

- webhook escuta `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.payment_failed`.
- status Stripe é mapeado para `ACTIVE`, `PAST_DUE`, `CANCELED` ou `INACTIVE`.
- `cancelAtPeriodEnd` e `currentPeriodEnd` são persistidos.

Limites:

- Não há testes automatizados específicos cobrindo todo o ciclo Stripe real.
- A leitura local depende de sync pós-checkout ou webhook.
- `invoice.payment_succeeded` não aparece como evento tratado explicitamente. O update de subscription pode cobrir parte disso, mas a disciplina de cobrança bem-sucedida depende do comportamento Stripe/webhook configurado.

### Upgrade/downgrade/cancelamento

Parcial.

- Cancelamento e troca de plano podem existir via Stripe Billing Portal, se o portal estiver configurado para permitir isso.
- O app não implementa upgrade/downgrade nativo.
- Não existe UI clara de "manage plan" no app shell.
- Não existe fluxo próprio para Premium fit review.

### O que já está pronto

- Modelagem básica.
- Checkout route.
- Portal route.
- Webhook route.
- Sync de subscription.
- Gate binário de acesso.
- UI de pricing.
- App badge do plano.
- Env/readiness local do banco: `npm run env:check` passou.
- Migrations: `npx prisma migrate status` passou.

### O que ainda depende de ambiente/config real

- Stripe secret key.
- Stripe webhook secret.
- Price IDs reais para Basic/Growth/Premium.
- Configuração do Stripe Billing Portal.
- Webhook real apontando para o ambiente.
- Validação end-to-end real de checkout, webhook, portal, cancelamento e troca de plano.

### Veredito de readiness

Billing foundation está pronta para integração real, mas billing comercial completo ainda é parcial no ambiente atual.

Para venda real self-service, Stripe precisa estar configurado e testado com os três price IDs. Para integridade de planos, ainda falta decidir se o produto terá um plano principal ou se vai implementar entitlements reais por tier.

## 5. Riscos comerciais

### Risco de oversell

Alto para Premium.

Premium promete ou sugere mais room, attribution support, renewal read e fit seletivo. No código, ele é o mesmo app com badge diferente e checkout direto.

### Risco de undersell

Alto para Basic.

Basic recebe o produto inteiro. Se vendido barato demais, entrega quase tudo que Growth entrega e enfraquece o plano principal.

### Risco de plano fake

Moderado.

Os planos não são fake no sentido técnico: existem, gravam no workspace, mapeiam price ID e aparecem na UI. Mas são parcialmente fake como tiering funcional, porque não mudam acesso a recursos.

### Risco de UI prometer mais do que o plano entrega

Alto em três pontos:

- Basic: "Lower lead volume" não é imposto.
- Growth: "Higher lead volume", "Priority async support", "Stronger booking playbook/lane" não são entitlements técnicos.
- Premium: "Review Premium Fit" não é review; é checkout direto.

### Risco de pricing/packaging não bater com produto real

Alto se a empresa insistir em três planos públicos diferenciados por capacidade.

Baixo/moderado se a empresa vender Growth como plano principal e tratar Basic/Premium como exceções comerciais, sem prometer feature gating.

## 6. Correções recomendadas

### 1. Decidir a estratégia real: plano principal vs tiering funcional

- Problema que resolve: hoje três planos existem, mas o produto só tem gate binário.
- Impacto esperado: elimina ambiguidade central de packaging.
- Esforço estimado: baixo se simplificar; médio/alto se implementar entitlements reais.
- Prioridade: P1.
- Recomendação: fazer agora.

Minha recomendação: simplificar comercialmente em vez de criar entitlements artificiais. Growth deve ser o plano principal público.

### 2. Trocar Premium de checkout direto para fit review real ou remover CTA de checkout

- Problema que resolve: "Review Premium Fit" hoje promete revisão, mas abre checkout direto.
- Impacto esperado: reduz oversell e compra errada.
- Esforço estimado: baixo.
- Prioridade: P1.
- Recomendação: fazer agora.

### 3. Rebaixar Basic na UI ou remover claims de volume

- Problema que resolve: Basic promete menor volume sem enforcement.
- Impacto esperado: reduz undersell e desalinhamento de expectativa.
- Esforço estimado: baixo.
- Prioridade: P1.
- Recomendação: fazer agora.

### 4. Unificar catálogo de plano e apresentação de pricing

- Problema que resolve: `workspace-billing.ts` e `start/page.tsx` carregam versões diferentes da verdade dos planos.
- Impacto esperado: reduz drift futuro de copy, CTA, features e labels.
- Esforço estimado: médio.
- Prioridade: P2.
- Recomendação: fazer depois de decidir packaging.

### 5. Adicionar camada explícita de entitlement apenas se houver gating real

- Problema que resolve: hoje não há `canUseFeature`.
- Impacto esperado: se a empresa quiser tiers reais, cria enforcement claro.
- Esforço estimado: médio/alto.
- Prioridade: P2.
- Recomendação: fazer só se mantiver três planos com diferenças reais. Não fazer se Growth virar plano principal.

### 6. Adicionar surface curta de billing management no app

- Problema que resolve: portal existe, mas não está claramente surfaced no app.
- Impacto esperado: melhora confiança operacional para card update/cancelamento.
- Esforço estimado: baixo.
- Prioridade: P2.
- Recomendação: fazer depois.

### 7. Configurar e validar Stripe real por plano

- Problema que resolve: checkout local está preparado, mas sem env real.
- Impacto esperado: transforma billing de preparado para operacionalmente vendável.
- Esforço estimado: médio, por depender de Stripe/env/webhook.
- Prioridade: P1 antes de venda real.
- Recomendação: fazer agora antes de aceitar pagamento real.

### 8. Criar teste/smoke de billing sem segredos

- Problema que resolve: hoje env/migrations passam, mas não há cobertura clara de plano por checkout/portal/webhook.
- Impacto esperado: reduz regressão em billing.
- Esforço estimado: médio.
- Prioridade: P2.
- Recomendação: fazer depois da decisão de packaging.

## 7. Veredito executivo final

### Hoje, os planos do REVORY Seller estão realmente bem trabalhados?

Parcialmente.

Eles estão bem modelados para uma primeira fundação de billing, mas não estão bem trabalhados como três planos de produto com entregas diferentes.

### Se alguém assinar Basic, recebe de fato o que Basic promete?

Recebe acesso ao produto, mas não recebe um Basic tecnicamente diferenciado.

Basic é parcial: entrega o core, mas não aplica limites de volume nem suporte leve como capacidade de produto. Na prática, Basic recebe demais se a intenção for tiering real.

### Se alguém assinar Growth, recebe de fato o que Growth promete?

Growth é o mais próximo de íntegro porque representa o core real do produto.

Mas ainda é parcial: os claims de maior volume, prioridade de suporte e stronger lane/playbook não são enforced como funcionalidades específicas.

### Premium/Pro já existe de verdade ou ainda não?

Premium existe tecnicamente.

Pro não existe.

Premium não é íntegro como tier diferenciado. Hoje é um plano/badge/checkout, não uma camada operacional superior real.

### Os planos estão prontos para venda real?

Como três planos públicos diferenciados: não.

Como um plano principal Growth com Basic/Premium tratados com muito cuidado comercial: quase, desde que Stripe real esteja configurado e validado.

### Ainda existe risco de vender algo que não está íntegro?

Sim.

O risco real não é o app core. O app core está mais sólido. O risco está no packaging:

- Basic pode entregar mais do que deveria.
- Growth é defendável, mas não diferenciado tecnicamente.
- Premium pode prometer mais do que entrega.
- Stripe checkout/portal/webhook ainda dependem de env real e validação end-to-end.

Veredito duro:

O REVORY Seller tem billing foundation real e gating de acesso real. Ele ainda não tem plan integrity completa. Se for vender agora, a forma mais honesta é vender Growth como o produto principal, reduzir ou esconder Basic, e transformar Premium em fit review/manual até haver uma razão operacional real para o tier superior.
