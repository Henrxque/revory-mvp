# REVORY Seller — Plan Direction Correction: Basic Nerfed, Growth Full, Premium Future

## 1. Problema da direção anterior

- Basic escondido demais era ruim porque removia a entrada barata/testável do produto e empurrava todo comprador direto para Growth, aumentando atrito para buyer que ainda quer sentir o produto antes do plano completo.
- Basic como "fit review" tambem criava carga manual desnecessaria para o founder, o oposto do motion self-service-first desejado.
- Premium manual-fit era a direcao errada para este momento porque abria um motion comercial manual sem entregar uma camada operacional Premium real. Isso aumentava burden, criava risco de expectativa errada e roubava foco.
- A direcao correta para o MVP e mais simples: Basic publico e limitado, Growth completo e principal, Premium futuro.

## 2. Estratégia corrigida

- Basic: plano de entrada real, publico, mais barato e self-service, mas nerfado com gates simples de superficie/valor percebido.
- Growth: plano principal real, produto completo do MVP e melhor plano para venda direta.
- Premium: futuro/coming later, sem checkout, sem mailto, sem fit review manual e sem promessa operacional atual.

## 3. Nerf recomendado para o Basic

### Sem Manual Lead Quick Add

- O que muda: Basic nao mostra a surface de `Manual Lead Quick Add` e a server action tambem bloqueia a criacao manual.
- Por que vale a pena: e uma diferenca facil de entender, com alto valor percebido em uso diario e baixo risco tecnico.
- Impacto esperado: Basic continua util via imports, mas Growth vira claramente o plano mais pratico para rotina real.
- Esforco estimado: baixo.
- Risco de escopo: baixo.
- Recomendacao: fazer agora.

### Sem share/copy/print da Executive Proof Summary

- O que muda: Basic mantem o revenue read in-app, mas nao recebe a camada de proof share/export.
- Por que vale a pena: proof shareability e pricing defense sao valor premium claro, sem precisar criar quota ou limits complexos.
- Impacto esperado: Growth fica melhor defendido como plano completo e Basic nao entrega praticamente o mesmo valor.
- Esforco estimado: baixo.
- Risco de escopo: baixo.
- Recomendacao: fazer agora.

### Sem quota complexa de leads/imports/LLM

- O que muda: nao foi criado limite numerico por lead, import, chamada LLM ou volume.
- Por que vale a pena: evita maintenance burden e bugs de billing/entitlement antes da hora.
- Impacto esperado: packaging fica simples, honesto e solo-founder friendly.
- Esforco estimado: baixo.
- Risco de escopo: baixo.
- Recomendacao: fazer agora como decisao negativa.

## 4. Plano final por tier

### Basic

- O que entra: dashboard revenue-first, booked proof, booking inputs import-first, Daily Booking Brief e booking assistance/readiness bounded.
- O que NÃO entra: Manual Lead Quick Add e Executive Proof Summary com copy/share/print.
- Como ele deve ser comunicado: entry plan real, mais barato, util para sentir o core, mas limitado. Nao deve parecer o produto completo.

### Growth

- O que entra: todo o core atual do MVP, incluindo Action Pack, Manual Quick Add e Executive Proof Summary com copy/share/print.
- Por que ele é o plano principal: representa o produto completo de verdade hoje e sustenta melhor valor percebido, uso diario e defesa de preco.
- Como ele deve ser comunicado: main plan / complete MVP / full product package.

### Premium

- Como aparece: future tier / coming later / not available yet.
- Como NÃO aparece: nao aparece como checkout, nao abre mailto, nao pede manual fit review e nao sugere plataforma maior.
- Qual é a leitura correta de “future”: placeholder honesto de direcao futura, sem venda atual e sem burden operacional.

## 5. Ajustes aplicados

### Pricing UI

- Basic voltou como card publico secundario com CTA `Start with Basic`.
- Growth segue como card principal e plano completo.
- Premium aparece como `Future tier` com CTA desabilitado `Coming later`.

### Landing

- Pricing publico voltou a mostrar Basic como entry plan.
- Growth foi mantido como main plan.
- Premium foi rebaixado para future tier sem checkout e sem mailto.

### CTAs

- Basic: `/api/billing/checkout?plan=basic`.
- Growth: `/api/billing/checkout?plan=growth`.
- Premium: desabilitado / coming later.

### Catálogo interno

- `Basic` passou a ser `Entry plan`.
- `Growth` passou a ser `Complete MVP plan`.
- `Premium` passou a ser `Future tier`.

### Gating simples entre Basic e Growth

- `MANUAL_LEAD_QUICK_ADD`: liberado apenas para Growth.
- `EXECUTIVE_PROOF_SHARE`: liberado apenas para Growth.
- A server action de Quick Add tambem bloqueia Basic, para evitar gating apenas visual.

### Rotas/fluxos ajustados

- A rota de checkout voltou a permitir Basic e Growth.
- Premium continua bloqueado e redireciona para messaging de future tier.
- Stripe runtime passou a ter readiness por plano self-service, com Premium sempre indisponivel.

## 6. Validação final

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run env:check`: passou.
- Source check de pricing UI: Basic e Growth apontam para checkout; Premium usa `ctaHref: null`.
- Source check de landing: Basic voltou a aparecer publicamente; Growth segue como principal; Premium nao tem mailto nem checkout.
- Source check de rota: Premium continua bloqueado como `premium-future`; Basic nao e mais bloqueado como fit/manual.
- Source check de gating: `MANUAL_LEAD_QUICK_ADD` e `EXECUTIVE_PROOF_SHARE` existem como gates simples liberados apenas para Growth.

## 7. Veredito executivo

A nova direcao de planos ficou mais correta para o MVP e para um founder que quer minimo de operacao manual.

Basic voltou a ser uma entrada real sem corroer Growth, porque agora perde diferencas perceptiveis e simples: Quick Add manual e proof share/export.

Growth ficou melhor defendido como produto completo.

Premium ficou fora da venda atual do jeito certo: future tier, sem checkout, sem mailto e sem manual fit.
