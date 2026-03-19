# User Journey - REVORY MVP

Este documento descreve a jornada obrigatoria do usuario no MVP da REVORY. O objetivo e alinhar implementacao de produto, persistencia de dados e estados de interface sem alterar o fluxo definido.

## 1. Usuario chega pela landing

### Objetivo

Apresentar a proposta do produto e levar o usuario para criacao de conta.

### Dados Salvos

- nenhum dado obrigatorio no banco nesta etapa
- opcionalmente eventos anonimos de navegacao em ferramenta de analytics

### Estado de Sucesso

- usuario clica no CTA principal e inicia criacao de conta

### Possiveis Friccoes

- proposta de valor pouco clara
- CTA pouco visivel
- duvida sobre compatibilidade com MedSpa

## 2. Cria conta

### Objetivo

Registrar o usuario autenticado e habilitar entrada no produto.

### Dados Salvos

- `User.clerkUserId`
- `User.email`
- `User.fullName`
- `User.status`

### Estado de Sucesso

- conta criada com sucesso
- sessao autenticada ativa
- usuario pronto para criar workspace

### Possiveis Friccoes

- falha no fluxo de autenticacao
- email invalido ou nao confirmado
- abandono por excesso de campos

## 3. Cria workspace

### Objetivo

Criar a unidade principal de operacao do cliente dentro do sistema.

### Dados Salvos

- `Workspace.name`
- `Workspace.slug`
- `Workspace.ownerUserId`
- `Workspace.status`
- `Workspace.activeModeKey` com valor inicial padrao
- `ActivationSetup.workspaceId`
- `ActivationSetup.currentStep`
- `ActivationSetup.isCompleted`

### Estado de Sucesso

- workspace criado
- owner vinculado
- onboarding inicial criado

### Possiveis Friccoes

- nome de workspace invalido
- `slug` ja utilizado
- usuario nao entende a diferenca entre conta e workspace

## 4. Escolhe template MedSpa

### Objetivo

Selecionar o template MedSpa que orienta o setup inicial do produto.

### Dados Salvos

- `ActivationSetup.selectedTemplate`
- `ActivationSetup.currentStep`

### Estado de Sucesso

- template salvo
- onboarding avanca para configuracao de fonte

### Possiveis Friccoes

- duvida sobre o que o template MedSpa ativa no produto
- descricao insuficiente do template MedSpa

## 5. Conecta fonte suportada ou sobe CSV

### Objetivo

Trazer dados operacionais para appointments, clientes e metricas iniciais.

### Dados Salvos

- `DataSource.workspaceId`
- `DataSource.type`
- `DataSource.name`
- `DataSource.status`
- `DataSource.configJson`
- `DataSource.lastSyncAt` quando aplicavel

### Estado de Sucesso

- pelo menos uma fonte criada
- fonte marcada como conectada ou pronta para importacao
- sistema apto a receber appointments e clients

### Possiveis Friccoes

- erro de autenticacao com calendario
- CSV com formato invalido
- usuario nao sabe qual fonte escolher
- demora na importacao inicial

## 6. Define canal principal

### Objetivo

Definir o canal principal de comunicacao do MVP, mantendo a operacao email-first.

### Dados Salvos

- `ActivationSetup.primaryChannel`
- `ActivationSetup.currentStep`

### Estado de Sucesso

- canal principal salvo
- email tratado como canal padrao do MVP
- onboarding segue para etapa de reviews

### Possiveis Friccoes

- usuario espera canais fora do escopo do MVP
- usuario interpreta SMS como equivalente ao email, quando o MVP e email-first

## 7. Adiciona link do Google Reviews

### Objetivo

Preparar o workspace para geracao de pedidos de review com destino correto.

### Dados Salvos

- `ActivationSetup.googleReviewsUrl`
- `ActivationSetup.currentStep`

### Estado de Sucesso

- link salvo em formato valido
- workspace pronto para acionar review requests

### Possiveis Friccoes

- usuario nao possui o link pronto
- URL invalida ou incompleta
- dificuldade para localizar o link correto do Google Reviews

## 8. Escolhe modo recomendado

### Objetivo

Selecionar o modo operacional recomendado entre os modos fechados do MVP, para servir de base ao modo ativo aplicado na ativacao do workspace.

### Dados Salvos

- `ActivationSetup.recommendedModeKey`
- `ActivationSetup.currentStep`

### Estado de Sucesso

- modo recomendado registrado no onboarding
- usuario entende como o produto vai operar no inicio
- base pronta para definir o `Workspace.activeModeKey` na ativacao

### Possiveis Friccoes

- diferenca entre modos pouco clara
- inseguranca para seguir a recomendacao

## 9. Ativa a conta

### Objetivo

Concluir o onboarding e transformar o workspace em ambiente operacional ativo.

### Dados Salvos

- `ActivationSetup.isCompleted`
- `ActivationSetup.activatedAt`
- `ActivationSetup.currentStep`
- `Workspace.status`
- `Workspace.activeModeKey`

### Estado de Sucesso

- onboarding concluido
- workspace ativo
- modo operacional aplicado
- usuario redirecionado para o dashboard inicial

### Possiveis Friccoes

- falta de algum dado obrigatorio anterior
- duvida sobre o que acontece apos ativacao
- ativacao sem dados suficientes para o dashboard

## 10. Ve dashboard inicial

### Objetivo

Entregar visao inicial de operacao, monitoramento e valor gerado pelo produto.

### Dados Salvos

- leitura principal de `MetricsSnapshot`
- opcionalmente criacao de `AutomationRun` para sync ou processamento inicial

### Estado de Sucesso

- dashboard carregado com dados iniciais
- usuario entende rapidamente status do workspace
- principais KPIs ficam visiveis
- quando ainda nao houver dados suficientes, o produto mostra estado vazio guiado

### Possiveis Friccoes

- dashboard vazio por falta de dados importados
- atraso no primeiro processamento
- KPI sem contexto suficiente para primeira leitura

## 11. Ve riscos, recovery e reviews

### Objetivo

Expor o valor central do MVP: reduzir no-shows, recuperar horarios vazios e gerar reviews.

### Dados Salvos

- leitura de `RecoveryOpportunity`
- leitura de `ReviewRequest`
- leitura de `MetricsSnapshot`
- criacao de `AutomationRun` quando houver execucao de jobs do MVP

### Estado de Sucesso

- usuario visualiza riscos operacionais
- usuario entende oportunidades de recovery
- usuario acompanha pedidos de review e impacto em revenue protected / recovered

### Possiveis Friccoes

- baixo volume inicial de dados
- regras de risco ainda nao geraram oportunidades suficientes
- usuario nao entende como revenue protected e revenue recovered sao calculados

## Observacoes de Implementacao

- a jornada deve ser tratada como fluxo guiado e nao como builder livre
- `ActivationSetup.currentStep` deve refletir exatamente a etapa atual do wizard
- a ativacao so deve ocorrer quando os dados obrigatorios do onboarding estiverem completos
- o dashboard inicial depende da existencia minima de fonte conectada ou importada
