# Sprint 1 — Contratos e persistência AI Integrity

**Data:** 2026-09-29 · **Estado:** implementação e gate local concluídos; migration aplicada apenas a banco PostgreSQL local descartável e removido. O scan AI SaaS ainda não existe.

Autoridade: [source of truth](../source-of-truth.md), [bíblia](../REVORY_PRODUCT_BIBLE.md), [roadmap](../REVORY_AI_SAAS_MIGRATION_PLAN.md). Este sprint não publica rotas, preços ou claims AI SaaS.

## Entrega

- `prisma/schema.prisma` e `prisma/migrations/20260929000100_ai_integrity_foundation/migration.sql`: oito tabelas novas, cinco enums próprios, índices por workspace e relações compostas entre registros/lotes e snapshots/inputs. A migration cria estruturas e não altera tabelas contractor ou MedSpa.
- `domain/ai-integrity/contracts.ts`: contrato discriminado para Stripe revenue, ledger interno e buckets de provider. Exige workspace consistente, external ID, período com timezone, moeda/unidade explícitas, precisão decimal e origem. Hash de revisão ignora posição da linha, mas inclui conteúdo; idempotency key inclui tenant, fonte, arquivo, mapping, janela e conjunto de hashes.
- `services/ai-integrity/persist-batch.ts`: gravação transacional e imutável. Replay do mesmo lote retorna o lote existente; linha idêntica em novo lote é deduplicada pela chave `(workspaceId, sourceSystem, externalId, recordHash)`; conteúdo alterado cria outra revisão, sem sobrescrever a anterior. Duplicidade de external ID dentro de um lote é rejeitada. Nenhuma revisão é escolhida automaticamente para soma financeira.
- `services/ai-integrity/persist-snapshot.ts`: snapshots imutáveis, com manifesto de lotes pertencentes ao mesmo workspace e join table com FKs compostas. Não executa motor nem produz findings neste sprint.
- Export de workspace atualizado para incluir as oito entidades AI; retenção remove snapshots que dependem de lotes vencidos antes de apagar os lotes. Dados brutos de linhas são mantidos durante a janela de retenção e não entram em logs.
- `scripts/validate-ai-integrity-sprint-1.ts`: testes de cross-tenant, replay, revisão alterada, duplicata, moeda, timezone, cost basis e garantias estruturais da migration. `npm run qa:ai-integrity-sprint-1` executa a suite.

## Semântica dos dados

| Estrutura | Regra principal |
| --- | --- |
| `AiIntegrityImportBatch` | Uma fonte por lote; janela UTC normalizada, timezone original, hash do arquivo/mapping, contagem inserida/duplicada e Data Quality. |
| `AiIntegrityRevenueRecord` | Valor exato em unidade menor decimal, moeda e expoente; tipo/status e IDs Stripe separados. Invoice, charge, refund e credit não são somados por este sprint. |
| `AiIntegrityUsageRecord` | Quantidade decimal e unidade original, customer interno opcional, request/project IDs e delta de créditos separados. |
| `AiIntegrityProviderBucket` | Usage e cost separados; `REPORTED`, `ESTIMATED` ou `UNAVAILABLE`; moeda, versão de preço, ajuste, janela e frescor. Customer não é inferido do bucket agregado. |
| `AiIntegrityMapping` | Vínculo explicitamente confirmado com validade temporal e estado `CONFIRMED`, `CONFLICTED` ou `REVOKED`. Regras de conflito e exclusividade serão implementadas no Sprint 3. |
| `AiIntegritySnapshot` / `AiIntegritySnapshotInput` / `AiIntegrityFinding` | Contrato imutável para manifesto, cobertura, supressões e evidência. Nenhum finding AI foi produzido ou exibido. |

## Isolamento e idempotência

1. O contrato rejeita uma linha cujo `workspaceId` difere do lote. A entrada do serviço ainda **não** é uma API; o Sprint 2 deve obter o workspace da sessão autenticada.
2. FKs `(workspaceId, importBatchId)` e `(workspaceId, snapshotId)` impedem vincular linha ou snapshot input a pai de outro tenant. As consultas de snapshot filtram por `workspaceId` antes da gravação.
3. Chaves únicas por workspace separam replays de tenants distintos. O hash de lote muda se qualquer revisão normalizada mudar. Revisões antigas permanecem para auditoria; o motor posterior precisa selecionar uma revisão por external ID e sinalizar conflitos, sem somar todas.
4. Os serviços não consultam nem escrevem tabelas contractor. Rollback de deploy pode voltar às rotas antigas mantendo as tabelas novas; nenhum `down migration` destrutivo foi criado.

## Verificação e limite do gate

Passaram: `prisma validate`, `prisma generate`, `npm run typecheck`, `npm run qa:ai-integrity-sprint-1`, `npm run qa:ai-integrity-sprint-1:db`, `npm run qa:billing-contract` e `npm run qa:retention`. A suite de banco criou uma database local com nome aleatório, aplicou as 26 migrations desde o início, gravou as três fontes, testou replay sequencial e concorrente, revisão alterada, tenant FK, export serializável e retenção de snapshot com evidência vencida; a database foi removida no final. O lint dos arquivos alterados passou; o lint global ainda encontra um aviso preexistente em `.tmp/revory-ppt-build/build.mjs`, fora deste sprint.

**Gate do Sprint 1: passou em ambiente local isolado.** A migration não foi aplicada ao banco principal nem a produção. Antes de importar dados de cliente, revisar retenção/legal para dados AI e passar os gates de intake e Data Quality do Sprint 2. Sprint 2 também deve ligar auth → intake, validar bytes do arquivo e mapeamento. Produção, Stripe, Vercel, preço e UI não foram alterados.
