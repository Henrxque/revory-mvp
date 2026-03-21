# REVORY Sprint 2 - Etapa 5 Review

## Fluxo do parser

A Etapa 5 adicionou a base real de parsing e normalizacao minima dos CSVs oficiais.

O fluxo implementado ficou assim:

1. leitura do CSV bruto
2. validacao estrutural anterior continua rodando
3. parsing por template
4. separacao entre `raw row`, `parsed row` e `normalized row`
5. classificacao final em:
- rows validas
- warnings
- rows invalidas com motivo

Servicos criados:

- `services/imports/read-csv.ts`
- `services/imports/normalize-import-values.ts`
- `services/imports/parse-appointments-csv.ts`
- `services/imports/parse-clients-csv.ts`
- `services/imports/parse-csv-by-template.ts`

Integracao minima:

- o upload em `src/app/(app)/app/imports/actions.ts` agora chama o parser depois da validacao estrutural
- ainda nao persiste `Client` e `Appointment`
- registra apenas resumo e metadados iniciais para a proxima etapa

## Exemplos de input e output

### Appointments input

```text
appointment_external_id,client_full_name,client_email,scheduled_at,status,estimated_revenue
apt_001,  Ana   Silva  ,ANA@EXAMPLE.COM,2026-03-20T10:00:00Z,no show,$199.90
apt_002,Caio,,invalid-date,SCHEDULED,abc
```

### Appointments output resumido

- 1 row valida
- 1 row invalida
- normalizacoes observadas:
- `client_full_name` com espacos colapsados
- `client_email` em lowercase
- `status` normalizado para `NO_SHOW`
- `estimatedRevenue` normalizado para `199.9`
- motivos da row invalida:
- `Scheduled date could not be normalized.`
- `No usable client identifier remained after normalization.`

### Clients input

```text
full_name,email,phone,total_visits,last_visit_at,tags
  maria   costa  ,MARIA@EXAMPLE.COM,(11) 99999-0000,5,2026-03-18T09:00:00Z,vip;returning
Joao,,,x,not-a-date,lead
```

### Clients output resumido

- 1 row valida
- 1 row invalida
- normalizacoes observadas:
- `full_name` com espacos colapsados
- `email` em lowercase
- `phone` para formato focado em digitos
- `totalVisits` para inteiro
- `tags` para lista tipada
- motivos da row invalida:
- `No usable client identifier remained after normalization.`

## Decisoes de normalizacao

- nomes:
- trim + colapso de espacos internos
- `full_name` e `client_full_name` sao os campos canonicos de nome nesta etapa
- o parser nao tenta quebrar automaticamente nome em `firstName` e `lastName`
- qualquer modelagem mais refinada de nome fica para evolucao futura, se realmente necessaria
- emails:
- trim + lowercase
- telefones:
- remocao de caracteres nao numericos, preservando `+` quando aplicavel
- datas obrigatorias:
- parse para `Date`, com row invalida se falhar
- datas opcionais:
- parse para `Date`, com warning e `null` se falhar
- status de appointment:
- trim + uppercase + normalizacao de espacos/hifens para `_`
- se o status nao puder ser normalizado para um valor oficial, nao existe fallback nesta etapa
- nesse caso a row fica invalida
- o parser tambem emite `invalid_appointment_status` como sinal adicional de observabilidade, mas a classificacao final da row continua invalida
- `estimatedRevenue`:
- remocao de simbolo monetario e virgulas antes de converter para numero
- `totalVisits`:
- parse para inteiro
- `tags`:
- separacao por `;`, `,` ou `|`

## Warnings suportados

- `normalized_name`
- `normalized_email`
- `normalized_phone`
- `invalid_optional_date`
- `invalid_estimated_revenue`
- `invalid_total_visits`

## Sinais que invalidam a row

- `missing_usable_identifier`
  - quando nenhum identificador util permanece apos a normalizacao, a row fica invalida
  - o parser ainda registra esse sinal para observabilidade, mas ele nao deve ser lido como warning isolado que preserva a row como valida
- `invalid_appointment_status`
  - quando o status nao entra em `SCHEDULED`, `COMPLETED`, `CANCELED` ou `NO_SHOW`, a row fica invalida
  - nao ha fallback automatico nesta etapa
  - o sinal pode ser emitido para observabilidade, mas nao deve ser interpretado como warning que mantem a row valida

## Limitacoes atuais

- ainda nao existe persistencia de rows validas em `Client` e `Appointment`
- ainda nao existe reconciliacao de upsert, deduplicacao ou idempotencia final
- a normalizacao permanece minima e pragmatica, sem heuristicas avancadas
- warnings e invalid rows ainda nao sao exibidos como relatorio detalhado na UI
- o parser trabalha sobre o contrato oficial e nao tenta compatibilidade excessiva

## Proximos passos

- persistir rows validas por template
- definir politica de import parcial versus bloqueio por arquivo
- implementar upsert/deduplicacao para `Client`
- implementar vinculacao entre `Appointment` e `Client`
- expor relatorio de validas, invalidas e warnings de forma mais completa na UX
