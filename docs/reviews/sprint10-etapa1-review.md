# sprint10-etapa1-review

## objetivo da etapa
Endurecer a clareza de proposta dentro do app do REVORY Seller sem abrir escopo, sem criar nova promessa e sem transformar a UI em marketing vazio.

O foco foi deixar o produto mais claramente legível como:
- premium booking acceleration system
- sistema narrow para transformar paid leads em booked appointments
- software conectado a revenue, não a activity tracking genérico

## diagnóstico do estado anterior
Antes desta etapa, o app já estava visualmente premium e coerente com a tese do produto, mas ainda havia um padrão de linguagem que segurava a clareza de proposta:

- algumas superfícies explicavam demais a estrutura interna do sistema
- activation e onboarding ainda usavam labels como `activation pillars`, `guardrails`, `commercial role` e `booking outcome`
- Booking Inputs ainda soava em alguns momentos como ferramenta de arquivo / confirmação de mapping, não como base de booked proof e revenue clarity
- Revenue View já era revenue-first, mas alguns headers e labels ainda estavam mais “funcionais” do que “econômicos”
- o shell ainda descrevia o workspace de forma correta, porém pouco incisiva comercialmente

Em resumo: o produto já parecia disciplinado, mas ainda não no teto de clareza econômica.

## mudanças realizadas
### shell e navegação
- reescrevi o subtitle global do workspace para falar mais diretamente de paid leads, booked appointments e revenue
- simplifiquei o status de Booking Inputs no shell para `Proof live`, `Proof next` e `Proof pending`
- troquei a tagline da sidebar de `Premium booking acceleration system` para `Paid leads into booked appointments`
- ajustei o workspace card da sidebar para estados mais orientados à proposta, como `Revenue live` e `Booked proof next`

### Revenue View
- fortaleci o hero para leitura mais comercial:
  - `Booked revenue is visible.` -> `See booked appointments in revenue.`
  - `Booked proof unlocks revenue.` -> `Revenue starts with booked proof.`
- `Revenue now` virou `Booked revenue now`
- o supporting layer passou a falar mais claramente em:
  - booked appointments visible
  - revenue baseline applied
  - offer pushed first
  - primary route into booking
- o bloco de booked proof trocou labels mais operacionais por leitura mais de valor:
  - `Coverage` -> `Proof kept`
  - `Visible` -> `Booked visible`
  - `Review` -> `Needs review`
- a copy do empty state ficou mais econômica:
  - `Upload appointments file to ground revenue with visible booked outcomes.`
  - ->
  - `Upload booked appointments so revenue can read real bookings, not activity alone.`

### Booking Inputs
- reescrevi o hero para reforçar proof-first e revenue linkage:
  - `Keep revenue proof clean.` -> `Keep booked proof tied to revenue.`
  - `Start revenue proof.` -> `Start with booked appointments.` / `Turn this file into booked proof.`
- `Revenue read supported` virou `Revenue linked`
- `Current support` virou `Current read`
- `Revenue read` virou `Revenue view`
- helper texts dos dois cards ficaram mais conectados ao produto:
  - `Booked proof for revenue.` -> `Booked appointments that support revenue.`
  - `Support after booked proof.` -> `Lead context after booked proof is live.`

### upload / empty states
- a primeira camada de upload ficou menos “file manager” e mais Seller-native:
  - `Drop your CSV...` -> `Upload one file, check the fit, then confirm what becomes visible in Seller.`
  - `File stays local until confirmation.` -> `Nothing goes live until you confirm this file.`
  - `Final review` -> `Confirm this file`
  - `Confirm mapping and make this file visible.` -> `Confirm the mapping and update Seller.`
- o resultado do import ficou mais orientado à visibilidade útil:
  - `Rows made visible` -> `Rows visible now`
  - `Rows held back` -> `Rows to review`

### Activation e onboarding
- reduzi a autoexplicação estrutural e puxei a mensagem para velocidade, booking e revenue
- `Activation integrity` virou `Activation`
- `Turn six activation choices into one clear booking path.` virou `Set six choices. Launch one booking system.`
- `Activation guardrails` virou `Why it stays short`
- `Commercial pillar` virou `What you are setting`
- `Booking outcome` virou `Why it matters`
- no step flow:
  - `Commercial role` virou `What this sets`
  - `Activation guardrail 1/2/3` virou `Key point 1/2/3`
  - `What this unlocks in Seller` virou `What unlocks next`
  - `What goes live with Seller` virou `What goes live`
  - `Why revenue appears after activation` virou `How revenue becomes visible`
- no hub de activation (`/app/setup`), também reenquadrei:
  - hero
  - snapshot labels
  - `Activation chains` -> `How Seller works live`
  - `Booked path` -> `Booking path`
  - `Revenue path` -> `Revenue clarity`
  - `Ready now` -> `Locked now`
  - `Missing now` -> `Still missing`
  - `Step status only.` -> `Short activation path.`

## arquivos alterados
- [layout.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/layout.tsx)
- [AppSidebar.tsx](C:/Users/hriqu/Documents/revory-mvp/components/app/AppSidebar.tsx)
- [page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/dashboard/page.tsx)
- [page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)
- [ImportsFlowGrid.tsx](C:/Users/hriqu/Documents/revory-mvp/components/imports/ImportsFlowGrid.tsx)
- [CsvUploadCard.tsx](C:/Users/hriqu/Documents/revory-mvp/components/imports/CsvUploadCard.tsx)
- [OnboardingStepLayout.tsx](C:/Users/hriqu/Documents/revory-mvp/components/onboarding/OnboardingStepLayout.tsx)
- [page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/page.tsx)
- [page.tsx](C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/[step]/page.tsx)
- [wizard-steps.ts](C:/Users/hriqu/Documents/revory-mvp/services/onboarding/wizard-steps.ts)
- [RevoryDecisionSupportCard.tsx](C:/Users/hriqu/Documents/revory-mvp/components/ui/RevoryDecisionSupportCard.tsx)

## impacto em clareza de proposta
O ganho principal desta etapa foi tirar o app de uma linguagem “explica como o sistema pensa” para uma linguagem “mostra o que o produto faz pelo negócio”.

Depois desta rodada:
- o shell fala mais claramente de paid leads, booked appointments e revenue
- Revenue View ficou mais conectada a booked revenue, não só a um estado interno de proof
- Booking Inputs ficou mais claramente proof-first e menos parecida com ferramenta de import
- Activation ficou menos framework-heavy e mais legível como um setup curto para ligar um booking system
- o produto agora depende menos do design sozinho para parecer valioso

## impacto em vendabilidade
Esta etapa não aumentou escopo, não inventou nova proposta e não adicionou capabilities falsas. O efeito em vendabilidade vem de compressão de mensagem:

- fica mais fácil entender rápido o que o produto faz
- fica mais fácil ligar a UX ao problema econômico real
- a proposta fica mais comercial sem virar hype
- o produto parece menos “bonito e explicado” e mais “focado e economicamente claro”

Isso ajuda especialmente em:
- first session dentro do app
- onboarding self-service
- demo curta
- leitura de value proposition pelo founder e pelo cliente

## trechos antes vs depois
### shell
- antes: `Seller workspace live with booked proof`
- depois: `Paid leads, booked appointments, and revenue are visible.`

### sidebar
- antes: `Premium booking acceleration system`
- depois: `Paid leads into booked appointments`

### Revenue View hero
- antes: `Booked revenue is visible.`
- depois: `See booked appointments in revenue.`

- antes: `Booked proof unlocks revenue.`
- depois: `Revenue starts with booked proof.`

### Booking Inputs hero
- antes: `Keep revenue proof clean.`
- depois: `Keep booked proof tied to revenue.`

- antes: `Start revenue proof.`
- depois: `Start with booked appointments.`

### upload entry state
- antes: `Drop your CSV. REVORY reads headers first, then waits for your final confirmation.`
- depois: `Upload one file, check the fit, then confirm what becomes visible in Seller.`

### onboarding / activation
- antes: `Activation integrity`
- depois: `Activation`

- antes: `Turn six activation choices into one clear booking path.`
- depois: `Set six choices. Launch one booking system.`

- antes: `Commercial pillar`
- depois: `What you are setting`

- antes: `Booking outcome`
- depois: `Why it matters`

## riscos remanescentes
- o app ficou mais claro, mas ainda existe espaço para comprimir ainda mais a densidade de copy em activation
- Revenue View continua mais forte como snapshot comercial do que como prova longitudinal de valor
- Booking Inputs ainda tem alguma repetição estrutural entre os dois cards de upload; a clareza de mensagem melhorou, mas a simetria operacional segue sendo um risco leve
- a proposta in-app está mais forte, mas a retenção ainda depende de reforçar melhor a leitura contínua de valor ao longo do tempo

## julgamento final da etapa
**Aprovada.**

Esta etapa entregou exatamente o que precisava:
- mais clareza de proposta
- mais leitura econômica
- menos linguagem interna
- mais booked appointments, speed, structure e revenue clarity nas superfícies centrais

Sem inflar escopo, o app agora parece mais claramente um premium booking acceleration system e menos uma interface elegante explicando a si mesma.

### validação
- `npm run lint` passou
- `npm run typecheck` passou
- `npm run build` passou
