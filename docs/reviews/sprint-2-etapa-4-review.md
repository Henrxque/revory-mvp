# REVORY Sprint 2 - Etapa 4 Review

## Regras de validacao

A Etapa 4 adicionou validacao estrutural antes do parsing completo dos CSVs oficiais.

As regras foram organizadas em `schemas/imports` e `services/imports` para permitir reutilizacao nas proximas etapas.

### Validacoes bloqueantes

- arquivo vazio
- ausencia de colunas obrigatorias no header
- ausencia de valor em coluna obrigatoria por linha, considerando apenas os campos tratados como obrigatorios no contrato estrutural atual e nao toda a validacao semantica final de negocio, que segue para parsing e normalizacao nas proximas etapas
- ausencia de identificador minimo exigido pela regra `atLeastOneOf`
- data invalida em campo essencial
- arquivo sem nenhuma linha util apos o header

### Warnings nao bloqueantes

- linhas sem dados uteis
- datas invalidas em campos opcionais de data

## Tabela de erros e warnings

### Errors

- `file_empty`
  - bloqueia upload estruturalmente invalido
- `missing_required_columns`
  - bloqueia quando o header nao respeita o contrato oficial
- `missing_required_value`
  - bloqueia quando uma linha nao preenche coluna obrigatoria do contrato estrutural atual, sem representar ainda toda a validacao semantica final do import
- `missing_identifier`
  - bloqueia quando a linha nao fornece nenhum identificador valido exigido pelo contrato
- `invalid_required_date`
  - bloqueia quando o campo de data essencial esta invalido

### Warnings

- `empty_data_rows`
  - linha ignorada por nao conter dados uteis
- `invalid_optional_date`
  - warning quando o campo de data opcional esta invalido

## Exemplos de arquivos aceitos e rejeitados

### Exemplo aceito

Appointments:

```text
appointment_external_id,client_full_name,client_email,scheduled_at,status
apt_001,Ana Silva,ana@example.com,2026-03-20T10:00:00Z,SCHEDULED
```

Resultado esperado:

- aceito estruturalmente
- sem erros
- sem warnings

### Exemplo rejeitado

Appointments:

```text
appointment_external_id,client_full_name,scheduled_at,status
apt_002,,not-a-date,SCHEDULED
```

Resultado esperado:

- rejeitado estruturalmente
- erro por `client_full_name` ausente
- erro por falta de identificador de cliente
- erro por data essencial invalida em `scheduled_at`

## Evidencias basicas de teste

Validacoes tecnicas executadas:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Smoke test real do validador executado com `npx tsx`:

- caso aceito
  - `accepted: true`
  - `errors: 0`
  - `warnings: 0`
  - `rows: 1`
- caso rejeitado
  - `accepted: false`
  - erros retornados:
  - `Line 2 is missing a value for required column "client_full_name".`
  - `Line 2 must include at least one identifier from: client_external_id, client_email, client_phone.`
  - `Line 2 has an invalid date in essential column "scheduled_at". Use ISO 8601.`

## Pendencias

- implementar parser real por template
- validar formatos adicionais como status e numericos
- decidir politica de bloqueio parcial versus importacao parcial por linha
- persistir relatorio estruturado de validacao para a UI

## Riscos conhecidos

- a validacao estrutural usa leitura leve de CSV e nao resolve ainda todos os casos avancados de escaping e semantica de dados
- warnings ainda nao sao persistidos como historico detalhado por execucao
- a camada atual ainda trabalha com validacao estrutural e nao com reconciliacao de upsert/importacao final
