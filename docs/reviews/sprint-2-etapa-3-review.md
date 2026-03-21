# REVORY Sprint 2 - Etapa 3 Review

## Resumo da UX implementada

A Etapa 3 criou a experiencia real de upload/import CSV dentro da area autenticada em `/app/imports`.

A tela foi desenhada para parecer produto real e nao uma ferramenta tecnica isolada:

- bloco principal explicando o que esta acontecendo agora
- cards separados para appointments e clients
- botao para baixar o template oficial de cada fluxo
- upload real de arquivo CSV
- feedback de upload em andamento
- feedback claro de recebimento do arquivo, sem ainda indicar sucesso completo da importação linha a linha
- feedback de erro
- contexto do ultimo arquivo recebido e status da origem

O escopo ficou propositalmente limitado a validacao basica e registro de metadados iniciais do upload. Nao ha parsing completo nesta etapa.

## Rotas criadas e alteradas

### Criada

- `src/app/(app)/app/imports/page.tsx`

### Alterada

- `src/app/(app)/app/layout.tsx`

## Componentes criados e alterados

### Criado

- `components/imports/CsvUploadCard.tsx`
- `src/app/(app)/app/imports/actions.ts`
- `services/imports/register-csv-upload.ts`
- `services/imports/get-csv-upload-sources.ts`
- `lib/imports/csv-upload.ts`

### Alterado

- `types/imports.ts`

## Estados suportados

- idle
- upload em andamento
- recebimento do arquivo confirmado
- erro de validacao no front
- erro de validacao no server

## Evidencias de funcionamento

- A rota `/app/imports` foi compilada com sucesso no build.
- O upload aceita `FormData` real com arquivo CSV.
- A validacao acontece no front e no server para:
- arquivo presente
- extensao `.csv`
- limite maximo de tamanho
- O upload registra metadados iniciais em `DataSource`:
- `lastImportedAt`
- `lastImportFileName`
- `lastImportRowCount`, que nesta etapa representa apenas a contagem inicial/bruta de linhas detectadas no arquivo recebido, ainda sem validacao ou importacao linha a linha concluida
- `lastImportError`
- `configJson.lastUpload`
- O fluxo preserva protecao existente:
- usuario nao autenticado segue bloqueado
- usuario com setup incompleto volta para onboarding
- usuario com setup concluido acessa a rota normalmente
- `npm run typecheck`, `npm run lint` e `npm run build` passaram

## Pendencias

- Implementar parsing real do CSV.
- Validar headers contra o contrato oficial.
- Persistir linhas convertidas em `Client` e `Appointment`.
- Exibir resumo real de linhas validas, invalidas e importadas.
- Decidir estrategia final de armazenamento ou descarte do arquivo bruto.

## Riscos conhecidos

- O arquivo ainda nao e persistido como blob ou em storage; apenas os metadados iniciais sao registrados.
- O sistema confirma o recebimento e o tracking inicial do arquivo, sem ainda indicar sucesso completo da importação linha a linha.
- O `DataSource` e reutilizado como tracking minimo de upload, o que e suficiente agora, mas ainda nao representa historico detalhado de multiplas importacoes.
