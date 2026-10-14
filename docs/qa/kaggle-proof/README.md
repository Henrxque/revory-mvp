# REVORY — prova local com dados públicos do Kaggle

**Data:** 2026-10-13. **Resultado:** `KAGGLE_PROOF_PASS` no banco local descartável. Esta é uma prova de execução do intake, persistência, scan determinístico e export do REVORY; não valida reconciliação financeira de um cliente real nem substitui os gates de lançamento.

## Fontes e direitos

- [Synthetic SaaS Subscriptions, Billing and Churn](https://www.kaggle.com/datasets/generaterealdata/synthetic-saas-subscriptions-churn), versão 1, CC BY 4.0. Crédito: **Synthetic SaaS Subscriptions and Churn, GenerateRealData** ([site do autor](https://generaterealdata.com)). Usamos 12 invoices pagas de maio de 2026.
- [AI Agent Observability Dataset](https://www.kaggle.com/datasets/hamzaabbasai/ai-agent-observability-dataset), versão 1, Apache 2.0. Usamos 20 incidentes GPT de maio de 2026, com `token_usage` e `cost_usd` **estimado**.
- Os hashes SHA-256 dos ZIPs baixados e as premissas da adaptação estão em [manifest.json](manifest.json). O script [prepare-ai-kaggle-proof.py](../../../scripts/prepare-ai-kaggle-proof.py) gera os CSVs a partir desses ZIPs e rejeita arquivos com hash diferente. As pequenas amostras adaptadas são mantidas nesta pasta para repetir o teste sem acesso ao Kaggle.

## O que foi adaptado

As invoices não são eventos Stripe. O adaptador as converte em `CHARGE` apenas para cumprir o contrato de entrada `STRIPE_REVENUE`; não cria um Stripe customer ID. Os incidentes de agentes também não são um export da OpenAI. O adaptador assume UTC para timestamps sem fuso, agrega os 20 registros em um bucket de uso e mantém `costBasis=ESTIMATED`. O custo agregado é **US$ 5,9914 estimados**, não gasto faturado. As duas fontes não compartilham identificadores de cliente.

O cenário `unlinked` mantém esses vínculos ausentes. O cenário `injected-linked` adiciona IDs fictícios de projeto/customer, assume exclusividade desse projeto apenas para a fixture e reduz em 1.000 tokens um evento no ledger. Essa alteração é uma falha injetada, explicitamente identificada, não descoberta no Kaggle.

## Execução e resultado

Com PostgreSQL local e `DATABASE_URL` apontando para **um banco local cujo usuário pode criar/apagar bancos descartáveis**:

```sh
npm run qa:ai-kaggle-proof:db
```

O harness cria um banco aleatório `revory_sprint1_*`, aplica as migrações e o apaga ao fim. O teste passa pelos serviços de revisão de CSV, mapping sugerido, plano/Data Quality, importação persistida, replay idempotente, mapping explícito apenas na fixture, scan, reprodução e export JSON.

| Cenário | Importados | Resultado |
| --- | --- | --- |
| Sem vínculo | 12 receita, 20 ledger, 1 provider | 0 findings; `CONFIRMED_COMPARABLE_SCOPE_REQUIRED`, `ESTIMATED_COST_EXCLUDED` e regras de margem/receita suprimidas. |
| Falha controlada com vínculo fictício | 12 receita, 20 ledger, 1 provider | 1 `LEDGER_PROVIDER_USAGE_MISMATCH`, delta de 1.000 tokens; **nenhum valor monetário**. |

Ambos os cenários repetiram o scan sem criar novo snapshot. `npm run typecheck`, ESLint do teste e compilação Python do adaptador passaram. Nenhuma credencial, conta real ou deploy foi usada. Stripe/OpenAI conectados ainda precisam de validação própria.

## Prova na interface autenticada

O script [`seed-ai-kaggle-proof-local.ts`](../../../scripts/seed-ai-kaggle-proof-local.ts) importou a fixture `injected-linked` para o banco isolado `revory_kaggle_proof_de04fb46266a`, criou uma conta local de demonstração e persistiu o scan antes de habilitar o preview comercial. Ele recusa host/banco fora do padrão local, produção e execução após habilitar o gate de compra. A senha de demonstração é fornecida só por variável de ambiente, sem ser gravada no repositório.

Em 2026-10-13, o app local autenticado abriu o [relatório](app-report-local.png) e a [evidência detalhada](app-evidence-local.png). A interface mostrou `469.411 provider − 468.411 internal = 1.000 tokens`, com limites explícitos: diferença de quantidade, sem conversão monetária ou conclusão de perda. As capturas são evidência da execução local; a URL `localhost` depende do servidor e do banco temporários estarem em execução.

## Prova no Preview da Sprint 11

Em 2026-10-14, a conta `henry@revory.app` entrou por Google no Preview protegido da branch `migration/ai-saas-sprint-11`. O banco Neon isolado `revory_ai_sandbox_b8ec12a43f90` recebeu as três fixtures `injected-linked` com o script [`seed-ai-kaggle-proof-preview.ts`](../../../scripts/seed-ai-kaggle-proof-preview.ts). O script exige o nome exato do banco sintético, a conta e o workspace previamente criados pelo login; o padrão é somente verificar o destino. A importação exige `REVORY_KAGGLE_PREVIEW_IMPORT=yes`.

O dashboard autenticado exibiu 3/3 tipos de fonte e 1 relatório. O [relatório no Preview](https://revory-mvp-git-migration-ai-saas-sprint-11-henrxques-projects.vercel.app/app/ai-integrity/reports/cmv8c0v2o001ebm94mxzml4zy) mostrou uma diferença de 1.000 tokens; o detalhe exibiu `469.411 provider − 468.411 internal`. O custo dos incidentes continua estimado e excluído de gasto observado. O acesso ao URL exige autenticação da Vercel ou um link temporário de compartilhamento.

Para percorrer as telas de preparo, o mesmo script tem uma operação separada `REVORY_KAGGLE_PREVIEW_GRANT=yes`. Ela cria uma única concessão `SYNTHETIC_PREVIEW`, de valor zero, sem sessão Stripe, pagamento, `paidAt` ou crédito comercial. O código aceita essa concessão somente quando a implantação é um Preview Vercel com flags sintéticas e nome do banco exato. Nenhum comprador real ou scan gratuito de dados de cliente é registrado por essa prova.
