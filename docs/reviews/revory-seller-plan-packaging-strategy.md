# REVORY Seller - Plan Integrity and Packaging Strategy

## Leitura do estado atual

O REVORY Seller tem planos tecnicamente modelados, mas ainda nao tem tiering funcional integro.

Hoje existem:

- `BASIC`
- `GROWTH`
- `PREMIUM`

Eles existem em schema, tipos, catalogo de billing, pricing UI e fluxo Stripe preparado. Mas a diferenca real entre eles ainda nao existe como enforcement de produto.

O gating atual e binario:

- workspace ativo com `billingStatus = ACTIVE`
- `planKey` presente
- periodo valido ou sem `currentPeriodEnd`

Depois que esse gate passa, o usuario entra no app inteiro. Basic, Growth e Premium acessam praticamente o mesmo produto.

Isso nao e necessariamente ruim para o produto. E ruim apenas se a empresa tentar vender tres planos como se cada um entregasse capabilities diferentes.

Leitura dura:

- Growth representa melhor o produto real atual.
- Basic existe, mas entrega demais para ser um tier baixo diferenciado.
- Premium existe, mas ainda promete mais do que sustenta se for apresentado como tier superior publico e compravel direto.
- Pro nao existe no estado atual do projeto.

O problema nao deve ser resolvido com entitlements artificiais agora. Criar limits, quotas ou gating por pressa comercial seria overbuild e aumentaria risco de produto falso.

## Estrategia recomendada

A estrategia oficial recomendada para o estado atual e:

**1 plano principal publico + 1 tier seletivo + 1 plano rebaixado/nao protagonista.**

Na pratica:

- Growth vira o plano principal real do REVORY Seller.
- Basic deixa de ser plano principal de aquisicao.
- Premium deixa de ser checkout direto e vira fit seletivo/manual ate existir diferenciacao real sustentada.

Essa estrategia assume honestamente que o produto hoje vende melhor como um software premium narrow completo, nao como uma suite com tres niveis funcionais.

### Decisao arquitetural

Nao implementar entitlements por plano nesta sprint.

Motivo:

- nao ha diferenca funcional madura o suficiente para gatear sem teatralidade
- quotas de lead/import/LLM criariam custo tecnico e suporte desnecessario
- gating artificial poderia bloquear valor real para buyer certo
- o produto e narrow; a embalagem deve ficar narrow tambem

### Decisao comercial

Tratar Growth como o produto real.

Basic e Premium podem continuar existindo tecnicamente no sistema, mas nao devem ser comunicados como tiers operacionais equivalentes ate que a implementacao sustente isso.

### O que sera mantido

- `BillingPlanKey.BASIC`, `BillingPlanKey.GROWTH`, `BillingPlanKey.PREMIUM`
- Stripe price IDs separados, se forem uteis para operacao comercial
- `planKey` no workspace
- billing foundation atual
- gate binario de acesso
- badge de plano no app, desde que a copy nao sugira capabilities exclusivas falsas

### O que sera rebaixado

- Basic na vitrine publica
- claims de volume no Basic
- claims de suporte como se fossem funcionalidade de produto
- Premium como plano compravel diretamente sem fit
- qualquer copy de "more room" que pareca capacidade tecnica nao implementada

### O que sera removido ou corrigido em proximos ajustes

- CTA de Premium apontando direto para checkout
- linguagem que sugira que Premium ja tem stronger attribution, stronger renewal read ou prioridade operacional implementada no produto
- linguagem que sugira que Basic tem limitacao real de volume se isso nao existe
- qualquer tabela que faca o buyer comparar os planos por feature gating falso

### Arquivos e areas impactadas

Areas que devem ser ajustadas quando essa decisao virar implementacao:

- `src/app/start/page.tsx`
- `services/billing/workspace-billing.ts`
- `types/billing.ts`, se a copy/tipos comerciais forem refinados
- `src/app/api/billing/checkout/route.ts`, se Premium deixar de aceitar checkout direto
- landing/pricing copy carregada em `src/content/revory-landing-reference.html`, se continuar sendo fonte da landing
- docs comerciais e reviews de pricing/GT-ready

Nao ha necessidade imediata de alterar schema.

## Papel do Basic

Basic deve ser tratado como:

- plano de entrada seletivo
- founder override
- plano para caso comercial especifico
- opcao defensiva para buyer certo, com menor intensidade de uso esperada

Basic nao deve ser tratado como:

- plano publico principal
- plano barato para aumentar volume de leads
- plano funcionalmente limitado por quotas inexistentes
- versao "lite" real do produto

### O que Basic sustenta hoje

Basic sustenta acesso ao core do REVORY Seller.

Ele pode ser usado se a empresa aceitar que Basic nao e tecnicamente diferente de Growth no app atual.

### O que Basic nao sustenta hoje

Basic nao sustenta claims como:

- lower lead volume implementado
- menos handoffs
- menos imports
- menos proof summary
- menos LLM usage
- suporte leve como feature do sistema

### Decisao oficial

Basic fica tecnicamente existente, mas comercialmente rebaixado.

Recomendacao:

- nao usar Basic como card principal
- nao vender Basic como "mesmo produto mais barato" em publico
- remover claims de volume se nao houver enforcement
- manter como excecao comercial controlada

## Papel do Growth

Growth deve ser tratado como:

- plano principal do REVORY Seller
- oferta publica padrao
- melhor representacao do produto real
- plano self-service principal
- base correta para pricing defense

Growth nao deve fingir que desbloqueia features exclusivas que Basic nao tem, se essas features nao forem realmente gated.

### O que Growth sustenta hoje

Growth sustenta o produto real:

- setup/onboarding
- booking inputs
- revenue-first dashboard
- booked proof
- Daily Booking Brief
- Booking Assistance
- readiness e blocked reasons
- suggested message bounded
- Manual Lead Quick Add
- Action Pack
- Executive Proof Summary
- share/copy/print
- booking handoff

Esse e o pacote vendavel hoje.

### O que Growth nao deve prometer

Growth nao deve prometer:

- CRM
- inbox
- automacao de follow-up
- BI
- agente comercial livre
- feature gating artificial contra Basic
- suporte prioritario como capability tecnica

### Decisao oficial

Growth vira o plano publico principal.

Recomendacao:

- pricing page deve centralizar Growth
- CTA principal deve apontar para Growth checkout/self-service
- copy deve vender o core completo, nao uma lista inflada de tier features
- Growth deve ser defendido por outcome narrow: booked proof, revenue clarity e booking assistance curta

## Papel do Premium

Premium deve ser tratado como:

- tier seletivo
- fit review
- plano para clinicas com maior intensidade de uso e maior maturidade de fit
- upgrade comercial/manual, nao checkout publico direto

Premium nao deve ser tratado como:

- plano superior com produto mais amplo
- enterprise
- BI maior
- automacao maior
- attribution suite
- CRM/inbox disfarçado
- tier com claims de capacidades que nao existem

### O que Premium sustenta hoje

Premium sustenta tecnicamente:

- `planKey = PREMIUM`
- price ID separado
- badge Premium
- acesso ao mesmo core do app

Premium pode sustentar comercialmente:

- maior intensidade de uso
- fit mais seletivo
- contexto em que o founder quer vender por adequacao, nao por checkout cego

### O que Premium nao sustenta hoje

Premium nao sustenta como produto:

- attribution support exclusivo
- renewal read exclusivo
- volume maior com enforcement
- prioridade de suporte implementada
- surface especial
- capability superior real

### Decisao oficial

Premium deixa de ser plano publico de checkout direto ate existir uma razao real para isso.

Recomendacao:

- CTA deve virar "Check Premium fit" ou equivalente
- nao deve chamar Stripe checkout direto
- deve explicar que Premium e seletivo e nao adiciona categoria nova
- deve evitar qualquer copy que sugira produto maior

## O que NAO entra

Nao entra nesta sprint:

- sistema de entitlements por feature
- quotas de leads
- quotas de imports
- quotas de LLM
- limits por handoff
- limits por proof summary
- plano por assento
- workspace roles
- enterprise plan
- plano Pro
- CRM/inbox/BI para justificar Premium
- upgrade/downgrade nativo complexo
- tabela grande comparativa de features
- trial aberto para compensar pricing
- suporte manual escondido como parte do plano

Guardrail central:

Nao criar diferenca de produto se a diferenca ainda nao existe de verdade.

Se a diferenca for comercial, ela deve ser comunicada como fit/intensidade, nao como capability tecnica.

## Veredito executivo

A decisao correta e simplificar a leitura sem destruir a base tecnica.

O REVORY Seller deve vender Growth como plano principal real. Esse e o plano que melhor representa o produto atual e que mais sustenta a promessa premium narrow.

Basic deve continuar apenas como entrada seletiva ou excecao comercial. Se ficar publico do jeito atual, ele enfraquece Growth e cria risco de undersell.

Premium deve continuar tecnicamente possivel, mas comercialmente protegido por fit review. Se ficar como checkout direto, cria risco de oversell porque ainda nao entrega produto superior diferenciado.

Veredito final:

- Growth: aprovado como plano principal real.
- Basic: aprovado apenas como plano rebaixado/seletivo.
- Premium: aprovado apenas como fit seletivo/manual, nao como checkout publico direto.
- Pro: nao existe e nao deve ser criado agora.

Esta sprint nao deve construir tiering artificial. Deve proteger product truth, reduzir compra errada e alinhar pricing com o produto que existe hoje.
