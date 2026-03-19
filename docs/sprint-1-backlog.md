# Sprint 1 Backlog - REVORY MVP

| ID | tarefa | descricao | dependencias | entregavel | prioridade |
|---|---|---|---|---|---|
| S1-01 | Configurar base do banco e Prisma | Preparar Prisma no projeto, aplicar schema inicial e deixar o acesso ao banco pronto para user, workspace e activation setup. | schema Prisma definido | prisma configurado e banco pronto para os fluxos da sprint | Alta |
| S1-02 | Configurar autenticacao base | Integrar Clerk no projeto, preparar providers, rotas protegidas e fluxo inicial de login e signup. | setup inicial do projeto | autenticacao funcional com login, signup e sessao ativa | Alta |
| S1-03 | Sincronizar usuario autenticado com banco local | Garantir criacao ou sincronizacao do registro `User` a partir do `clerkUserId` e do email autenticado. | S1-01, S1-02 | usuario autenticado persistido no banco local | Alta |
| S1-04 | Implementar criacao de workspace | Criar fluxo e tela inicial para criar `Workspace` com nome, slug, owner e estado inicial. | S1-03 | workspace criado com owner vinculado | Alta |
| S1-05 | Inicializar ActivationSetup no workspace | Criar automaticamente o registro `ActivationSetup` ao criar workspace, com `currentStep` inicial e estado nao concluido. | S1-01, S1-04 | onboarding persistido desde o primeiro acesso ao workspace | Alta |
| S1-06 | Estruturar shell do onboarding wizard | Implementar a tela base do wizard com stepper, carregamento do estado atual e navegacao entre etapas. | S1-04, S1-05 | shell do wizard funcional com navegacao controlada | Alta |
| S1-07 | Implementar etapa de template MedSpa | Criar a etapa que apresenta e salva o template MedSpa no `ActivationSetup`. | S1-06 | etapa de template persistindo `selectedTemplate` | Alta |
| S1-08 | Persistir escolha do tipo de fonte | Criar a etapa do wizard para registrar o tipo de `DataSource` escolhido no MVP, sem implementar conexao real ou import real nesta sprint. | S1-01, S1-06 | escolha do tipo de fonte persistida no onboarding | Alta |
| S1-09 | Implementar UI placeholder de conexao ou import | Criar a UI e o estado placeholder da etapa de fonte, preparando o caminho para conexao real, upload real e parsing real na Sprint 2. | S1-06, S1-08 | etapa de fonte funcional em nivel de placeholder, com proximos passos claros | Alta |
| S1-10 | Implementar etapa de canal principal | Criar a etapa para definir `primaryChannel`, mantendo email como padrao do MVP. | S1-06 | etapa de canal persistindo configuracao principal | Media |
| S1-11 | Implementar etapa de Google Reviews | Criar a etapa para salvar `googleReviewsUrl` no wizard com validacao simples. | S1-06 | etapa de reviews persistindo link do Google Reviews | Media |
| S1-12 | Implementar etapa de modo recomendado | Criar a etapa para selecionar `recommendedModeKey` com base nos modos fechados do MVP. | S1-06 | etapa persistindo modo recomendado no onboarding | Media |
| S1-13 | Persistir progresso do wizard por etapa | Garantir salvamento incremental do `ActivationSetup`, incluindo `currentStep`, valores preenchidos e retomada do fluxo. | S1-07, S1-08, S1-09, S1-10, S1-11, S1-12 | wizard retomavel com estado salvo no banco | Alta |
| S1-14 | Implementar ativacao final do workspace | Concluir o wizard, marcar `ActivationSetup.isCompleted`, preencher `activatedAt`, atualizar `Workspace.status` e `activeModeKey`. | S1-13 | ativacao funcional e persistida | Alta |
| S1-15 | Implementar dashboard placeholder | Criar tela inicial do dashboard com header, placeholders de KPI e estados vazios guiados para workspace recem-ativado. | S1-14 | dashboard placeholder funcional apos ativacao | Alta |
| S1-16 | Criar redirecionamento pos-ativacao | Direcionar o usuario para o dashboard logo apos a ativacao concluida. | S1-14, S1-15 | fluxo pos-ativacao concluido sem quebra | Media |
| S1-17 | Proteger rotas por estado de onboarding | Garantir que usuarios nao ativados voltem ao wizard e usuarios ativados acessem o dashboard. | S1-14, S1-15 | navegacao coerente entre autenticacao, wizard e dashboard | Media |
| S1-18 | Validar UX minima do fluxo | Revisar erros, estados vazios, feedbacks de sucesso e loading no login, criacao de workspace, wizard e dashboard placeholder. | S1-01 a S1-17 | fluxo base utilizavel de ponta a ponta | Media |
