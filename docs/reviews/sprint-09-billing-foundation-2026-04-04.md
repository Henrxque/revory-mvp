# Sprint 09 — Billing Foundation

## Modelagem escolhida

Billing ficou direto em `Workspace`, não em `WorkspaceSubscription`, para manter:

- um único ponto de gating por workspace
- menos join para leitura de plano e status
- menor complexidade para Stripe Checkout + webhook

## Campos adicionados

- `planKey`
- `billingStatus`
- `stripeCustomerId`
- `stripeSubscriptionId`
- `stripePriceId`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`

## Enums oficiais

- `BillingPlanKey`: `BASIC`, `GROWTH`, `PREMIUM`
- `BillingStatus`: `INACTIVE`, `ACTIVE`, `PAST_DUE`, `CANCELED`

## Helpers preparados

- catálogo oficial de planos
- leitura consistente de label/plano
- resumo de billing para gating leve
- mapeamento inicial de status Stripe para status interno

## O que fica para a próxima etapa

- Stripe Checkout session
- webhook de sincronização
- atualização do workspace a partir de eventos Stripe
- gating real por plano dentro do app
