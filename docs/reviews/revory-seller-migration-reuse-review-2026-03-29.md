# REVORY Seller - Review de Reaproveitamento da Base Atual

Data: 2026-03-29

## Leitura executiva

A base das Sprints 1 a 6 nao deve ser descartada. Existe valor real e reaproveitavel em shell autenticado, design system, onboarding guiado, imports assistidos, estrutura de dashboard, separacao de camadas e acabamento premium. O melhor caminho para a migracao para REVORY Seller nao e rebuild; e reaproveitamento seletivo com recentering de produto.

O ponto critico e narrativo e funcional: a REVORY original foi organizada em torno de `revenue recovery`, `reviews`, `controlled execution` e leitura operacional de appointments. Isso serviu bem ao produto anterior, mas nao deve continuar como centro do REVORY Seller. Se essa camada continuar liderando navegacao, copy e dashboard, a migracao tende a parecer um pivote cosmetico em cima de um produto de recovery, e nao um Seller product de verdade.

## Veredito claro

Veredito: **reaproveitar fortemente a base existente, mas trocar o centro do produto**.

Recomendacao executiva:

- preservar quase inteiro o shell, design system, estrutura premium, onboarding framework, auth, workspace model e motor de import assistido
- adaptar o dashboard, o setup e os contratos de dados para o nucleo do REVORY Seller
- retirar do centro narrativo e funcional tudo que hoje comunica recovery ops, review ops, outreach foundation ou pseudo-execution layer
- evitar abrir novas superficies que empurrem o produto para CRM, inbox, queue operacional ou chatbot aberto

## Matriz por sprint

| Sprint | Pode ser reaproveitado quase direto | Pode ser reaproveitado com adaptacao | Deve sair do centro |
|---|---|---|---|
| 1 | auth, sync de usuario, criacao de workspace, gating de rotas, shell do wizard, ativacao, dashboard base | step labels, campos do onboarding, CTA e copy do setup | template MedSpa, Google Reviews, modos A/B/C como tese central |
| 2 | pipeline de CSV, validacao, parsing, persistencia, estado de importacao | contrato de colunas, nomes de entidades, regras de identidade por registro | framing de import voltado a appointments/clients como dominio definitivo |
| 3 | guided import, header detection, mapping review, confirmacao final, UX de import premium | dicionario de sinonimos, targets, mensagens e regras de obrigatoriedade | qualquer leitura de ETL ou importador exclusivo da tese antiga |
| 4 | quase nada em logica de negocio entra direto | padrao de agregacao, leitura curta de estado, categoria, blocker e next step | confirmation, reminder, at-risk, recovery e review eligibility como espinha dorsal do produto |
| 5 | pouco entra direto como feature | readiness model, blocked/prepared/ready, previews controlados se Seller ainda precisar de base guiada | outreach readiness, action readiness e execution foundation como heroi do app |
| 6 | polish visual, language guardrails, setup page mais madura, contencao de escopo | wording de guided/controlado para o novo nucleo Seller | controlled execution, message foundation e guardrails de campanha como narrativa principal |

## 1. O que pode ser reaproveitado quase direto

- **Shell autenticado e estrutura de app**: layout privado, sidebar, header contextual, protecao de rotas e `app context` ja entregam uma base madura para produto premium.
- **Design system e identidade visual**: tokens em `src/app/globals.css`, tipografia com DM Sans + Instrument Serif, linguagem de cards, badges, hero panels e CTA hierarchy devem ser preservados.
- **Estrutura de repositorio e separacao de camadas**: `components/`, `services/`, `db/`, `schemas/`, `types/`, `prisma/` continuam corretos para a migracao.
- **Onboarding framework**: stepper, persistencia incremental, retomada de progresso, activacao e pagina de checkpoint em setup sao reaproveitaveis.
- **Auth + workspace foundation**: `User`, `Workspace`, `ActivationSetup` e os servicos associados continuam valendo como fundacao de produto.
- **Engine de importacao CSV**: upload, validacao estrutural, parsing, normalizacao, persistencia e resumo de resultado reaproveitam bem.
- **Fluxo de import assistido**: review de headers, sugestao de mapping, confirmacao final e UX de correcoes sao ativos fortes e diferenciados.
- **Qualidade de acabamento da Sprint 6**: maturidade visual do setup, clareza de estados e disciplina de escopo devem ser mantidas.

## 2. O que pode ser reaproveitado com adaptacao

- **Dashboard**: a arquitetura de secoes, metric cards, bloco hero, readiness panels e lista curta pode continuar, mas precisa trocar completamente o nucleo semantico.
- **Onboarding steps**: o modelo de setup guiado continua bom, mas os passos precisam refletir Seller. `MedSpa template`, `Google Reviews` e `starting mode` nao devem permanecer por inercia.
- **Modelo de dados operacional**: `DataSource`, parte de `Client`, parte de `Appointment`, snapshots e estados agregados podem ser reaproveitados como padrao tecnico, desde que o dominio Seller redefina quais sao os objetos centrais.
- **Readiness model**: estados como `blocked`, `prepared`, `ready`, `visible` sao uteis como linguagem de produto, desde que a nova leitura nao empurre o app para fila operacional.
- **Short focus list e category cards**: bons como padrao de leitura guiada, desde que virem suporte do Seller e nao uma pseudo-inbox.
- **Template previews e preparation blocks**: so valem se Seller realmente precisar de base controlada. Se nao houver essa necessidade no nucleo do novo produto, melhor remover do que adaptar pela metade.
- **CSV templates oficiais**: a disciplina contratual continua excelente, mas os templates devem ser redefinidos para os objetos e campos do Seller.
- **Landing e copy structure**: hero premium, prova de valor, blocos de explicacao e CTA hierarchy podem ser mantidos com reposicionamento total da proposta.

## 3. O que deve sair do centro narrativo e funcional

- `Revenue recovery workspace` como framing central do produto
- confirmation / reminder / at-risk / recovery / review request como arquitetura principal de valor
- Google Reviews como passo estrutural obrigatorio do setup
- `Mode A / B / C` como forma principal de explicar o produto
- `Operational Layer`, `Message Foundation`, `Controlled preparation` e `Controlled execution` como hero surfaces
- previews de mensagens e readiness de outreach como narrativa dominante
- qualquer linguagem que faca o app parecer queue operacional, inbox leve ou campaign tool
- itens de sidebar como `Active Flows`, `Empty Slots`, `Reviews` e `Recall` se nao forem modulos reais do Seller
- qualquer extensao que sugira CRM, ownership, historico operacional pesado, bulk actions, threads ou chatbot aberto

## 4. O que deve ser preservado ao maximo

- o **shell premium** ja construido
- o **design system** atual e sua disciplina visual
- os **wireframes-base** de landing, setup, imports e dashboard
- a **estrutura de app autenticado** com workspace e estado claro
- a **experiencia self-service** de onboarding e importacao
- a **contencao de escopo** conquistada nas Sprints 4 a 6
- a separacao entre **estrutura reutilizavel** e **feature-specific logic**

## 5. Lista objetiva de reaproveitamento

- Reaproveitar agora:
  - auth
  - workspace
  - activation setup framework
  - private shell
  - setup checkpoint page
  - import pipeline
  - assisted mapping UI
  - dashboard scaffolding
  - design tokens
  - repo architecture

- Reaproveitar adaptando:
  - onboarding copy e steps
  - data contracts
  - dashboard cards
  - readiness language
  - section headers
  - landing proposition
  - domain entities amarradas a appointments/clients

- Tirar do centro:
  - recovery engine narrative
  - reviews ops
  - outreach preparation
  - message foundation
  - execution framing
  - mode-based product thesis
  - qualquer superficie que pareca CRM, inbox ou chatbot

## 6. Recomendacao final

O caminho correto para REVORY Seller e **migrar por reaproveitamento estrutural e reposicionamento semantico**, nao por reescrita e nem por simples rebrand.

Em termos praticos:

- manter a base visual e arquitetural das Sprints 1 a 6
- tratar Sprints 1 a 3 como fundacao mais diretamente reutilizavel
- tratar Sprints 4 a 6 mais como fonte de padroes de UX, linguagem de estado e guardrails do que como pacote funcional pronto
- substituir o centro atual do dashboard e da navegacao antes de expandir qualquer nova feature

Se fizermos isso, a REVORY Seller herda o melhor da base atual: acabamento premium, onboarding guiado, entrada de dados forte e estrutura madura. Se nao fizermos, o risco e carregar para o novo produto o centro errado e parecer um recovery app maquiado de Seller.
