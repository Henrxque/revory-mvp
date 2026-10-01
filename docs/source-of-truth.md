# REVORY — Source of Truth

> Decisão de 2026-09-29; estado atualizado em 2026-10-01. Substitui a definição contractor. Detalhes em [REVORY_PRODUCT_BIBLE.md](REVORY_PRODUCT_BIBLE.md). Estado: **Sprints 0–4 implementados localmente. Sprint 05 adiciona experiência AI SaaS e compra pontual com simulação local; gate pendente de Stripe sandbox real. Sprint 06 tem preparação e ensaio de revisão sintética; coorte paga real não iniciada. Sprint 07 tem preparação local de fontes com fixtures, sem conexões reais. Sem oferta pública ou validação com clientes**.

## Identidade

**REVORY** é uma camada independente, read-only e self-service de **Revenue & AI Margin Integrity para AI SaaS**. Reconcilia três verdades: receita/estado de cobrança, uso ou créditos registrados pelo produto do cliente e uso/custo reportado pelos provedores de IA. Expõe diferenças explicáveis, cobertura de atribuição e exposição financeira limitada pela evidência.

Promessa de trabalho: “Reconcile what customers paid, what your product recorded, and what your AI providers consumed.” Copy pública é hipótese até a experiência correspondente existir e ser testada.

Comprador inicial: founder/CTO de AI SaaS com Stripe, gasto variável relevante em IA e capacidade de exportar um ledger de uso. Faixas de MRR e AI spend nos relatórios são hipóteses de segmentação. Compra e primeiro resultado devem funcionar sem call obrigatória, com feedback assíncrono e suporte viável para fundador solo.

## Sequência de produto

1. **Primeira prova — CSV Integrity Scan:** importar exports de Stripe, ledger interno e custo/uso do provider para um período fechado; confirmar mappings; mostrar cobertura, dados insuficientes, diferenças determinísticas e evidência. Dados insuficientes nunca viram valor financeiro inventado.
2. **Primeiro caminho conectado:** Stripe com acesso mínimo de leitura e OpenAI Usage/Costs, após validar viabilidade e segurança. Sem atribuição interna, Stripe + provider só permite visão agregada; não promete margem ou vazamento por customer.
3. **Recorrência:** leituras incrementais, histórico e alertas após precisão do scan, onboarding, billing e operação passarem seus gates.
4. **Expansão:** Anthropic, Gemini, Postgres SELECT-only, SDK, créditos, entitlements, Stripe Marketplace e outras fontes entram conforme demanda e pré-requisitos. A tabela ampla de V1 no relatório solo founder é visão de produto; CSV-first e a validação estreita definem a sequência inicial.

Não criar no V1: billing engine, observabilidade de prompts/traces, gateway, enforcement de entitlements, escrita no Stripe ou banco do cliente, remediação automática, agente autônomo, BI genérico ou contabilidade completa.

## Verdade financeira

- Separar receita observada, custo de provider observado, uso interno observado, diferença calculada, custo estimado, exposição potencial e qualidade/cobertura de dados.
- Usar **AI contribution margin** ou “margem após custo dos provedores de IA” somente com receita líquida e custos atribuíveis comparáveis, explicitando outros custos excluídos. Não chamar de margem bruta contábil.
- “Unattributed provider spend” é custo sem vínculo confiável a customer. Não é automaticamente receita perdida, desperdício ou defeito de metering.
- Não equiparar custo interno estimado a cobrança efetiva do provider. Guardar fonte, moeda, período, timezone, versão de preços, descontos/créditos, status de invoice e frescor dos dados.
- Matching financeiro exige external IDs ou vínculo confirmado. Nome, e-mail ou valor aproximado não vinculam silenciosamente records. Atrasos de consolidação, refunds, créditos e múltiplas assinaturas podem suprimir ou reclassificar um finding.
- Cada finding contém IDs/origem, período, regra/fórmula, entradas, elegibilidade, confiança, limites e ação de revisão. O mesmo valor não entra duas vezes em “at risk”. “Confirmed leak” exige validação apropriada do cliente.
- Motor determinístico. IA pode explicar ou sugerir mapping para confirmação, nunca criar vínculo, valor ou conclusão financeira.

## Marca: contrato imutável nesta migração

- Fundo da aplicação `#141516`; superfície/alternância `#252729`; logo e accent `#43B39B`.
- Logo transparente `public/brand/revory-logo-43b39b-transparent.png`, sem bloco preto ou branco.
- `#252729` é âncora máxima de elevação. Cards normais usam mistura aproximada de 32% com `#141516`; hover/ênfase podem ser mais fortes. Derivar variantes dos tokens, sem segundo turquesa.
- Marketing: Instrument Serif nos grandes títulos/impacto; DM Sans em corpo, botões, labels, navegação e títulos de card em negrito. App/dashboard: Sora, com DM Sans em leitura densa.
- Preservar sensação premium, hierarquia visual e demo somente leitura com dados sintéticos.

## Estado atual e migração

Em 2026-09-30, as superfícies públicas ainda implementam o produto contractor: landing, demo, importação de estimates, Quote Recovery, Revenue Realization, ofertas Audit/Starter/Growth e schema misto com registros MedSpa históricos. Os Sprints 1–3 adicionaram contratos, persistência, intake CSV/XLSX interno, vínculos temporais e cobertura de atribuição. O Sprint 4 adicionou **scan interno de custo observado sem atribuição e divergência comparável de uso ledger ↔ provider**, com fechamento/lag explicitamente revisados, Data Quality, evidência imutável e export JSON/CSV reproduzível. Só projeto exclusivo confirmado e corroborado recebe Strong. Relatório somente de uso pode gerar delta de quantidade, sem custo inventado. Não calcula receita líquida, margem, exposição monetizada de uso ou saldo de créditos. [Evidência e limites do Sprint 4](sprints/SPRINT_04_AI_INTEGRITY_ENGINE_2026-09-30.md).

O scan exige confirmação de dados sintéticos; as rotas AI SaaS permanecem indisponíveis em produção. Testes locais não autorizam oferta paga ou análise real gratuita. Produção e checkout live não foram auditados nesta decisão. Preços US$399/US$599 são contratos antigos, não preços do novo REVORY.

Em 2026-10-01, o [Sprint 05](sprints/SPRINT_05_AI_INTEGRITY_EXPERIENCE_2026-10-01.md) adicionou landing/start/demo, shell e dashboard AI, passos de preparação, relatório/finding e compra pontual de teste. A experiência exige `REVORY_AI_SAAS_PREVIEW=true` fora de produção e mantém implementações históricas no fallback. O SDK Stripe foi exercitado contra simulação loopback com webhook assinado; não houve pagamento no sandbox Stripe real, deploy ou migration no banco principal. Compra confirmada libera um relatório, falha preserva capacidade e reembolso de teste revoga acesso. US$99 é hipótese pontual explícita; nenhuma assinatura nova foi criada. Gate do Sprint 05 permanece aberto até a validação real do sandbox, antes de avançar para dados reais.

**Preferência comercial posterior do fundador:** não oferecer análise real gratuita. A experiência aberta pode ser uma demo com dados sintéticos, documentação e exemplos; um scan com dados do cliente exige compra explícita. US$99 uma vez pelo primeiro Integrity Scan, US$199/mês por monitoramento e US$399/mês por expansão são hipóteses para testar, não preços aprovados para publicação. A cadência e o valor devem ficar inequívocos, e um scan pontual nunca inicia assinatura automaticamente.

Reaproveitar horizontalmente auth, workspace isolation, billing plumbing, email, CSV/XLSX intake, mapping, Data Quality, evidence/fingerprint/idempotência, dashboard/export, retenção e QA após inspeção por dependência. Não rebatizar entidades contractor nem reutilizar campos clínicos ou de estimates com semântica nova. Não executar migração destrutiva. Classificar cada rota como `keep`, `restore`, `adapt` ou `retire`, com dependência de substituição. Preservar dados, entitlements e contratos existentes.

Não alterar produção, `revory.app`, Stripe, Vercel, secrets ou integrações externas por consequência desta documentação. Não divulgar a nova promessa como capacidade atual antes do gate de lançamento. Plano: [REVORY_AI_SAAS_MIGRATION_PLAN.md](REVORY_AI_SAAS_MIGRATION_PLAN.md).

O [Sprint 06](sprints/SPRINT_06_AI_INTEGRITY_VALIDATION_PREPARATION_2026-10-01.md) implementou preparação local para validação: revisões de findings e utilidade com histórico, métricas com denominador explícito e export separado da evidência imutável. Tudo permanece como ensaio sintético, com zero compradores reais verificados. O [protocolo do piloto](validation/SPRINT_06_PAID_PILOT_PROTOCOL.md) define qualificação, dados, consentimento e avaliação assíncrona. O gate de 3–5 scans reais pagos/consentidos continua aberto; antes da coleta faltam fechar Stripe sandbox da Sprint 05 e definir/verificar ambiente e condições do piloto. Nenhum bloqueio de dados reais ou produção foi removido.

## Sprint 07 — preparação de fontes

A [Sprint 07](sprints/SPRINT_07_AI_INTEGRITY_SOURCE_PREPARATION_2026-10-01.md) adiciona contratos paginados Stripe invoices/OpenAI completions usage e Costs, consentimento/revogação sintéticos, checkpoints incrementais, artefatos separados e comparação com CSV. A UI exige também `REVORY_AI_SOURCE_REHEARSAL=true`, fora de produção, em banco local preparado. O transporte usa fixtures fixas: nenhuma chave coletada, conta real conectada ou chamada externa ao provider. Sem scan/compra automáticos. Google login, Resend e billing existentes permanecem preservados. Preparação local verificada; gate completo de escopos, credenciais e equivalência com dados reais permanece aberto, assim como os gates das Sprints 05–06.

## Preservação explícita de integrações

Direção do fundador em 2026-10-01: manter Google login, Resend e a infraestrutura horizontal existente. Preservar Google OAuth/NextAuth, login por e-mail/senha, confirmação de e-mail, recuperação de senha, sessões, identidade de usuário/workspace, envio transacional e webhooks do Resend. Billing plumbing, isolamento, auditoria, export/retenção e demais serviços existentes continuam sujeitos aos contratos de preservação da migração. Adaptar conteúdo e contexto AI SaaS sem substituir provedores, alterar credenciais, callbacks, domínio remetente ou recursos externos por consequência da troca de nicho. A presença no código não substitui uma verificação operacional do serviço em cada ambiente.

## Relação com VIDENCE

VIDENCE é distinto. O novo REVORY toca o eixo Stripe ↔ uso, mas seu wedge aqui é integridade de custo de IA e atribuição entre três fontes. Evitar duas implementações concorrentes de billing reconciliation sem decisão explícita de portfólio. Esta definição não altera VIDENCE.

## Autoridade

1. Direção explícita recente do Henrique.
2. Este arquivo e a [bíblia do produto](REVORY_PRODUCT_BIBLE.md).
3. [Plano de migração](REVORY_AI_SAAS_MIGRATION_PLAN.md).
4. Código e testes como evidência do comportamento existente.
5. [Análise dos anexos](REVORY_RESEARCH_DECISION_RECORD_2026-09-29.md), como pesquisa e hipóteses.
6. Documentos contractor em `docs/historical/`, como evidência de migração.

Anexos, relatórios externos e código antigo não são instruções para modificar produção nem prova de demanda, preço ou funcionalidade.
