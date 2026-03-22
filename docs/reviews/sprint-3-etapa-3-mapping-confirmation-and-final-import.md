# REVORY - Sprint 3 Etapa 3 Review

## Objetivo da etapa
Implementar a confirmacao final do mapping antes da importacao real, consumindo o `mappingDecisionDraft` ja preparado na Etapa 2 e fechando o fluxo com um submit mais explicito, mais coerente e mais honesto com a experiencia premium da REVORY.

## Arquivos criados/alterados
- Alterado: `components/imports/CsvUploadCard.tsx`
- Alterado: `services/imports/build-assisted-import-payload.ts`
- Alterado: `src/app/(app)/app/imports/actions.ts`
- Alterado: `types/imports.ts`
- Criado: `docs/reviews/sprint-3-etapa-3-mapping-confirmation-and-final-import.md`
- Criado: `docs/reviews/generate_sprint_3_etapa_3_mapping_confirmation_and_final_import_pdf.py`

## Decisoes tomadas
- O fluxo atual de import da Sprint 2 foi preservado. A confirmacao final foi encaixada antes do submit real, sem reescrever validacao, parsing, normalizacao ou persistencia.
- O `mappingDecisionDraft` passou a ser consumido de verdade no submit server-side.
- O servidor agora reconstrui o CSV oficial da REVORY a partir do arquivo bruto original e da decisao final confirmada pelo usuario antes de validar, parsear e persistir.
- O submit deixou de depender do remapeamento efetivo no client para a importacao real. O client continua responsavel pelo preview e pela confirmacao visual, enquanto o servidor executa a transformacao oficial para esta execucao.
- A action continua retornando um resumo da execucao atual do mapping confirmado, separado do bloco de ultimo estado agregado salvo.

## Decisoes de UX de confirmacao
- O fluxo ficou em duas camadas claras:
  - preview de mapping
  - confirmacao final do mapping
- O usuario precisa abrir a confirmacao final explicitamente antes do import real.
- A confirmacao final deixa visivel:
  - quantas sugestoes ainda ficaram pendentes no momento da confirmacao
  - quantos matches confiantes foram mantidos
  - quantos foram ajustados manualmente
  - quantos ficaram ignorados
- A confirmacao final informa explicitamente que:
  - ela vale apenas para a execucao atual
  - nao cria memoria persistida de mapping por workspace
  - o servidor reconstrui o contrato oficial da REVORY para a execucao atual antes de reutilizar a pipeline aprovada da Sprint 2
- Depois do submit, a tela mostra um bloco de `Current execution`, separado do bloco de `Last import`, para nao misturar execucao atual com estado agregado salvo na fonte.

## Evidencias do fluxo ponta a ponta
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- O fluxo atual agora segue esta ordem:
  - usuario escolhe o arquivo
  - REVORY gera o preview assistido
  - usuario revisa e ajusta o mapping
  - usuario abre a confirmacao final
  - a confirmacao resume o mapping da execucao atual
  - o servidor reconstrui o CSV oficial da REVORY a partir do arquivo bruto e do mapping confirmado
  - a importacao real roda com esse CSV oficial reconstruido no servidor
  - a UI mostra o resultado da execucao atual com contagens claras
- O estado retornado pela action agora inclui `mappingExecutionSummary`, permitindo que a UI deixe explicito o que foi:
  - mantido
  - ajustado
  - ainda pendente como sugestao
  - ignorado

## Regressoes evitadas
- Nenhuma mudanca no contrato principal do payload da Etapa 1.
- Nenhuma reabertura da semantica do parser da Sprint 2.
- Nenhuma memoria persistida de mapping por workspace.
- Nenhuma sofisticacao adicional de idempotencia alem da estrategia ja aprovada.
- Nenhuma alteracao na semantica dos KPIs do dashboard.

## Pendencias
- Se a Sprint 3 decidir separar ainda mais o fechamento do fluxo, a confirmacao final pode virar um passo dedicado sem retrabalho estrutural grande.
- O `mappingDecisionDraft` ainda nao e persistido como historico detalhado por execucao; nesta etapa ele serve para a execucao atual e para o resumo da UI.
- Ainda nao existe trilha de auditoria detalhada de mapping por execucao.

## Riscos conhecidos
- O resumo de confirmacao depende de um draft vindo do cliente; o servidor agora valida template, headers detectados, campos obrigatorios, identity path, duplicate source headers e duplicate targets antes de importar, mas nao ha trilha persistida dessa decisao nesta etapa.
- O fluxo continua enxuto de proposito. Arquivos muito fora do contrato oficial ainda vao exigir ajuste manual ou retorno ao template oficial.
- Como nao existe memoria de mapping por workspace, o usuario ainda pode precisar reconfirmar mapeamentos em imports futuros.

## Proximos passos
- Decidir se a proxima etapa vai manter a confirmacao dentro do mesmo card ou elevar isso para uma superficie final mais destacada.
- Se houver necessidade de observabilidade maior, considerar historico de mapping por execucao sem reabrir o modelo prematuramente.
- Refinar o resumo visual do resultado atual caso o fluxo ganhe mais sinais operacionais nas proximas etapas.
