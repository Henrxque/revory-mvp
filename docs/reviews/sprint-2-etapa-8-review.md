# REVORY Sprint 2 Etapa 8 Review

## Objetivo da etapa
Atualizar o dashboard da area autenticada para substituir placeholders por dados reais ja disponiveis apos a importacao CSV, mantendo a linguagem premium e a separacao honesta entre o que ja existe e o que ainda depende das automacoes futuras.

## Arquivos criados ou alterados
- `services/dashboard/get-dashboard-overview.ts`
- `src/app/(app)/app/dashboard/page.tsx`

## Cards alterados
### Cards agora alimentados por dados reais
- `Appointments Monitored`
- `Clients Imported`
- `Upcoming Appointments`
- `Cancelled Appointments`
- `Estimated Imported Revenue`

### Cards que continuam futuros de forma explicita
- `Confirmation Rate`
- `Revenue Recovered`
- `Revenue Protected`

## Origem das metricas
### Appointments Monitored
- origem: `prisma.appointment.count`
- semantica atual: total de appointments persistidos e importados no workspace
- nesta sprint, o card nao representa monitoramento automatizado em tempo real nem monitoramento continuo por automacao

### Clients Imported
- origem: `prisma.client.count`
- semantica atual: total de clients persistidos no workspace

### Upcoming Appointments
- origem: `prisma.appointment.count`
- filtro atual: `scheduledAt >= now` e `status = SCHEDULED`
- referencia temporal atual: `now` gerado no momento da renderizacao server-side do dashboard
- nesta etapa, isso funciona como aproximacao operacional do MVP e ainda eh sensivel a timezone

### Cancelled Appointments
- origem: `prisma.appointment.count`
- filtro atual: `status = CANCELED`

### Estimated Imported Revenue
- origem: `prisma.appointment.aggregate`
- campo somado: `estimatedRevenue`
- semantica atual: soma de `estimatedRevenue` presente nos appointments importados e persistidos
- nao representa receita realizada
- nao representa receita protegida
- nao representa receita recuperada
- ainda nao possui periodizacao financeira avancada
- observacao: quando nenhuma base de revenue existir no import, o card nao inventa valor e permanece como `Awaiting revenue base`

### Import Readiness
- origem: `prisma.dataSource.findMany`
- semantica atual: tracking e readiness da importacao, nao metrica operacional de negocio
- os dados exibidos refletem o ultimo estado agregado salvo das fontes CSV
- ainda nao existe historico detalhado por execucao
- dados usados:
- `status`
- `lastImportFileName`
- `lastImportedAt`
- `lastImportRowCount`
- `lastImportSuccessRowCount`
- `lastImportErrorRowCount`

## O que ficou real
- o dashboard agora mostra contagem real de appointments persistidos
- o dashboard agora mostra contagem real de clients persistidos
- o dashboard agora mostra appointments futuros reais dentro do estado atual importado
- o dashboard agora mostra appointments cancelados reais
- o dashboard agora soma `estimatedRevenue` quando esse dado existe nos appointments importados
- a secao `Import Readiness` mostra o estado real das fontes `Appointments CSV` e `Clients CSV`

## O que continua placeholder e por que
- `Confirmation Rate` continua futuro porque depende de eventos reais de confirmacao e automacoes que ainda nao existem
- `Revenue Recovered` continua futuro porque depende de recovery logic e outcomes operacionais ainda fora do escopo atual
- `Revenue Protected` continua futuro porque depende de sinais de prevencao e monitoramento automatico ainda nao implementados

## Evidencias de UI final
### Estrutura final da pagina
- header principal com contexto ativado do workspace
- bloco lateral de status do setup com `Activation`, `Activated At` e `Active Mode`
- secao `Real Imported Metrics` com badge visual de dado real
- secao `Future Metrics` com badge visual de camada futura
- secao `Import Readiness` com fontes CSV e contagens agregadas
- secao `Next Steps` preservada para orientar o usuario com clareza

### Evidencias tecnicas
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- rota `app/dashboard` continua protegida e renderiza com o novo service server-side

## Rationale tecnico
- o dashboard foi movido de placeholders genericos para metricas que o banco ja consegue sustentar hoje
- a leitura das metricas ficou concentrada em `get-dashboard-overview.ts`, evitando acoplamento desnecessario da UI com varias queries soltas
- o visual continua separado entre `real now` e `future layer`, o que evita prometer automacoes ou sinais ainda inexistentes

## Riscos conhecidos
- `Appointments Monitored` ainda representa apenas base importada, nao monitoramento ativo por automacao
- `Estimated Imported Revenue` depende da qualidade e presenca de `estimatedRevenue` no CSV
- `Upcoming Appointments` depende do timezone e da qualidade do `scheduledAt` persistido
- `Cancelled Appointments` reflete apenas o status importado, nao eventos operacionais ao vivo

## Pendencias
- definir quando e como `Confirmation Rate` passa da camada futura para dado real
- decidir se o dashboard precisara de periodizacao ou snapshots quando o volume crescer
- evoluir a observabilidade da importacao sem misturar isso com metricas operacionais futuras
