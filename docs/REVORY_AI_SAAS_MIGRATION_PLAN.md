# REVORY — Plano de migração para AI SaaS

> Atualizado em 2026-10-02. Sprints 0–4 adicionaram base, contratos, intake, identidade/cobertura e motor determinístico. Sprint 05 adiciona experiência AI e compra de teste sob flag local, com fallback histórico preservado; SDK/webhook verificados em simulação, sandbox real pendente. Sprints 06–08 têm preparação sintética de revisão, fontes e monitoramento, sem compradores, conexões ou recorrência reais. Sprint 09 prepara o gate de lançamento com audit `NO_GO` e runbook, sem publicação. Sem alteração de banco principal, preço histórico, deploy ou integração externa. Autoridade: [source of truth](source-of-truth.md) e [bíblia](REVORY_PRODUCT_BIBLE.md). Evidências em `docs/sprints/`.

## Regra de migração

Migrar **o domínio inteiro** de contractors para AI SaaS sem destruir as capacidades horizontais já funcionais. Código contractor e MedSpa vira legado técnico, não fonte de linguagem ou semântica do novo produto. Preservar contratos, dados e entitlements antigos enquanto houver dependência; retirada exige substituição funcional e plano de dados. A única identidade de produto a manter é a visual do REVORY; reaproveitamento de infraestrutura é uma decisão técnica, não preservação de proposta antiga.

## Inventário inicial

| Superfície / caminho | Classe | Próxima ação e dependência |
| --- | --- | --- |
| `src/app/globals.css`, `src/app/layout.tsx`, `components/brand/RevoryLogo.tsx`, `public/brand/` | **keep** visual; **adapt** metadata | Congelar tokens/logo/fontes; trocar title/description contractor apenas quando landing nova e claims estiverem prontos. |
| Auth: Google OAuth, e-mail/senha, sign-in/up/reset/verify, NextAuth, sessões, usuário/workspace | **keep — direção explícita do fundador em 2026-10-01** | Preservar provedores, callbacks e identidade; adaptar somente contexto de produto. Confirmar isolamento e status de workspace com fixtures AI SaaS. |
| `src/app/page.tsx`, `src/app/start/page.tsx`, `src/app/demo/` | **adapt** | Criar copy, demo e oferta do novo domínio; substituir publicamente só após experiência coerente. Demo sempre sintética/read-only. |
| `src/app/(app)/app/imports/`, `lib/imports/`, mapping e Data Quality | **adapt** | Novos contratos Stripe revenue, internal usage e provider buckets; conservar parser, limites, preview e confirmação quando adequados. |
| `src/app/(app)/app/dashboard/`, `revenue-leaks/`, `history/`, `reports/` | **adapt** | Novos read models, coverage, findings e relatórios; não renomear estimate finding para AI finding. |
| `src/app/(app)/app/revenue-realization/`, `quote-recovery/` | **retire** da navegação nova após substituição | Preservar código/dados históricos até política de acesso/retirada e gates de nova UI; nenhum claim contractor na nova navegação. |
| `src/app/(app)/app/setup/` e rotas MedSpa ainda existentes | **retire** ou **adapt** após inventário de consumidores | Não apagar schema/fluxos automaticamente; mapear dependências e dados antes. |
| Billing checkout/portal/webhook, `WorkspaceEntitlement`, Stripe event ledger | **keep** plumbing; **adapt** ofertas | Novos offer keys/prices/entitlements apenas após contrato novo, testes e autorização externa separada. Price IDs antigos permanecem protegidos. |
| Resend, envio transacional/webhooks, legal, security, health, retention, audit events | **keep** infraestrutura; **adapt** conteúdo e eventos | Resend preservado por direção explícita do fundador em 2026-10-01: manter integração, domínio remetente e recursos externos. Revisar finalidade/retention/DPA/subprocessors para dados AI SaaS antes de beta. |
| `prisma/schema.prisma` models `CanonicalRecord`, `CanonicalImportSession`, findings, snapshots e MedSpa | **adapt** via modelos novos e migrações aditivas | Não sobrecarregar campos com sentido novo. Desenhar tabelas AI com workspace/external IDs, índices, unicidade, provenance e snapshot. |
| Scripts `qa:*` contractor e fixtures | **keep** como regressão histórica; criar QA novo | Nunca chamar testes antigos de prova do novo motor. Separar suite AI SaaS e verificar cross-tenant/false positives. |

Classificação acima é inicial. Antes de desativar cada rota, rastrear callers, dados, entitlements e dependências de replacement; registrar decisão no PR correspondente. `retire` significa destino após gate, não apagar agora.

## Roadmap por sprints

São **dez sprints sequenciais (0–9)**, definidos por entrega e gate, sem duração fixa. Um sprint não termina por ter telas ou código: o comportamento e a evidência do gate precisam passar. Não avançar automaticamente quando uma dependência externa estiver faltando.

| Sprint | Entrega principal | Gate para avançar | Estado em 2026-10-01 |
| --- | --- | --- | --- |
| **0 — Fundamentos e proteção** | Fonte de verdade, inventário de rotas/dados/contratos, threat model, baseline visual e plano de migração aditiva | Domínio e limites financeiros definidos; dependências de substituição e rollback documentados | **Concluído para planejamento:** evidência no relatório do Sprint 0; aplicação e ofertas AI SaaS ainda não implementadas |
| **1 — Contratos e persistência** | Esquemas para Stripe revenue, ledger interno, provider usage/cost, mapping temporal, provenance, snapshots e isolation | Schema aditivo validado; nenhum campo contractor/MedSpa reutilizado com novo significado; testes cross-tenant e de idempotência | **Concluído localmente:** [evidência](sprints/SPRINT_01_AI_INTEGRITY_CONTRACTS_2026-09-29.md), incluindo migration e testes em banco descartável; sem deploy |
| **2 — Intake assistido** | CSV/XLSX das três fontes, preview, confirmação de colunas, dedupe e Data Quality | Imports reais/sintéticos válidos entram; dados inválidos, incompletos ou conflitantes ficam visíveis e não geram claim | **Concluído localmente para intake interno:** [evidência](sprints/SPRINT_02_AI_INTEGRITY_INTAKE_2026-09-29.md); rota bloqueada em produção, sem scan |
| **3 — Identidade e atribuição** | Customer mapping explícito, níveis Exact/Strong/Mapped/Estimated/Unattributed e coverage | Shared keys, vínculos ambíguos e ausência de customer ID não produzem margem por customer; coverage tem denominador auditável | **Concluído localmente para review interno:** [evidência](sprints/SPRINT_03_AI_INTEGRITY_ATTRIBUTION_2026-09-29.md); somente Strong/Unattributed são elegíveis para custo com buckets agregados atuais |
| **4 — Motor de integridade** | Reconciliação determinística por janela e unidade, custo não atribuído, diferença ledger ↔ provider, snapshots e export reproduzível | Corpus adversarial de lag, refund, crédito, moeda, timezone, duplicata e conflito passa; zero dupla contagem | **Concluído localmente para scan sintético interno:** [evidência](sprints/SPRINT_04_AI_INTEGRITY_ENGINE_2026-09-30.md); duas famílias de findings, replay/export, testes de DB e navegador; sem compra ou produção |
| **5 — Experiência e compra do scan** | Onboarding, dashboard, finding detail, demo sintética, landing AI SaaS e checkout pontual em test-mode, com identidade visual preservada | Fluxo desktop/mobile e compra sem assinatura testados; cada claim corresponde ao motor; logo/tokens/fontes aprovados; navegação antiga retirada só após replacement | **Implementação local verificada com simulação; gate aberto:** [evidência](sprints/SPRINT_05_AI_INTEGRITY_EXPERIENCE_2026-10-01.md). Falta checkout no Stripe sandbox real; não avançar automaticamente para dados reais |
| **6 — Validação paga com dados reais** | 3–5 scans comprados e consentidos, com revisão assíncrona de findings/erros por AI SaaS | Precisão, utilidade, fricção e tempo até valor documentados; falsos positivos corrigidos ou explicitamente limitados; nenhuma análise real oferecida de graça por padrão | **Preparação local verificada; gate aberto:** [evidência](sprints/SPRINT_06_AI_INTEGRITY_VALIDATION_PREPARATION_2026-10-01.md), revisão/export sintéticos e protocolo prontos. Zero compradores reais verificados; coleta depende de Stripe sandbox da Sprint 05 e ambiente/condições do piloto |
| **7 — Fontes conectadas** | Stripe read-only e OpenAI Usage/Costs, consentimento, revogação, sync incremental e comparação com CSV | Escopos reais e proteção de segredos verificados; sync idempotente; agregado não se apresenta como customer-level | **Preparação local verificada; gate aberto:** [evidência](sprints/SPRINT_07_AI_INTEGRITY_SOURCE_PREPARATION_2026-10-01.md), fixtures paginadas, consentimento/revogação, checkpoints e equivalência CSV sintética. Sem transporte HTTP, keys ou contas reais; dependências das Sprints 05–06 continuam abertas |
| **8 — Recorrência e beta de monitoramento** | Segundo read, movimento dos findings, alertas limitados, política de dados e assinatura testável | Valor recorrente observado; checkout mensal test-mode, webhook, cancelamento, isolamento, segurança/legal/ops e limites passam; sem Price ID antigo renomeado | **Preparação local verificada; gate aberto:** [evidência](sprints/SPRINT_08_AI_INTEGRITY_MONITORING_PREPARATION_2026-10-01.md), comparação de scans sintéticos, movimentos, alertas locais/reconhecimento e runbook. Sem scheduler, entrega externa, OpenAI real ou assinatura. Stripe adiado para o final pelo fundador |
| **9 — Lançamento controlado** | Publicação honesta, monitoramento, suporte self-service, métricas de aquisição/ativação e decisão de expansão | Produção observada, claims e preços corretos, incident/rollback prontos e primeiros usuários capazes de concluir sem intervenção obrigatória | **Preparação local verificada; gate aberto:** [audit e runbook](sprints/SPRINT_09_AI_SAAS_LAUNCH_PREPARATION_2026-10-02.md). Decisão `NO_GO`: produção não observada, gates anteriores e usuários independentes pendentes |

**Marcos:** ao fim do Sprint 4 existe um motor de scan verificável; ao fim do Sprint 5 há compra pontual testada; ao fim do Sprint 6 existe evidência de utilidade com compradores reais; ao fim do Sprint 8 pode haver beta de monitoramento; Sprint 9 é o gate de lançamento público. Anthropic, Gemini, Postgres, SDK, credits/entitlements e Stripe Marketplace são **trilhas posteriores condicionais**, não sprints prometidos. A comparação com VIDENCE deve acontecer antes de expandir para reconciliação Stripe ↔ usage além do wedge de custo de IA.

## Sequência técnica

**Ordem atual por direção do fundador (2026-10-01):** Stripe fica para o final. Avançar preparação local das Sprints 08–09 sem afirmar seus gates concluídos; complementar conexão OpenAI real da Sprint 07 antes de monitoramento real. O fluxo conectado importa Stripe/OpenAI por API; o ledger interno inicialmente usa CSV/XLSX. CSV de provider no QA é referência de equivalência, não upload adicional obrigatório no fluxo conectado. Stripe de dados e cobrança/assinatura precisam ser fechados antes da oferta e do lançamento; continua proibido scan gratuito de dados reais.

### Etapa 0 — contrato e proteção

1. Fotografar comportamento local e identificar dados/contratos existentes por workspace e offer, sem ler secrets.
2. Definir threat model para uploads financeiros, credenciais read-only e eventual DB view; classificar acesso de OpenAI/Stripe por capacidade real.
3. Congelar tokens e assets de marca em QA visual. Adicionar fixtures sintéticas de AI SaaS separadas das contractor.
4. Definir esquema aditivo para três fontes, mapping temporal, currency, units, provider pricing provenance, análise imutável e supressões.

**Saída:** nenhum campo MedSpa/contractor reutilizado semanticamente; rollback de deploy e dados definido.

### Etapa 1 — primeira vertical slice

1. CSV/XLSX com preview e mapeamento confirmado para Stripe revenue/subscription, ledger interno e provider usage/cost.
2. Data Quality de IDs, unidade, moeda, período, duplicatas, status e completeness.
3. Matching explícito e coverage. Primeiro finding: provider spend sem atribuição; segundo: divergência entre ledger e provider quando bases comparáveis.
4. Dashboard de evidência e registros excluídos; export reproduzível; segundo import idempotente.
5. Casos adversariais: compartilhamento de API key, retries, stale provider bucket, partial refund, credit, upgrade mid-cycle, múltiplas subscriptions, moedas, timezone, atraso, zero spend, conflito de mapping e outro workspace.

**Gate:** duas fontes incompletas não geram “leak” financeiro; totais não duplicam; UI mostra razão de cada supressão.

### Etapa 2 — validação com pessoas

Recrutar 3–5 compradores AI SaaS de forma assíncrona depois que o checkout pontual e a entrega do scan passarem o gate. Usar dados consentidos e minimizados; revisar cada finding material e falso positivo com responsável. Medir tempo até resultado, atrito de export/mapping e disposição de repetir o scan. Não abrir cobrança pública só porque fixtures passaram; a primeira coorte pode ser beta paga com escopo e limites explícitos. Priorizar correções do motor antes de novos gráficos.

A preparação local da Sprint 06 já permite ensaiar revisão, histórico e export. O [protocolo](validation/SPRINT_06_PAID_PILOT_PROTOCOL.md) contém qualificação, preparação de dados, consentimento a implementar/revisar, métricas e critérios para a coorte. Essa entrega não conclui validação paga nem libera automaticamente esta etapa de conectores.

### Etapa 3 — conectores e monetização

A Sprint 07 tem preparação local verificada com fixtures, sem acesso a contas reais. O pedido do fundador autoriza esse avanço local; não fecha os gates anteriores nem os de escopos/credenciais reais. A flag de fontes permanece desligada no preview comum até preparar um banco local separado; produção continua bloqueada.

Construir Stripe read-only e OpenAI Usage/Costs com scopes/credenciais, revogação, paginação, lag, watermarks e idempotência testados. Comparar saída do conector com CSV do mesmo período. Introduzir a **assinatura** apenas quando o segundo read e a operação justificarem recorrência. Reutilizar o billing existente mediante novos contratos e testes test-mode; nenhum Price ID antigo vira novo plano por rename. Configuração live depende de necessidade verificada e autoridade explícita.

### Etapa 4 — expansão deliberada

Escolher Anthropic/Gemini, view Postgres, SDK ou Stripe Marketplace conforme falha de ativação ou demanda real. Anthropic pode exigir credencial administrativa e sua Cost API tem granularidade diária; Gemini per-request metadata requer instrumentação interna para atribuição. SDK deve ser assíncrono/fail-open. Postgres exige views limitadas a SELECT. Marketplace exige publicação/review e não promete tráfego.

## Gates de experiência e marca

- Screenshots em 1280×720 e mobile para landing, demo, onboarding, dashboard e finding detail; comparar logo, tokens, tipografia e nível de elevação.
- Narrativa pública deve corresponder a input → regra → finding → CTA existentes. Até lá, o novo posicionamento fica na documentação, não em claim live.
- Marcar exemplos sintéticos; deixar claro “observado”, “calculado”, “estimado” e “sem atribuição”. Não converter um custo sem atribuição em “receita perdida”.
- Não publicar análise real gratuita. Manter demo sintética somente leitura. A hipótese de scan pago uma vez a US$99 e monitoramento a US$199/mês, com US$399/mês futuro, só entra após escopo, entitlement, checkout, política de dados e teste de valor. O scan pontual nunca inicia assinatura automaticamente; nenhum plano antigo é renomeado.

## Riscos e decisões abertas

1. **VIDENCE:** comparar escopo e roadmap antes de implementar billing/usage reconciliation duplicado. Este plano não muda VIDENCE.
2. **Marca internacional:** clearance jurídico de REVORY antes de grande investimento externo; os anexos identificam nomes semelhantes, mas não provam conflito.
3. **Dados de custo:** diferenciar report do provider de preço estimado; reconciliar ajustes, créditos e janelas de atualização.
4. **Customer-level attribution:** não há vínculo universal automático provider → customer. Decidir CSV, view ou SDK pelo custo real de ativação, não pela ambição do diagrama.
5. **Produção existente:** investigar assinantes, dados e dependências antes de trocar domínio público. O status live não foi verificado nesta análise.

## Critério para concluir a migração

A migração de produto só termina quando landing, signup, importação, scan, findings, histórico, exports, billing e documentação pública descrevem a mesma capacidade AI SaaS, com QA de dados/segurança e validação real. Atualizar apenas a marca/copy não cumpre o objetivo. Os Sprints 0–4 concluíram fundamentos, persistência, intake, cobertura e motor local interno com dados sintéticos; Sprint 05 adicionou experiência e compra simulada, Sprint 06 adicionou preparação/revisão sintética, Sprints 07–08 adicionaram ensaios de fontes e monitoramento, e Sprint 09 preparou audit e operação. Compra no sandbox real, coorte paga, conexões reais, recorrência, operação e lançamento permanecem com gates abertos. Ser a última sprint numerada não equivale a produto concluído.
