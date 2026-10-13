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

Ambos os cenários repetiram o scan sem criar novo snapshot. `npm run typecheck`, ESLint do teste e compilação Python do adaptador passaram. Nenhuma credencial, conta real ou deploy foi usada. A prova não passou pela UI autenticada nem por Stripe/OpenAI conectados; esses fluxos precisam de validação própria.
