# Sprint 09 — Stripe Checkout, Webhook, and Customer Portal

## Caminho completo de compra

1. Landing e pricing mandam o usuário para `/start?plan=basic|growth|premium`
2. `/start` exige autenticação, cria workspace se necessário e redireciona para `/api/billing/checkout`
3. `/api/billing/checkout` cria a Stripe Checkout Session
4. Stripe recebe o pagamento da assinatura
5. Stripe retorna para `/start?checkout=success&session_id=...`
6. `/start` faz uma sincronização imediata da sessão para evitar atraso perceptível
7. Webhook confirma e mantém o estado do billing no banco
8. Workspace com billing ativo entra em `/app`
9. Gestão de cartão/cancelamento abre via `/api/billing/portal`

## Como o workspace é liberado

O gating está no shell do app:

- `Workspace.billingStatus` precisa estar ativo
- `planKey` precisa existir
- `currentPeriodEnd` é respeitado quando existe

Quando essas condições fecham, o usuário entra em `/app` e o fluxo normal resolve setup, imports ou dashboard.

## Eventos Stripe tratados

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## Estados mapeados

- `active` -> `ACTIVE`
- `trialing` -> `ACTIVE`
- `past_due` -> `PAST_DUE`
- `unpaid` -> `PAST_DUE`
- `paused` -> `PAST_DUE`
- `canceled` -> `CANCELED`
- `incomplete` -> `INACTIVE`
- `incomplete_expired` -> `CANCELED`

## Envs necessárias

- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BASIC_PRICE_ID`
- `STRIPE_GROWTH_PRICE_ID`
- `STRIPE_PREMIUM_PRICE_ID`

## Riscos restantes antes do deploy

- registrar a URL real do webhook no Stripe
- confirmar que os `price_id` do Stripe estão corretos por plano
- validar `NEXT_PUBLIC_APP_URL` com a URL final de produção
- testar assinatura cancelada no Customer Portal e retorno do webhook em produção
