# REVORY UI/UX Alignment Review

Data: 2026-03-21

## Objetivo

Alinhar a UI/UX do produto com:

- a lousa final do projeto
- o identity system da marca
- a melhor experiência possível para um SaaS premium, self-service e MedSpa-first

## Referências usadas

- `C:\Users\hriqu\Documents\Revory Project\NEWW Lousa Final — Revory (import Assistido Travado Na Sprint 3).pdf`
- `C:\Users\hriqu\Documents\Revory Project\revory_identity_system.html`

## Direção aplicada

- posicionamento mais claro de produto premium para MedSpas
- menos linguagem técnica de sprint e mais linguagem orientada a valor para o cliente
- onboarding mais guiado e mais fácil de entender
- imports tratados como experiência assistida dentro do app, não como tarefa externa de planilha
- dashboard reorganizado para destacar base operacional, readiness e próximos passos
- manutenção da identidade visual escura com acento crimson, `Instrument Serif` e `DM Sans`

## O que foi feito

### 1. Shell do app e navegação

- refinada a navegação lateral para comunicar melhor a estrutura do produto
- renomeadas áreas para ficarem mais claras do ponto de vista do cliente
- reforçado o contexto da marca no shell autenticado
- melhorado o cabeçalho do app para mostrar o estado do workspace com mais clareza

Arquivos:

- `components/app/AppSidebar.tsx`
- `src/app/(app)/app/layout.tsx`

### 2. Onboarding mais premium e guiado

- reescrita da copy das etapas para remover linguagem interna e deixar as decisões mais claras
- cada etapa passou a explicar:
  - o que a etapa faz
  - por que isso importa
  - o que acontece depois
- reforçada a proposta de fluxo guiado, com uma decisão principal por etapa
- melhorado o enquadramento visual do progresso e da promessa de experiência

Arquivos:

- `services/onboarding/wizard-steps.ts`
- `components/onboarding/OnboardingStepLayout.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`

### 3. Import assistido dentro da aplicação

- criada uma camada de import assistido no front-end
- leitura dos headers do CSV antes da importação final
- sugestão automática de mapeamento de colunas com base em aliases
- possibilidade de ajuste manual de mapeamento dentro da UI
- confirmação do mapeamento antes do envio
- geração de um CSV remapeado para o contrato oficial antes da action do servidor
- melhoria do enquadramento visual da tela de import para comunicar fluxo guiado

Arquivos:

- `lib/imports/assisted-import.ts`
- `lib/imports/csv-template-definitions.ts`
- `components/imports/CsvUploadCard.tsx`
- `src/app/(app)/app/imports/page.tsx`

### 4. Dashboard alinhado ao escopo executivo

- reorganizada a hierarquia para mostrar primeiro a base operacional real
- mantida honestidade funcional, sem inventar métricas ainda não suportadas
- adicionados blocos de:
  - base monitorada
  - readiness do workspace
  - qualidade do import
  - direção de modo e flows futuros
  - próximo melhor passo
- dashboard agora comunica melhor a transição entre ativação, import e futura camada operacional

Arquivo:

- `src/app/(app)/app/dashboard/page.tsx`

### 5. Ajustes de sistema visual

- adicionada estilização compartilhada para `select`, necessária para o fluxo de mapeamento assistido
- preservada a gramática visual premium do projeto

Arquivo:

- `src/app/globals.css`

## Resultado de UX esperado

- o produto parece mais premium, menos admin genérico
- o onboarding fica mais claro e menos abstrato
- a importação exige menos esforço externo do usuário
- o dashboard explica melhor o estado atual do workspace
- o cliente entende mais facilmente o próximo passo dentro do produto

## Validação executada

Os seguintes comandos foram executados com sucesso:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Pontos de atenção

### 1. Import assistido ainda depende do contrato oficial no backend

O fluxo assistido foi implementado no front-end por meio de leitura de headers, sugestão de mapeamento e remapeamento para o formato oficial antes do envio. Isso melhora bastante a experiência, mas o backend continua validando o contrato oficial final.

Impacto:

- a UX já está alinhada com a visão da Sprint 3
- porém ainda não existe um motor backend nativo de mapeamento persistido por workspace

### 2. Não há memória de mapeamento por workspace

Ainda não foi implementada uma memória para salvar o mapeamento confirmado e reutilizá-lo em importações futuras.

Impacto:

- o fluxo atual resolve a fricção do primeiro import
- mas o reaproveitamento automático do mapeamento ainda é uma evolução futura

### 3. Dashboard continua funcionalmente honesto

Os KPIs estratégicos de confirmation, recovery e reviews foram posicionados visualmente como direção do produto, mas não foram transformados em métricas falsas.

Impacto:

- a UI ficou mais alinhada ao escopo
- a implementação continua coerente com o estado real do MVP

### 4. Existem outras mudanças no worktree fora deste escopo

O repositório já possui outros arquivos modificados que não fizeram parte deste ajuste específico de UI/UX.

Impacto:

- antes de abrir PR ou consolidar entrega, vale revisar o diff final por escopo

## Arquivos diretamente ajustados neste trabalho

- `components/app/AppSidebar.tsx`
- `components/imports/CsvUploadCard.tsx`
- `components/onboarding/OnboardingStepLayout.tsx`
- `lib/imports/assisted-import.ts`
- `lib/imports/csv-template-definitions.ts`
- `services/onboarding/wizard-steps.ts`
- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/imports/page.tsx`
- `src/app/(app)/app/layout.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`
- `src/app/globals.css`

## Resumo executivo

O produto ficou mais próximo do que a lousa final descreve:

- premium
- clean
- self-service
- focado em MedSpa
- com import assistido como peça central da experiência

Ao mesmo tempo, a implementação preserva honestidade funcional e passa nas validações de `typecheck`, `lint` e `build`.
