# REVORY Sprint 2 Etapa 7 Review

## Objetivo da etapa
Aplicar a politica minima de idempotencia e reimportacao segura da Sprint 2, evitando duplicacao evidente ao reenviar o mesmo CSV e retornando contagens claras de `create` vs `update`.

## Estrategia adotada
### Clients
- chave primaria preferencial: `externalId`
- fallback simples quando `externalId` nao existir:
- `email`
- `phone`
- ordem adotada no MVP: primeiro `email`, depois `phone`
- justificativa da ordem: `email` tende a ser um identificador mais confiavel e menos ambiguo para matching operacional
- `phone` continua util como fallback, mas pode ser mais ambiguo em bases legadas, compartilhadas ou operacionais

### Appointments
- chave primaria preferencial: `externalId`
- fallback simples quando um fluxo futuro nao trouxer `externalId`:
- `clientId + scheduledAt + serviceName`
- esse fallback eh best effort e serve apenas como protecao minima contra duplicacao evidente
- ele nao deve ser lido como chave operacional forte
- pequenas variacoes em `serviceName` podem quebrar esse matching e levar a create em vez de update

## Comportamento de create vs update
### Client
- se encontrar `externalId`, atualiza o registro existente
- se nao houver `externalId`, tenta localizar client existente por `email`
- se nao houver match por `email`, tenta por `phone`
- se nao encontrar match, cria um novo client

### Appointment
- se encontrar `externalId`, atualiza o appointment existente
- se nao houver match por `externalId`, tenta fallback por `clientId + scheduledAt + serviceName`
- se ainda nao encontrar match, cria um novo appointment

### Semantica atual de `updatedClientCount` e `updatedAppointmentCount`
- qualquer match que entre no caminho de update conta como `update`
- nesta etapa, a contagem nao depende de detectar diff material campo a campo
- em outras palavras: match seguido de update operacional conta como `update`, mesmo que os valores finais acabem equivalentes aos ja persistidos

## Resultado final retornado para a UI
- `createdClientCount`
- `updatedClientCount`
- `createdAppointmentCount`
- `updatedAppointmentCount`
- `persistedClientCount`
- `persistedAppointmentCount`
- `successRows`
- `errorRows`
- `totalRows`

### Escopo dessas contagens
- essas contagens representam apenas a execucao atual da importacao ou reimportacao
- elas nao representam historico consolidado de execucoes anteriores
- historico detalhado por execucao ainda nao existe nesta etapa
- Ainda nao existe historico detalhado por execucao de importacao. As contagens e sinais desta etapa representam apenas o resultado da execucao atual e/ou o ultimo estado agregado salvo no `DataSource`, nao uma trilha historica consolidada de execucoes anteriores. Isso e aceitavel para o MVP da Sprint 2, mas deve voltar a mesa quando a REVORY evoluir a observabilidade e o import history.

## Exemplos de reimport
### Reimport de clients sem `externalId`, usando fallback por `email`
Primeira importacao do mesmo CSV:
- `createdClientCount = 1`
- `updatedClientCount = 0`
- total final no banco: 1 client

Segunda importacao do mesmo CSV:
- `createdClientCount = 0`
- `updatedClientCount = 1`
- total final no banco: continua 1 client

### Reimport de appointments com `externalId`
Primeira importacao do mesmo CSV:
- `createdAppointmentCount = 1`
- `updatedAppointmentCount = 0`
- total final no banco: 1 appointment

Segunda importacao do mesmo CSV:
- `createdAppointmentCount = 0`
- `updatedAppointmentCount = 1`
- total final no banco: continua 1 appointment

## Evidencias basicas de teste
### Checks do projeto
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Smoke test real de reimportacao
- `clientImport1`: create 1, update 0
- `clientImport2`: create 0, update 1
- `appointmentImport1`: create 1, update 0
- `appointmentImport2`: create 0, update 1
- contagem final do workspace de teste:
- `clients = 1`
- `appointments = 1`

## Limitacoes conhecidas
- matching de client continua minimo e nao tenta reconciliar conflitos entre `email` e `phone`
- fallback de appointment eh intencionalmente simples e nao tenta resolver colisoes operacionais mais complexas
- se um mesmo registro aparecer duplicado dentro do mesmo arquivo com pequenas variacoes, o MVP nao garante reconciliacao perfeita
- a estrategia atual evita duplicacao evidente, nao matching perfeito

## Riscos conhecidos
- dois clients diferentes podem compartilhar um telefone operacional ou um email legado em bases antigas
- `serviceName` pode nao ser estavel o suficiente em todos os exports para servir como parte forte de fallback em appointment
- reimportacoes de arquivos com dados ambiguos ainda podem atualizar o registro errado sob a politica minima atual

## Proximos passos
- refinar a politica de reconciliacao por fonte quando a Sprint 2 avancar para observabilidade e import history
- decidir se o fallback de appointment deve ganhar mais contexto operacional antes de evoluir para producao mais ampla
- avaliar metricas de reimport e conflitos para calibrar uma politica mais forte sem abrir matching excessivamente complexo
