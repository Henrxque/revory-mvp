# Domain Model - REVORY MVP

Este documento descreve o modelo de dominio inicial do MVP da REVORY. O objetivo e alinhar implementacao, schema e integracoes com uma base simples e suficiente para a primeira fase do produto.

## User

### Proposito

Representa o usuario autenticado que acessa o produto e opera um ou mais workspaces.

### Campos Minimos Sugeridos

- `id`
- `clerkUserId`
- `email`
- `fullName`
- `status`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um ou mais `Workspace`
- pode iniciar ou atualizar `ActivationSetup`
- pode executar ou acompanhar `AutomationRun`

### O Que e Obrigatorio no MVP

- identificacao unica local
- vinculo com `clerkUserId`
- email
- status basico de acesso

## Workspace

### Proposito

Representa a unidade principal de operacao do cliente dentro do sistema.

### Campos Minimos Sugeridos

- `id`
- `name`
- `slug`
- `ownerUserId`
- `status`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- possui um `User` owner
- possui um `MedSpaProfile`
- possui um `ActivationSetup`
- possui varios `DataSource`
- possui varios `Client`
- possui varios `Appointment`
- possui varios `RecoveryOpportunity`
- possui varios `ReviewRequest`
- possui varios `MetricsSnapshot`

### O Que e Obrigatorio no MVP

- nome
- slug unico
- owner principal
- status ativo ou inicial

## MedSpaProfile

### Proposito

Armazena os dados operacionais e comerciais basicos do MedSpa dentro do workspace.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `brandName`
- `businessType`
- `timezone`
- `phone`
- `addressLine`
- `city`
- `state`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um `Workspace`

### O Que e Obrigatorio no MVP

- `workspaceId`
- nome da marca
- timezone

## ActivationSetup

### Proposito

Representa o estado de onboarding e ativacao inicial do workspace.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `currentStep`
- `isCompleted`
- `completedAt`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um `Workspace`
- pode ser atualizado por `User`

### O Que e Obrigatorio no MVP

- um registro por workspace
- etapa atual
- flag de conclusao

## DataSource

### Proposito

Representa cada origem de dados conectada ou importada para alimentar o MVP.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `type`
- `name`
- `status`
- `lastSyncAt`
- `configJson`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um `Workspace`
- pode originar `Client`
- pode originar `Appointment`

### O Que e Obrigatorio no MVP

- `workspaceId`
- tipo da origem
- nome identificador
- status

## Client

### Proposito

Representa o cliente final do MedSpa dentro do workspace.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `externalId`
- `firstName`
- `lastName`
- `email`
- `phone`
- `birthDate`
- `lastVisitAt`
- `tagsJson`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um `Workspace`
- pode estar associado a um `DataSource`
- possui varios `Appointment`
- pode gerar `RecoveryOpportunity`
- pode receber `ReviewRequest`

### O Que e Obrigatorio no MVP

- `workspaceId`
- identificador minimo do cliente
- pelo menos um canal de contato quando disponivel

## Appointment

### Proposito

Representa agendamentos e atendimentos usados para operacao, recuperacao e metricas.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `clientId`
- `dataSourceId`
- `externalId`
- `status`
- `serviceName`
- `scheduledAt`
- `completedAt`
- `canceledAt`
- `providerName`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um `Workspace`
- pertence a um `Client`
- pode vir de um `DataSource`
- pode originar `RecoveryOpportunity`
- pode originar `ReviewRequest`

### O Que e Obrigatorio no MVP

- `workspaceId`
- `clientId`
- status
- data agendada ou concluida

## FlowMode

### Proposito

Define o modo operacional de fluxo usado em automacoes e regras simples do MVP.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `key`
- `name`
- `isActive`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um `Workspace`
- pode ser usado por `AutomationRun`
- pode ser usado por `RecoveryOpportunity`
- pode ser usado por `ReviewRequest`

### O Que e Obrigatorio no MVP

- `workspaceId`
- chave unica por workspace
- estado ativo

## AutomationRun

### Proposito

Registra cada execucao de automacao ou job simples do sistema.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `flowModeId`
- `jobType`
- `status`
- `payloadJson`
- `resultJson`
- `scheduledFor`
- `startedAt`
- `finishedAt`
- `errorMessage`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um `Workspace`
- pode usar um `FlowMode`

### O Que e Obrigatorio no MVP

- `workspaceId`
- tipo do job
- status
- timestamps basicos de execucao

## RecoveryOpportunity

### Proposito

Representa uma oportunidade identificada de recuperar receita, retorno ou reengajamento de cliente.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `clientId`
- `appointmentId`
- `flowModeId`
- `status`
- `reason`
- `estimatedValue`
- `detectedAt`
- `resolvedAt`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um `Workspace`
- pertence a um `Client`
- pode estar vinculada a um `Appointment`
- pode usar um `FlowMode`

### O Que e Obrigatorio no MVP

- `workspaceId`
- `clientId`
- status
- motivo principal da oportunidade

## ReviewRequest

### Proposito

Controla pedidos de avaliacao enviados ao cliente apos atendimento.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `clientId`
- `appointmentId`
- `flowModeId`
- `status`
- `channel`
- `requestedAt`
- `deliveredAt`
- `completedAt`
- `createdAt`
- `updatedAt`

### Relacionamentos Principais

- pertence a um `Workspace`
- pertence a um `Client`
- pode estar vinculada a um `Appointment`
- pode usar um `FlowMode`

### O Que e Obrigatorio no MVP

- `workspaceId`
- `clientId`
- canal de envio
- status

## MetricsSnapshot

### Proposito

Armazena snapshots simples de metricas agregadas para leitura rapida no produto.

### Campos Minimos Sugeridos

- `id`
- `workspaceId`
- `periodType`
- `periodStart`
- `periodEnd`
- `totalClients`
- `totalAppointments`
- `completedAppointments`
- `recoveryOpportunities`
- `reviewRequestsSent`
- `createdAt`

### Relacionamentos Principais

- pertence a um `Workspace`

### O Que e Obrigatorio no MVP

- `workspaceId`
- periodo do snapshot
- campos agregados essenciais para dashboard inicial

## Observacoes Gerais do MVP

- todas as entidades operacionais devem carregar `workspaceId` quando aplicavel
- `status` deve ser simples e controlado por enums curtos
- campos `Json` podem ser usados apenas onde evitam criar estruturas prematuras
- audit trail detalhado, versionamento e soft delete ficam fora do escopo inicial
