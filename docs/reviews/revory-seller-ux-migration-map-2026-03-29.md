# REVORY Seller - UX Migration Map

Data: 2026-03-29
Source of truth: `C:\Users\hriqu\Documents\Revory Project\lousa_escopo_revory_seller_mvp.md`

## Leitura executiva

A base visual construida ate a Sprint 6 e forte e deve ser preservada.

O shell, o ritmo premium, a tipografia, os cards, o onboarding lateral, o hero interno das paginas e a organizacao do dashboard ja entregam a sensacao certa de produto premium e maduro.

O problema atual nao e interface.
O problema atual e interpretacao de produto.

Hoje a leitura ainda puxa para:

- recovery ops
- review ops
- operational layer
- message preparation
- pseudo-execution

Para REVORY Seller, essas mesmas superficies precisam ser reinterpretadas como:

- activation de booking system
- setup de main offer e booking path
- dashboard orientado a revenue
- guidance comercial curta
- leitura executiva de booking, nao fila operacional

## Veredito claro

Veredito: **preservar fortemente a estrutura visual e reescrever a leitura funcional e narrativa de Setup, Onboarding, Dashboard e surface operacional**.

O que deve mudar nao e o wireframe principal.
O que deve mudar e:

- labels
- prioridades de leitura
- significado dos blocos
- centro semantico do produto

## 1. Mapa de reaproveitamento por tela

## Activation Setup

### O que pode ser reaproveitado

- hero da pagina
- two-column summary block
- split entre `configured` e `pending`
- step-by-step activation view
- CTA area de continuidade
- visual treatment de status cards

### Como reinterpretar para Seller

Activation Setup deixa de ser checkpoint de um workspace operacional e passa a ser checkpoint de um **booking system activation**.

O foco deve sair de:

- template MedSpa
- reviews destination
- starting mode

e entrar em:

- main offer
- lead source
- booking path
- deal value
- brand voice
- activation status

### O que muda em labels e leitura

- `Activation Setup` pode permanecer
- `Current setup status` continua bom
- `Configured items` continua bom
- `Pending items` continua bom
- `Step-by-step activation view` continua bom

Mas os itens internos devem mudar para Seller.

### O que deve sair da narrativa principal

- reviews destination
- starting mode
- communication channel como centro
- qualquer ideia de future flows

## Onboarding Wizard

### O que pode ser reaproveitado

- layout lateral com progress bar
- cards de promessa e progresso
- hero da etapa atual
- cards `This step sets` e `Guidance`
- area principal de decisao
- rodape com CTA principal e botao de retorno

### Como reinterpretar para Seller

O onboarding atual ja tem a forma certa:

- guided
- premium
- simples
- sem builder complexity

A migracao correta e manter o mesmo chassis e trocar a tese de cada step.

### Nova leitura recomendada

O onboarding deve ser lido como:

**uma ativacao curta de uma main offer, um booking path e um baseline de receita**

Nao como:

- wizard de operacao
- setup de canais
- ativacao de automacoes
- configuracao de reviews

### O que muda em hierarchy

- menos foco em `supported source type`
- mais foco em `main offer`
- menos foco em channel logic
- mais foco em booking path
- menos foco em mode
- mais foco em deal value e brand voice

### O que deve sair da narrativa principal

- Template MedSpa
- Google Reviews URL
- Recommended Mode
- future recovery/review framing
- qualquer texto sobre live monitoring ou flows futuros

## Dashboard

### O que pode ser reaproveitado

- hero principal
- row de KPIs
- blocos modulares em grid
- import readiness como bloco de base de dados
- cartoes de readiness do workspace
- secao com numero grande e metrica dominante
- estrutura premium de cards, spacing e badges

### Como reinterpretar para Seller

O dashboard precisa sair de `operations overview` e virar um **revenue-first booking dashboard**.

A leitura recomendada:

1. dinheiro
2. booked appointments
3. speed / conversion context
4. source / offer context
5. next leverage point

### O que muda em labels e hierarchy

Hero:

- de `Operations overview`
- para `Revenue view` ou `Booking performance`

KPI row:

- reduzir leitura de imported operational base
- aumentar leitura de revenue generated, leads received, appointments booked

Blocos secundarios:

- manter poucos
- cortar o que parecer modulo paralelo

### O que deve sair da narrativa principal

- operational base
- mode and flow roadmap
- future outcomes como heroi
- growth layer ligado a reviews
- qualquer leitura de execution readiness

## Surface operacional atual

### O que pode ser reaproveitado

- grid de category cards
- bloco hero de resumo
- short list curta
- estrutura de prioridade guiada
- visual premium e contido

### Como reinterpretar para Seller

A surface atual nao deve continuar como `Operational Layer`.

No nucleo Seller ela so faz sentido se for reduzida para uma leitura curta de:

- booking priorities
- conversion friction
- next leverage point

Ou seja:

manter a forma, trocar totalmente o significado.

### Recomendacao de reinterpretacao

Transformar a surface em algo como:

- `Booking Pulse`
- `Conversion Guidance`
- `Booking Priorities`

Nao como:

- queue
- workbench
- execution layer
- operational surface

### O que deve sair da narrativa principal

- at-risk
- reminder
- confirmation
- recovery
- review visibility
- next controlled step
- readiness by category com cheiro de ops

## 2. O que muda em labels, blocos, hierarchy e leitura executiva

## Setup

### Antes

- status de ativacao
- itens configurados
- itens pendentes
- reviews, mode e source path

### Depois

- booking system status
- go-live readiness
- configured essentials
- pending essentials
- activation path

## Onboarding

### Antes

- template
- source
- channel
- reviews
- mode
- activation

### Depois

- main offer
- lead source
- booking path
- deal value
- brand voice
- activation

## Dashboard

### Antes

- operations overview
- imported base
- flow roadmap
- operational surface

### Depois

- revenue view
- booking performance
- source performance
- conversion baseline
- next leverage point

## Surface operacional

### Antes

- signals and readiness
- controlled execution framing
- short focus list
- message foundation

### Depois

- booking pulse
- conversion guidance
- booking priorities
- optional playbook preview only if strategically necessary

## 3. O que deve sair da narrativa principal

- revenue recovery
- operational layer
- message foundation
- controlled preparation
- controlled execution
- review destination
- starting mode
- confirmation / reminder / recovery / reviews como categorias hero
- short focus list com cara de queue
- qualquer leitura que empurre o usuario para operar uma fila

## 4. Readiness model, previews controlados e preparation blocks ainda fazem sentido?

## Readiness model

### Veredito

**Sim, mas so como linguagem interna e leitura secundaria.**

### Recomendacao

No Seller, readiness continua util para comunicar:

- pronto para ativar
- falta um item essencial
- base incompleta
- precisando de ajuste

Mas nao deve parecer:

- uma engine de estados operacionais
- uma fila de categorias vivas
- uma camada de execucao

### Forma correta no Seller

Usar readiness para:

- setup completion
- booking path readiness
- revenue tracking readiness
- source readiness

Nao para:

- confirmation readiness
- outreach readiness
- recovery readiness

## Previews controlados

### Veredito

**Talvez, mas nao no nucleo inicial.**

### Recomendacao

Previews controlados so fazem sentido no Seller se estiverem ligados a:

- booking playbook preview
- first response preview
- tone preview

Mesmo assim, devem ser:

- curtos
- secundarios
- claramente nao edit-free

Se isso abrir caminho para parecer inbox, chatbot ou campaign tool, melhor cortar.

## Preparation blocks

### Veredito

**No formato atual, nao devem ficar no centro do Seller.**

### Recomendacao

O conceito de `preparation` pode sobreviver como:

- setup progress
- conversion baseline
- go-live readiness

Mas nao como secao propria de product area com linguagem de preparation / execution.

## 5. Microcopy-base pronta

## Setup hero

Kicker:

`Activation Setup`

Headline:

`Activate your booking system in one guided pass.`

Body:

`Set your main offer, booking path, and revenue baseline without turning setup into a project.`

Status badge:

- `Setup in progress`
- `Ready to go live`
- `Activated`

## Step labels do onboarding

- `Main Offer`
- `Lead Source`
- `Booking Path`
- `Deal Value`
- `Brand Voice`
- `Activation`

Side rail promise:

`One clear decision per step. No setup sprawl. No bloated sales stack.`

## Dashboard hero

Kicker:

`Revenue View`

Headline:

`See what your booking system is generating.`

Body:

`REVORY Seller opens with revenue first, then the booking metrics that explain the lift.`

Alternative headline:

`Your booking engine is live.`

## KPI labels

Numero principal:

- `Revenue Generated by REVORY`

Suporte:

- `Leads Received`
- `Appointments Booked`
- `Booking Rate`
- `Avg Deal Value`
- `Response Time`
- `Lead Advance Rate`

Opcional secundario:

- `Top Lead Source`
- `Main Offer Performance`

## Empty states principais

### Setup empty state

`Nothing is currently pending. Your booking system is activated and ready to track results.`

### Dashboard empty state

`Bring in your first lead source and let REVORY Seller start tracking booked revenue.`

### Source empty state

`No lead source connected yet. Start with one clear source and one main offer.`

### Booking performance empty state

`No booked appointments yet. REVORY will start showing booking performance as soon as leads move through the active path.`

### Revenue empty state

`Revenue visibility starts once appointments are booked against the active offer.`

## 6. Estrutura visual a preservar ao maximo

- hero interno com grande headline e kicker
- cards de resumo em duas colunas
- split configured / pending
- sidebar do wizard com progresso e promessa
- KPI row horizontal acima da dobra
- blocos premium com glass / border subtle
- grid modular do dashboard
- badges e status chips discretos
- CTA areas curtas e claras

## 7. Recomendacao final por tela

### Setup

Preservar estrutura quase inteira.
Trocar o conteudo.

### Onboarding

Preservar estrutura quase inteira.
Trocar steps, labels e semantica.

### Dashboard

Preservar o chassis.
Trocar a hierarquia de leitura para revenue-first.

### Surface operacional

Preservar apenas parcialmente.
Reduzir, reinterpretar ou cortar blocos que continuem cheirando a ops layer.

## Resumo brutal

**Mesma estrutura premium. Nova leitura de produto.**

**Menos operacao. Mais booking.**

**Menos readiness de flow. Mais readiness de go-live e receita.**

**Menos pseudo-execution. Mais Seller system.**
