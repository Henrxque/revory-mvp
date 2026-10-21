# Sprint 05 — Dependências de substituição

Estado: implementação local sob `REVORY_AI_SAAS_PREVIEW=true`, sempre bloqueada em produção. Gate público permanece nos sprints de validação e lançamento.

| Rota/superfície | Classe | Replacement e proteção |
| --- | --- | --- |
| `/`, `/demo`, `/start` | adapt | Novas landing, demo determinística sintética e compra pontual de teste. Implementações originais preservadas em `components/legacy/Contractor*Page.tsx`; fallback ativo quando preview não está habilitado. Gate: conteúdo, CTA, desktop/mobile e comportamento antigo protegidos. |
| `/app` e shell autenticado | adapt | Entry para dashboard AI e nova navegação quando preview habilitado. Layout antigo permanece como fallback; auth e consentimento mantidos. |
| `/app/ai-integrity/imports`, `/attribution`, `/scans` | adapt | Passos legíveis de preparação e entrega; capacidades dos Sprints 2–4 preservadas; no preview comprador, requerem compra de teste confirmada para nova preparação/execução. |
| Dashboard, histórico e finding detail AI | add | Rotas novas, sem reutilizar financial/clinical fields. Histórico mostra apenas snapshots AI do workspace. |
| `/app/quote-recovery`, `/revenue-realization`, `/setup` e seus consumidores | retire da navegação AI local | Implementações e dados preservados; navegação histórica segue no fallback. Não apagar ou redirecionar rotas históricas automaticamente. |
| Checkout/webhook contractor, Price IDs e entitlements existentes | keep | Compra AI usa contrato/tabelas/endpoints/configuração de teste próprios. Sem rename ou alteração de preço antigo. |
| Condições do teste sintético | add | `/ai-integrity-preview-policy` substitui links comerciais históricos na experiência AI de teste; plataforma/termos existentes permanecem preservados. Condições de cliente real exigem review posterior. |

Nenhum banco principal recebe migration automaticamente. Dados reais continuam fora da experiência desta sprint. A configuração real do sandbox Stripe é dependência externa de validação; uma simulação local não comprova um pagamento no Stripe.
