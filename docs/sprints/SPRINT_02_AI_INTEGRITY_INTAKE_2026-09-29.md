# Sprint 02 — Intake assistido de AI Integrity

**Data:** 2026-09-29  
**Estado:** concluído no código local para acesso interno de desenvolvimento; não publicado como scan ou oferta.  
**Autoridade:** [source of truth](../source-of-truth.md), [bíblia](../REVORY_PRODUCT_BIBLE.md) e [plano](../REVORY_AI_SAAS_MIGRATION_PLAN.md).

## Entrega verificável

- Fluxo autenticado em `/app/ai-integrity/imports`, limitado a ambiente não produtivo e preview/admin interno. APIs POST `/api/ai-integrity/review` e `/api/ai-integrity/import` aplicam a mesma restrição, isolamento por workspace, limite de tamanho, origem e rate limit. Nenhum upload AI SaaS público ou gratuito foi aberto.
- CSV ou XLSX de uma fonte por vez: eventos de receita Stripe, ledger interno de uso/créditos ou buckets de uso/custo do provider. Templates sintéticos em `public/templates/ai-integrity-*.csv` documentam o contrato mínimo.
- Preview de colunas e primeiras linhas; sugestão determinística de mapping, edição humana, validação e confirmação explícita. Importação reprocessa arquivo, mapping e janela e exige token de review correspondente.
- Data Quality por linha: campos obrigatórios, tipos, datas com offset, janela, IDs externos duplicados, valores/custo inválidos e fórmulas XLSX. Linhas excluídas e respectivos payloads ficam no JSON de qualidade do lote parcial; alertas de customer não atribuído, receita sem valor e custo estimado/indisponível permanecem separados dos erros excludentes. Um arquivo sem nenhuma linha válida não é persistido.
- Evidência aceita vai para tabelas AI SaaS do Sprint 1. Idempotência de lote e deduplicação de registro impedem soma automática de reimportações. Evento de auditoria é escrito na mesma transação do lote. Exportação e retenção de workspace incluem os novos dados.
- A UI usa os tokens, tipografia e componentes da identidade premium existente. Nenhuma rota contractor funcional foi retirada.

## Gate e limites

| Critério | Evidência |
| --- | --- |
| Três fontes válidas entram | Templates sintéticos validados; teste em PostgreSQL local descartável confirma 2 registros de receita, 2 de uso e 1 bucket de provider, todos no workspace esperado. |
| Dados inválidos/conflitantes visíveis | CSV parcial exclui valor inválido e ambos os registros com mesmo external ID; Data Quality retém motivo, linha e payload. Eventos fora da janela são excluídos; dados incompletos elegíveis recebem alerta. |
| Sem claim financeiro | Teste de banco confirma zero `AiIntegrityFinding` após importação. UI e resposta API dizem que apenas evidência foi armazenada. |
| Isolamento e replay | Teste de banco confirma workspace distinto, replay idempotente e auditoria dos três lotes. |
| Segurança de arquivo | Validação de conteúdo CSV/XLSX, limite de 8 MB, 10 mil linhas/80 colunas e rejeição de célula com fórmula; multipart limitado. |

**Comandos:** `npm run qa:ai-integrity-sprint-2`, `npm run qa:ai-integrity-sprint-2:db`, `npm run typecheck`, ESLint direcionado e `npm run build`. O teste de banco só cria e apaga um banco aleatório quando `DATABASE_URL` aponta para localhost. A build e o teste de contrato não equivalem a validação visual de uma sessão autenticada nem a teste com export real de cliente.

## Fronteira de produto

O intake não faz matching Stripe ↔ ledger ↔ provider, não calcula margem, não gera findings e não habilita venda. Não vincular customer por nome, e-mail ou valor aproximado. A próxima etapa é **Sprint 03 — identidade, atribuição explícita e coverage**. Antes de ampliar acesso ou cobrar, validar formato de exports reais consentidos, UX autenticada desktop/mobile e gate do motor/compra. A preferência do fundador permanece: sem scan real gratuito; a demo pública pode conter apenas dados sintéticos.
