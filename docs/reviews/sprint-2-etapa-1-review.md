# REVORY Sprint 2 - Etapa 1 Review

## Objetivo da etapa

Travar os templates oficiais de CSV da REVORY para `appointments` e `clients`, deixando o contrato de importacao claro antes da implementacao de parsing.

## Arquivos alterados

- docs/csv-templates.md
- public/templates/revory-appointments-template.csv
- public/templates/revory-clients-template.csv
- lib/imports/csv-template-definitions.ts
- types/imports.ts

## Contrato final corrigido

### Appointments

- Nome: REVORY Appointments Template
- Arquivo: `revory-appointments-template.csv`
- Colunas obrigatorias:
- `appointment_external_id`
- `client_full_name`
- `scheduled_at`
- `status`
- Regra de vinculo:
- pelo menos um entre `client_external_id`, `client_email` ou `client_phone`
- Colunas opcionais:
- `client_external_id`
- `client_email`
- `client_phone`
- `service_name`
- `provider_name`
- `estimated_revenue`
- `booked_at`
- `canceled_at`
- `location_name`
- `source_notes`
- Status aceitos:
- `SCHEDULED`
- `COMPLETED`
- `CANCELED`
- `NO_SHOW`

### Clients

- Nome: REVORY Clients Template
- Arquivo: `revory-clients-template.csv`
- Colunas obrigatorias:
- `full_name`
- Regra de identificacao:
- pelo menos um entre `external_id`, `email` ou `phone`
- Colunas opcionais:
- `external_id`
- `email`
- `phone`
- `last_visit_at`
- `total_visits`
- `tags`
- `notes`

## Justificativa das mudancas

- O contrato anterior foi flexibilizado porque assumia qualidade de dados acima da realidade comum de bases legadas de MedSpas.
- `clients` nao pode depender de `email` obrigatorio, porque muitas operacoes ainda usam telefone ou identificador interno.
- `appointments` nao pode depender de `client_external_id` obrigatorio, porque esse vinculo nem sempre vem de forma estavel no sistema de origem.
- A nova versao continua enxuta, mas introduz resiliencia minima com regra clara de “pelo menos um identificador”.

## Evidencias do que foi definido

- Os templates oficiais foram materializados em `public/templates/` com os headers finais.
- A documentacao do contrato foi consolidada em `docs/csv-templates.md`.
- O contrato tipado foi centralizado em `types/imports.ts`.
- As definicoes reutilizaveis foram centralizadas em `lib/imports/csv-template-definitions.ts`.
- Nenhum parser foi implementado nesta etapa.
- Nenhum builder livre foi aberto.
- Nenhuma compatibilidade excessiva foi adicionada.
- Nenhum alias foi incluido nesta versao oficial.

## Riscos conhecidos

- A regra de “pelo menos um identificador” ainda depende de validacao por linha na proxima etapa.
- `client_full_name` pode nao ser suficiente para deduplicacao sozinho, por isso ele nao foi tratado como identificador forte.
- `tags` e `notes` permanecem campos livres de transporte, sem semantica operacional definida nesta etapa.
- Como ainda nao existe parsing, divergencias de preenchimento ainda nao geram feedback funcional no produto.

## Pendencias

- Implementar leitura dos arquivos CSV.
- Validar headers recebidos contra o contrato oficial.
- Validar por linha a regra de “pelo menos um identificador”.
- Validar formatos de data, status e campos numericos durante o parsing.
- Definir a estrategia de vinculacao entre appointments CSV e clients CSV durante a importacao.

## Decisao esperada para nova revisao

- Aprovar o contrato revisado como base oficial da Sprint 2.
- Seguir para a etapa de leitura e validacao dos CSVs sem reabrir o desenho do template.
