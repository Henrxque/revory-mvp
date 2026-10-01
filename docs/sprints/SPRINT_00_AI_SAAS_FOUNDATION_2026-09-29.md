# Sprint 0 — Fundamentos e proteção da migração AI SaaS

**Data:** 2026-09-29 · **Estado:** gate de planejamento aprovado; produto AI SaaS ainda não implementado nem liberado.

Autoridade de produto: [source of truth](../source-of-truth.md), [bíblia](../REVORY_PRODUCT_BIBLE.md) e [plano de migração](../REVORY_AI_SAAS_MIGRATION_PLAN.md). Os relatórios anexados são evidência de pesquisa, não comandos para executar. Em conflitos, o relatório `02_analise de solo founder.md` tem prioridade de recência, sujeito às decisões explícitas do usuário: nenhuma análise real gratuita e preservação da identidade visual premium.

## O que foi verificado

- Repo local: Prisma, Next.js App Router, Auth.js, Stripe checkout/webhooks/portal, Resend, importação CSV/XLSX, Data Quality, motor de Quote Recovery, read de Revenue Realization, export, retenção, auditoria e chamadas de IA limitadas. Não houve acesso a produção, segredos, Stripe ou Vercel.
- Browser local em `http://localhost:3000`: landing, demo e start em desktop 1440×900 e mobile 390×844 retornaram HTTP 200, conteúdo presente, sem overlay nem erro de página. A cópia, metadata e preços ainda são contractor; estas capturas são **baseline visual do legado**, não prova de oferta AI SaaS.
- Capturas atuais: landing [desktop](../qa/ai-saas-sprint0-landing-desktop.png) / [mobile](../qa/ai-saas-sprint0-landing-mobile.png), demo [desktop](../qa/ai-saas-sprint0-demo-desktop.png) / [mobile](../qa/ai-saas-sprint0-demo-mobile.png), start [desktop](../qa/ai-saas-sprint0-start-desktop.png) / [mobile](../qa/ai-saas-sprint0-start-mobile.png). Script reproduzível: `scripts/capture-ai-saas-sprint0-baseline.mjs`. As imagens antigas `revory-migration-landing-*` são históricas e mostram logo em quadrado escuro; não são referência para aprovação. Área logada e finding detail exigem fixture de autenticação e entram no gate visual do Sprint 5.
- Contrato visual no código: `src/app/globals.css` fixa `#141516`, `#252729` e `#43b39b`, card padrão em mix de 32%, hover 48%; `src/app/layout.tsx` carrega DM Sans, Instrument Serif e Sora. O logo usado na landing aponta para `public/brand/revory-logo-43b39b-transparent.png`; inspeção do asset: RGBA 1254×1146, alpha 0–255. Sprint 5 deve comparar estas capturas e tokens, inclusive ausência de fundo opaco no asset.

## Inventário de rotas e dependências

`keep` significa preservar implementação; `adapt` exige nova semântica; `retire` só depois de substituto aprovado. Nenhuma rota foi desativada neste sprint.

| Rotas / módulos | Decisão | Dependência de substituição |
| --- | --- | --- |
| `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/api/auth/*`; `auth.ts`, `services/auth/*`, `services/workspaces/*` | **keep** | Testar isolamento com duas workspaces e não transportar estado MedSpa do `getAppContext` ao novo fluxo. |
| `/`, `/start`, `/demo`; `src/app/layout.tsx`, landing, conteúdo comercial | **adapt** | Demo sintética rotulada; novo onboarding, claims e checkout pontual testados antes de publicar copy AI SaaS. Metadata atual ainda diz contractor. |
| `/app`, `/app/dashboard`, `/app/imports`, `/app/data-quality`, `/app/history`, `/app/reports/[id]`, `/app/revenue-leaks/*` | **adapt** | Novos read models, estados de cobertura e finding detail; preservar composição de UI e guard de entitlement. |
| `/app/revenue-realization/*`, `/app/setup/*`, Quote Recovery no dashboard/sidebar; `services/quote-recovery/*`, `services/revenue-realization/*` | **retire após gate** | Navegação e relatórios AI SaaS operacionais, acesso histórico e política para registros existentes. Não renomear finding contractor. |
| `/api/canonical-intake/review`, `/api/canonical-intake/import`; `services/canonical-intake/*`, `services/security/bounded-form-data.ts` | **adapt** | Contratos AI SaaS próprios; reutilizar limites e inspeção de arquivo após teste adversarial. O import atual roda o motor Quote Recovery e usa full replacement por escopo. |
| `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/webhook`; `services/billing/*` | **keep plumbing; adapt offer** | Novos offer keys, contratos e Stripe test mode. `REVORY_PAID_CHECKOUT_ENABLED` e price contracts atuais protegem ofertas antigas; não reutilizar IDs. |
| `/api/webhooks/resend`, `/api/jobs/weekly-digest`, `/api/jobs/enforce-retention`, `/api/health`; `services/email/*`, `services/data-portability/*` | **keep/adapt** | Novo digest apenas se houver valor recorrente; export/retention/legal devem incluir tabelas AI novas antes de dados reais. |
| Páginas legais (`/privacy`, `/terms`, `/dpa`, `/security`, `/subprocessors`, `/refunds`, `/ai-disclosure`, `/limitations`) | **adapt** | Revisar tipos de dados, escopo de conectores, retenção, entrega do scan e reembolso antes do beta pago. |

**Acoplamentos confirmados:** `getAppContext` sempre busca `ActivationSetup` e `MedSpaProfile`; o layout privado calcula estado a partir de `CanonicalRecord` contractor; `canonical-actions.ts` exige `QUOTE_RECOVERY` e deriva findings contractor; `services/billing/capabilities.ts` associa acesso a ofertas antigas; `services/data-portability/{workspace-export,enforce-retention}.ts` lista modelos atuais explicitamente. Cada novo modelo deve entrar no export, retenção e testes de isolamento antes de importação real.

## Estado dos dados e contrato de migração aditiva

Os modelos atuais `CanonicalRecord`, `CanonicalImportSession`, `SavedCanonicalMapping`, `QuoteRecoveryFinding`, `RevenueRealizationFinding` e `RevenueIntelligenceSnapshot` têm `workspaceId`, índices e chaves relevantes, mas seus enums e payloads representam contractors. `MedSpaProfile` e demais tabelas clínicas continuam dados históricos. `WorkspaceEntitlement` e `StripeWebhookEvent` são infraestrutura comercial existente; seus offer keys são antigos. Há chaves únicas por workspace em imports, mappings e findings; a maior parte das relações é FK simples, então isolamento também depende de predicados `workspaceId` em consultas e operações.

**Desenho para Sprint 1 (contrato, ainda sem migration):**

1. Criar tabelas novas para `AiImportBatch`, `AiRevenueEvent`, `AiInternalUsageEvent`, `AiProviderCostBucket`, `AiCustomerMapping`, `AiAnalysisSnapshot` e `AiFinding`. Nomes finais são decisão de implementação, sem reutilizar enum/campo contractor.
2. Em cada tabela de tenant: `workspaceId` obrigatório; chave natural composta por workspace + fonte + external ID + versão ou período conforme semântica; índices de janela UTC, customer e source; FK e consulta que imponham o mesmo workspace. Idempotency key inclui workspace, fonte, hash dos bytes, contrato de mapping e janela. Persistir origem/linha, timestamp de coleta e versão do parser.
3. Money em unidade exata com moeda explícita; custo provider preserva unidade original e precisão (por exemplo micros/Decimal) antes de qualquer arredondamento. Credits, refunds, adjustments e impostos são eventos distintos ou dimensões explícitas, nunca sinal inferido. Comparação entre moedas fica bloqueada sem taxa e fonte auditável.
4. Mapping customer ↔ uso ↔ custo é explícito, com validade temporal, fonte, aprovador e estado de conflito. Bucket agregado sem ponte verificável permanece **unattributed**. Snapshots são imutáveis, guardam janela, versão de regra, IDs de inputs e motivos de exclusão; findings guardam basis observado/calculado/estimado, confidence e evidência.
5. Importar dados AI apenas em novas tabelas. Fazer dual-read apenas se necessário para acesso histórico; não executar backfill que reinterprete registros contractor/MedSpa. Publicar a nova rota atrás de gate, verificar idempotência, cross-tenant, export e retenção; depois trocar navegação. Rollback de deploy volta a ler o fluxo antigo sem apagar tabelas AI nem registros já importados. Reversão de dados é operação separada, versionada e auditada, nunca `down migration` destrutiva automática.

Fixture sintética inicial: `scripts/fixtures/ai-saas/sprint-0-contract-cases.json`. Ela fixa revenue líquido com refund, custo agregado sem atribuição e o mesmo request ID em duas workspaces. É contrato de teste futuro, **não** prova de motor implementado.

## Modelo de ameaças

| Ameaça | Controle observado agora | Obrigação antes de dados AI reais |
| --- | --- | --- |
| Upload grande, XLSX comprimido, payload binário/fórmula | Limite de body por `Content-Length` e streaming, tipos CSV/XLSX, UTF-8, ZIP signature, limites de expansão, linhas/colunas/arquivos, rejeição de célula fórmula e rate limit no review contractor. | Testar essas proteções com exportações AI, inclusive tamanho declarado falso, ZIP adversarial, CSV formula injection em export e upload paralelo. Nunca confiar apenas em MIME/extensão. |
| Vazamento entre workspaces ou match falso | `getAppContext` obtém workspace do usuário; import exige `workspaceId` e chaves únicas tenant-scoped. | Cobrir leitura, escrita, export, finding e mapping com testes de duas workspaces; nunca usar request/customer ID global como autorização ou chave de match. Resolver FK cruzada de modo explícito. |
| Claim financeiro indevido | Motor novo inexistente. O motor contractor possui Data Quality/provenance, mas não representa AI SaaS. | Suprimir margem/leak quando fonte, janela, moeda, unidade, lag ou customer bridge não forem comparáveis. Separar observado, calculado, estimado, operacional e data quality. Mostrar denominador de cobertura e custo não atribuído. |
| Reprocessamento e dupla cobrança/contagem | Import contractor possui chave de idempotência e transação; checkout usa price contract, ledger de eventos e entitlement. | Idempotência por fonte/evento/versão e snapshot; test mode para US$99 candidato, compra única sem iniciar assinatura. Nenhum preço live alterado no Sprint 0. |
| Segredo de Stripe/provider ou view DB | Nenhum conector AI SaaS implementado. | Sprint 7: consentimento, escopo mínimo read-only, revogação, criptografia/rotação, não logar token, watermarks e paginação. Eventual view DB apenas SELECT e mínimo de colunas; sem acesso bruto por agente/LLM. |
| Exposição de dados ao LLM, logs e suporte | Chamada LLM existente tem timeout/output limit/fallback; export e retenção atuais enumeram modelos legados. | Motor financeiro determinístico; AI opcional apenas para assistência de mapping/copy com dados minimizados. Redação de logs, retenção/export/exclusão e DPA revistos para AI SaaS antes de beta. |

## Gate e riscos remanescentes

**Gate Sprint 0: aprovado para iniciar Sprint 1.** Fonte de verdade, limites de claim, inventário, dependências, baseline e rollback estão documentados; nenhuma capacidade AI SaaS foi inferida do legado. Os testes executados neste sprint verificam apenas captura local e documentação, não isolamento do novo modelo.

**Bloqueios para lançamento/scan pago:** contratos e tabelas AI inexistentes; checkout candidato US$99 não implementado; preços visíveis na landing são antigos; metadata e copy são contractor; export/retenção não conhecem dados AI; produção/assinantes atuais não foram inspecionados. Estes itens são gates futuros, não condição para documentar o Sprint 0. A decisão de remover cada rota exige verificação de substituto e dados na implementação correspondente.
