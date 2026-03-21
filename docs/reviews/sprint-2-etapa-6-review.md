# REVORY Sprint 2 Etapa 6 Review

## Objetivo da etapa
Persistir clients e appointments importados via CSV no banco, a partir dos registros normalizados da Etapa 5, com vínculo confiável entre appointment e client e atualização agregada do DataSource para o MVP.

## Arquivos criados ou alterados
- `prisma/schema.prisma`
- `prisma/migrations/20260321015243_sprint_2_etapa_6_import_persistence/migration.sql`
- `types/imports.ts`
- `services/imports/register-csv-upload.ts`
- `services/imports/persist-import-client.ts`
- `services/imports/persist-clients-import.ts`
- `services/imports/persist-appointments-import.ts`
- `services/imports/finalize-csv-import.ts`
- `services/imports/persist-csv-import.ts`
- `src/app/(app)/app/imports/actions.ts`
- `src/app/(app)/app/imports/page.tsx`
- `components/imports/CsvUploadCard.tsx`

## Fluxo de persistência
1. A action autenticada recebe o arquivo CSV.
2. O front e o server validam arquivo presente, extensão e tamanho.
3. A validação estrutural bloqueia arquivos vazios, headers inválidos e linhas sem base mínima.
4. O parser transforma o CSV em rows válidas, warnings e rows inválidas com motivo.
5. O upload registra metadados iniciais no DataSource da fonte CSV correspondente.
6. A persistência é despachada por template:
- `clients` chama `persistClientsImport`
- `appointments` chama `persistAppointmentsImport`
7. Cada row válida é persistida em transação própria quando precisa preservar atomicidade entre client e appointment.
8. O DataSource é finalizado com contagens agregadas, status final e timestamp de conclusão.
9. A UI recebe um resultado estruturado com totalRows, successRows, errorRows, entidades persistidas e primeiras rows rejeitadas.

## Entidades afetadas
### DataSource
- Continua sendo a âncora agregada do último import por fonte CSV.
- Novos campos adicionados:
- `lastImportCompletedAt`
- `lastImportSuccessRowCount`
- `lastImportErrorRowCount`
- Campos já existentes reutilizados:
- `lastImportedAt`
- `lastImportFileName`
- `lastImportRowCount`
- `lastImportError`
- `status`
- `configJson`

### Client
- Rows válidas do template `clients` agora são persistidas.
- Rows válidas do template `appointments` também podem criar ou atualizar client mínimo para garantir vínculo confiável.

### Appointment
- Rows válidas do template `appointments` agora são persistidas.
- Cada appointment válido fica ligado a um `clientId` resolvido no mesmo fluxo transacional da row.

## Vínculo entre dados
### Regras mínimas atuais de vínculo
- Se a row trouxer `clientExternalId`, ele é usado como chave prioritária.
- Se não houver `clientExternalId`, o sistema tenta encontrar client existente por `email`.
- Se não houver match por `email`, tenta por `phone`.
- Se ainda não houver match, cria um novo client mínimo com os dados normalizados disponíveis.

### Consequência prática
- O MVP garante que appointment persistido nunca fique sem client associado.
- A resolução de vínculo é intencionalmente mínima e operacional, sem abrir deduplicação sofisticada nesta etapa.

## Contagens de import
### Semântica atual
- `totalRows`: total de rows válidas + inválidas entregues pelo parser para aquele template.
- `successRows`: rows válidas que foram persistidas com sucesso.
- `errorRows`: rows inválidas vindas do parser mais rows válidas que falharam na gravação.
- `persistedClientCount`: quantidade única de clients tocados no import.
- `persistedAppointmentCount`: quantidade única de appointments tocados no import.

### Status final agregado
- `IMPORTED` quando ao menos uma row foi persistida.
- `ERROR` quando nenhuma row conseguiu ser persistida e existem falhas.
- O status continua representando apenas o estado agregado da última tentativa, não um histórico detalhado por execução.

## Erros encontrados e tratados
### Erros já capturados antes da persistência
- arquivo vazio
- colunas obrigatórias ausentes
- rows sem dados úteis
- datas essenciais inválidas
- ausência de identificador útil
- status de appointment fora do conjunto oficial

### Erros tratados durante a persistência
- falhas de upsert/create/update por row
- conflito operacional que inviabilize gravar client ou appointment
- essas falhas entram em `errorRows` com `lineNumber` e `reasons`

## Evidências básicas de teste
### Checks do projeto
- `npx prisma migrate dev --name sprint_2_etapa_6_import_persistence`
- `npx prisma generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Smoke test real no banco
- Import de `clients`:
- totalRows: 3
- successRows: 2
- errorRows: 1
- persistedClientCount: 2
- status final da fonte: `IMPORTED`
- Import de `appointments`:
- totalRows: 2
- successRows: 1
- errorRows: 1
- persistedAppointmentCount: 1
- persistedClientCount: 1
- status final da fonte: `IMPORTED`

### Snapshot agregado observado no DataSource
- `CLIENTS_CSV`: `lastImportRowCount = 3`, `lastImportSuccessRowCount = 2`, `lastImportErrorRowCount = 1`
- `APPOINTMENTS_CSV`: `lastImportRowCount = 2`, `lastImportSuccessRowCount = 1`, `lastImportErrorRowCount = 1`
- ambos com `lastImportCompletedAt` preenchido

## Rationale técnico
- A persistência foi separada por template para manter clareza e baixo acoplamento.
- O helper de client ficou reutilizável porque tanto import de clients quanto import de appointments precisam resolver ou criar client.
- A transação foi aplicada no nível da row de appointment, onde client e appointment precisam ficar consistentes juntos.
- O DataSource continua enxuto e serve como resumo operacional do último import, sem criar estrutura enterprise de job history nesta etapa.

## Pendências
- definir política mais explícita de deduplicação e idempotência fina nas próximas etapas
- decidir se partial import deve continuar como `IMPORTED` ou ganhar estado mais específico futuramente
- persistir histórico detalhado por execução, se o produto realmente precisar disso
- expor na UI uma visão mais completa das rows rejeitadas quando o volume crescer

## Riscos conhecidos
- matching por `email` ou `phone` ainda é mínimo e pode aproximar registros que precisariam de reconciliação mais forte
- reimportações sem `externalId` ainda dependem dessa política mínima de matching
- `DataSourceStatus` continua agregado demais para observabilidade detalhada de múltiplas execuções
- o MVP ainda não faz deduplicação sofisticada nem reconciliação cross-file entre imports de clients e appointments
