# REVORY Seller - Premium Flow Rebalance

## Problema encontrado

Premium existe tecnicamente no produto, mas nao e um tier operacionalmente diferenciado.

Antes do ajuste, o risco principal era semantico:

- Premium aparecia como camada superior
- a copy sugeria fit/review
- historicamente o comportamento podia levar a checkout direto
- nao havia entrega funcional superior suficiente para sustentar um tier publico maior

Mesmo com a protecao recente contra checkout direto, o CTA ainda podia ficar fraco se apenas voltasse para uma mensagem interna. Se o produto promete `fit`, o caminho precisa ser manual e explicito.

Leitura dura:

- Premium nao pode ser vendido como plataforma maior.
- Premium nao pode parecer BI, CRM, automacao ou attribution suite.
- Premium nao deve ser self-service checkout enquanto nao houver diferenciacao real.
- Premium pode existir como fit manual para maior intensidade de uso.

## Ajustes aplicados

- Troquei o CTA de Premium para `Request Premium fit review`.
- Troquei o destino do CTA de Premium para `mailto:hello@revory.com?subject=REVORY%20Premium%20fit%20review`.
- Ajustei o label visual de `Fit reviewed` para `Manual fit`.
- Ajustei a microcopy para deixar claro que Premium e manual-fit only.
- Reforcei que Premium nao implica plataforma maior nem categoria adicional.
- Atualizei a landing para usar o mesmo CTA manual via email.
- Atualizei o catalogo interno de billing para refletir `Manual fit`.
- Mantive a protecao da rota `/api/billing/checkout?plan=premium`, que redireciona para `/start?billing=premium-fit&plan=premium` em vez de criar checkout.

Arquivos alterados:

- `src/app/start/page.tsx`
- `src/content/revory-landing-reference.html`
- `services/billing/workspace-billing.ts`

## Fluxo final do Premium

Fluxo publico:

1. Buyer ve `Premium` como camada `Manual fit`.
2. CTA final: `Request Premium fit review`.
3. Clique abre email para `hello@revory.com` com assunto `REVORY Premium fit review`.
4. Nao existe checkout direto de Premium pela UI.

Fluxo protegido contra URL antiga:

1. Se alguem acessar `/api/billing/checkout?plan=premium`, a rota nao cria Stripe Checkout.
2. O usuario volta para `/start?billing=premium-fit&plan=premium`.
3. A tela explica que Premium nao e checkout direto e deve passar por fit manual.

Copy final:

- `Manual fit`
- `Request Premium fit review`
- `Premium is manual-fit only. It does not imply a broader operating system or extra product category.`

## Trade-offs

- O fluxo fica menos self-service para Premium, mas isso e correto porque Premium ainda nao sustenta diferenciacao operacional real.
- A conversao direta de Premium cai, mas o risco de oversell cai mais.
- O founder precisa responder fit requests manualmente, mas isso e menor do que vender um tier superior sem product truth.
- O sistema preserva `PREMIUM` tecnicamente para futuro billing/manual upgrade, sem fingir que ja existe um pacote maior.

## Veredito executivo

Premium agora esta coerente com o estado real do produto.

Ele continua existindo como tier tecnico e comercial seletivo, mas nao e mais vendido como checkout publico nem como plataforma maior. O CTA agora entrega o que promete: um pedido de fit review manual.

Veredito final:

- oversell reduzido
- fake tiering reduzido
- Growth continua protegido como plano principal
- Premium fica seletivo, manual e honesto
