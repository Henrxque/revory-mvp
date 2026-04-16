# Sprint 13 - Etapa 7 Review

## objetivo da etapa

Blindar a camada minima de lead-to-booking contra oversell de produto.

Com a Sprint 13, o REVORY Seller passou a ter:

- leitura curta de readiness
- blocked reasons
- booking handoff assistido
- tracking minimo de participacao do Seller

Isso aumenta o risco de a UI e a copy comecarem a sugerir algo maior do que o produto realmente faz hoje.

O objetivo desta etapa foi ajustar esse framing para manter a camada:

- honesta
- narrow
- booking-first
- sem cara de CRM
- sem cara de outreach engine
- sem cara de operacao continua de lead

## riscos de oversell identificados

- `Lead intake routing` podia soar como uma camada operacional mais ampla do que a entrega real.
- `Readiness visible` era tecnicamente correto, mas ainda generico demais para explicar que esta camada e apenas uma leitura curta ligada ao booking path.
- `Handoff path` e `Can advance` davam mais margem para interpretacao de fluxo operacional amplo.
- `Open email handoff` e `Open SMS handoff` colocavam peso demais em `handoff`, quando o produto hoje so abre o caminho atual do booking.
- textos como `records that the path was used` podiam sugerir prova de contato mais forte do que realmente existe.
- `Lead intake has not started yet` e o fallback `Lead intake` sugeriam uma camada de intake mais ativa do que o produto tem hoje.
- algumas notas de readiness ainda estavam perto de sugerir que Seller `prepara` ou `move` o lead, quando a camada real so valida se o caminho atual pode abrir.

## mudancas realizadas

### imports surface

Na superficie de `Booking Inputs`, a secao foi reenquadrada para um framing mais narrow:

- `Lead intake routing` -> `Lead readiness read`
- `Readiness visible` -> `Booking-read visible`
- `Handoff path` -> `Current path`
- `Can advance` -> `Can open path`
- `Current readiness read` -> `Current booking-read snapshot`

Tambem foi adicionada uma linha explicita para reduzir ambiguidades:

- `This stays a short booking-read layer, not CRM or ongoing lead management.`

### handoff labels and notes

Os labels do handoff ficaram mais honestos com o comportamento real:

- `Open email handoff` -> `Open email booking path`
- `Open SMS handoff` -> `Open SMS booking path`

As notas tambem foram ajustadas para descrever abertura do caminho atual, nao uma camada maior de operacao.

### opportunity list copy

Na lista de oportunidades:

- o empty state deixou de falar em `Lead intake` e passou a falar em `Lead booking-read`
- o fallback de origem deixou de usar `Lead intake` e passou a usar `Lead source`
- a explicacao do CTA deixou de dizer `records that the path was used`
- agora a UI diz que Seller `opened` o caminho atual neste device

Isso reduz risco de a interface sugerir envio confirmado, conversa ou follow-up.

### readiness language

As notas de readiness foram ajustadas para falar em:

- mostrar o proximo booking step
- abrir o booking path atual

e nao em `preparar` ou `mover` o lead de um jeito que pareca execucao operacional ampla.

## arquivos alterados

- [src/app/(app)/app/imports/page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)
- [components/lead-booking/LeadBookingOpportunityList.tsx](C:/Users/hriqu/Documents/revory-mvp/components/lead-booking/LeadBookingOpportunityList.tsx)
- [services/lead-booking/build-booking-handoff.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/build-booking-handoff.ts)
- [services/lead-booking/get-lead-intake-routing-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/get-lead-intake-routing-read.ts)
- [services/lead-booking/opportunity-readiness.ts](C:/Users/hriqu/Documents/revory-mvp/services/lead-booking/opportunity-readiness.ts)

## impacto em product honesty

O produto ficou mais honesto.

Principalmente porque a superficie agora descreve melhor o que realmente existe:

- leitura curta de prontidao
- bloqueio explicito
- abertura assistida do booking path atual
- registro minimo de que esse caminho foi aberto

A etapa tambem reduziu a chance de o produto parecer:

- CRM
- inbox
- outreach engine
- automacao de vendas
- camada de follow-up continuo

## impacto em sellability

O ajuste melhora vendabilidade no sentido certo:

- menos risco de promessa inflada
- mais clareza sobre o valor real
- mais consistencia com o posicionamento premium e narrow

Nao aumenta breadth artificial.

Em vez disso, deixa mais facil vender a camada como:

- booking assistance curta
- readiness read operacional
- handoff assistido

e nao como sistema amplo de gestao de lead.

## riscos remanescentes

- o proprio termo `lead` ainda carrega expectativa natural de CRM para alguns usuarios; a UI esta melhor, mas essa tensao nao desaparece completamente.
- o handoff assistido ainda pode ser interpretado como outreach real se a demo ou a venda nao explicarem que o produto abre o canal, mas nao gerencia thread, resposta ou follow-up.
- a camada continua import-first; se alguem esperar intake nativo, formulario vivo ou captura direta dentro do app, essa expectativa ainda pode surgir fora do codigo.
- outras areas antigas do produto ainda usam linguagem de `handoff` e `outreach preparation`; esta etapa blindou a camada da Sprint 13, nao o produto inteiro.

## julgamento final da etapa

`Aprovada`.

Esta etapa fez o que precisava fazer sem abrir escopo:

- reduziu riscos de oversell
- apertou o framing
- deixou a camada mais claramente narrow
- preservou a utilidade pratica do fluxo

Leitura final:

o REVORY Seller continua com uma camada minima de lead-to-booking, mas agora a superficie comunica isso de forma mais honesta e mais dificil de confundir com CRM ou automacao de vendas.
