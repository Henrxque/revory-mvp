# REVORY Seller - Basic Plan Rebalance

## Problema do Basic

O Basic existia tecnicamente e aparecia como card de pricing, mas nao tinha enforcement real de limite, quota ou reducao de capacidade.

Isso criava dois problemas:

- risco de undersell, porque Basic acessa praticamente o mesmo produto que Growth
- risco de leitura errada, porque parecia uma versao menor publicamente compravel do Seller

O problema nao deve ser resolvido com quotas artificiais. O produto ainda nao precisa de limits por lead, import, handoff, LLM ou proof summary so para justificar uma tabela de preco.

Leitura final:

- Basic nao e feature-lite.
- Basic nao e plano publico principal.
- Basic nao deve competir visualmente com Growth.
- Basic so faz sentido como fit contido e caso a caso.

## Ajustes aplicados

- Removi Basic da lista de cards principais da pricing UI autenticada em `/start`.
- Mantive Growth como card dominante e unico checkout self-service direto.
- Mantive Premium como card seletivo fit-reviewed.
- Adicionei apenas uma nota discreta abaixo da area de planos explicando que Basic nao e caminho principal.
- Mantive o link `Ask about Basic fit`, mas sem transforma-lo em checkout.
- Atualizei a landing para remover o card Basic da grade de pricing.
- Adicionei nota curta na landing explicando que Basic nao e um plano publico feature-lite.
- Ajustei o catalogo interno de billing para tratar Basic como `Not public` e `case-by-case contained fit`.
- Mantive a protecao ja existente na rota de checkout: chamadas para Basic voltam para `/start?billing=basic-fit&plan=basic`.

Arquivos alterados:

- `src/app/start/page.tsx`
- `src/content/revory-landing-reference.html`
- `services/billing/workspace-billing.ts`

## O que foi removido ou rebaixado

Removido/rebaixado:

- Basic como card principal de pricing
- Basic como plano comparavel visualmente a Growth
- Basic como CTA publico de compra
- Basic como promessa de menor volume aplicada pelo sistema
- Basic como aquisicao default

Mantido:

- `BillingPlanKey.BASIC`
- suporte tecnico ao `planKey = BASIC`
- mensagem de fit para URL antiga ou tentativa manual
- possibilidade comercial seletiva, sem prometer produto diferente

Nao foi adicionado:

- quota
- entitlement
- limit de lead
- limit de import
- limit de LLM
- limit de proof
- tabela nova de features

## Resultado final do plano

Basic agora fica como:

- plano nao publico principal
- excecao comercial
- entrada contida caso a caso
- opcao de fit, nao CTA de checkout

Growth fica protegido como:

- plano principal real
- pacote self-service publico
- melhor representacao do REVORY Seller atual

O resultado reduz o risco de buyer escolher Basic por preco e receber o mesmo core que Growth, enfraquecendo a defesa de valor do plano principal.

## Veredito executivo

Basic foi rebaixado de verdade.

Ele continua existindo tecnicamente para preservar compatibilidade de billing, mas saiu da vitrine principal e deixou de competir com Growth. A copy agora deixa claro que Basic nao e um tier funcional menor nem uma porta principal de aquisicao.

Veredito final:

- undersell reduzido
- fake tiering reduzido
- Growth mais protegido
- nenhum overbuild de quotas ou entitlements foi introduzido
