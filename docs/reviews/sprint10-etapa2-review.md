# Sprint 10 — Etapa 2 Review

## Objetivo da etapa
Refatorar o onboarding do REVORY Seller para que ele pareça menos um framework de ativação genérico e mais a configuração real de uma MedSpa com uma oferta principal, um booking path claro e um contexto comercial concreto.

## Diagnóstico do onboarding anterior
O onboarding anterior já era curto e funcional, mas ainda tinha três fragilidades principais:

- começava pelo sistema, não pela clínica
- usava linguagem correta, porém abstrata demais para a primeira configuração
- pré-selecionava alguns defaults de forma visualmente forte demais, o que enfraquecia a honestidade de escolha

Na prática, isso fazia o fluxo parecer mais uma sequência de pilares conceituais do produto do que a montagem real de um Seller para uma clínica específica.

## Mudanças realizadas
- A primeira etapa deixou de ser apenas `Choose Your Main Offer` e passou a ser `Set Clinic + Main Offer`.
- O passo inicial agora exige `Clinic name`, atualiza o `Workspace` e persiste o `MedSpaProfile`, ancorando o onboarding em uma clínica real.
- Foi criado um helper dedicado para upsert do perfil da clínica, sem abrir uma camada nova de complexidade.
- O `AppContext` passou a carregar `medSpaProfile`, permitindo que o onboarding leia e reapresente o contexto real da clínica ao longo do fluxo.
- O layout de onboarding ganhou um `contextPanel` com dois blocos:
  - `Clinic context`
  - `Current setup`
- O `Current setup` mostra, em tempo real, o que já está definido ou ainda está pendente: main offer, lead entry, booking path, value per booking e seller voice.
- O copy das etapas foi reescrito para sair de um framing mais interno e estrutural para um framing mais comercial e concreto.
- Os passos de `template` e `mode` deixaram de parecer confirmados antes da escolha real do usuário.
- `source`, `channel` e `deal value` passaram a falar mais explicitamente de `this clinic`, reduzindo a sensação de configuração abstrata.
- A etapa final de activation foi reescrita para comunicar melhor o que de fato vai ao ar e como booked appointments e revenue ficam visíveis.

## Arquivos alterados
- [C:\Users\hriqu\Documents\revory-mvp\services\medspa\upsert-medspa-profile.ts](C:\Users\hriqu\Documents\revory-mvp\services\medspa\upsert-medspa-profile.ts)
- [C:\Users\hriqu\Documents\revory-mvp\services\app\get-app-context.ts](C:\Users\hriqu\Documents\revory-mvp\services\app\get-app-context.ts)
- [C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\setup\actions.ts](C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\setup\actions.ts)
- [C:\Users\hriqu\Documents\revory-mvp\services\onboarding\wizard-steps.ts](C:\Users\hriqu\Documents\revory-mvp\services\onboarding\wizard-steps.ts)
- [C:\Users\hriqu\Documents\revory-mvp\components\onboarding\OnboardingStepLayout.tsx](C:\Users\hriqu\Documents\revory-mvp\components\onboarding\OnboardingStepLayout.tsx)
- [C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\setup\[step]\page.tsx](C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\setup\[step]\page.tsx)

## Impacto em onboarding
- O fluxo continua curto, mas agora começa com algo real: a clínica.
- O cliente entende mais rapidamente o que está configurando e para quê.
- A leitura do setup ficou menos “sistema montando sistema” e mais “Seller sendo configurado para a minha clínica”.
- Os defaults visuais ficaram mais honestos, reduzindo a sensação de escolha artificialmente antecipada.

## Impacto em ativação percebida
- A ativação ficou mais conectada ao que foi configurado ao longo do onboarding.
- O bloco de contexto ajuda a construir continuidade entre os passos, reduzindo a sensação de telas soltas.
- A etapa final reforça melhor a lógica real do produto: revenue só aparece quando booked appointments ficam visíveis.

## Impacto em vendabilidade
- A percepção de self-service premium melhora porque o cliente entende mais cedo que está configurando uma operação real, não um conceito.
- O onboarding fica mais vendável sem precisar de explicação externa.
- A concretude extra ajuda a reduzir o risco de o produto parecer bonito, porém abstrato demais para justificar ticket premium.

## Antes vs depois
### 1. Primeira etapa
- Antes: `Choose Your Main Offer`
- Depois: `Set Clinic + Main Offer`

### 2. Âncora inicial
- Antes: o fluxo começava pela escolha da oferta, sem ancorar a clínica
- Depois: o fluxo começa com `Clinic name` + oferta principal, deixando claro que Seller está sendo configurado para uma MedSpa real

### 3. Continuidade do setup
- Antes: cada etapa parecia mais isolada
- Depois: `Clinic context` e `Current setup` deixam o progresso visível sem alongar o onboarding

### 4. Honestidade visual
- Antes: offer e mode podiam parecer escolhidos antes da confirmação real
- Depois: defaults deixam de parecer decisão tomada e passam a se comportar como estado pendente até escolha explícita

### 5. Linguagem
- Antes: parte da copy ainda soava estrutural demais
- Depois: o texto fala mais de clínica, paid demand, booked appointments, booking path e revenue visibility

## Riscos remanescentes
- O onboarding ainda depende de poucos campos, então parte da concretude continua vindo do framing, não de dados mais ricos da clínica.
- `Business type` ainda é exibido como contexto fixo e simples; isso é correto para o MVP, mas não adiciona muita diferenciação perceptível sozinho.
- O `booking path` ainda nasce com recomendação/default técnica do sistema; ficou mais honesto visualmente, mas o tema ainda merece vigilância nas próximas etapas.

## Julgamento final da etapa
Etapa aprovada.

O onboarding ficou mais concreto, mais real e mais conectado ao contexto comercial de uma MedSpa sem virar CRM, sem abrir campos decorativos e sem perder a velocidade do setup. A melhoria principal não foi “mais formulário”; foi uma ancoragem melhor do que o cliente está configurando e por que isso importa para booked appointments e revenue.
