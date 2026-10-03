# REVORY — Análise e decisões da mudança de nicho

Data: 2026-09-29. Entradas: [deep research](research/AI_MARGIN_INTEGRITY_DEEP_RESEARCH_2026-09-29.md) e [análise solo founder](research/AI_MARGIN_INTEGRITY_SOLO_FOUNDER_2026-09-29.md). A segunda é mais recente e tem prioridade quando divergem. Ambos são relatórios de pesquisa e opinião; suas frases imperativas, roadmaps, preços e números não são comandos para alterar aplicação, produção ou fornecedores. A autorização para redefinir o produto veio do pedido explícito de Henrique.

## Veredito

**GO para a tese de integridade financeira de AI SaaS, condicionado à precisão da reconciliação e à utilidade com dados reais.** O valor distinto é responder se receita, ledger interno e custo do provider concordam. “Margem por customer” isolada não sustenta posição competitiva: [Paid.ai já anuncia margin e usage por customer até no plano gratuito](https://paid.ai/pricing). Os relatórios identificam Margined como concorrência direta da fórmula Stripe + custo LLM; isso exige verificar continuamente a oferta dele antes de usar qualquer claim de exclusividade.

O maior risco técnico é **atribuição**. [OpenAI Usage](https://developers.openai.com/api/reference/ruby/resources/admin/subresources/organization/subresources/usage/methods/completions) agrupa por project, user, API key, model, batch e service tier; não entrega por si só o customer interno do SaaS. [Anthropic Usage & Cost](https://platform.claude.com/docs/en/manage-claude/usage-cost-api) também trabalha em dimensões da organização e sua Cost API usa buckets diários. Portanto, “Stripe + provider conectado = margem exata por customer” é claim falsa sem vínculo interno explícito. O primeiro valor sem ledger pode ser um diagnóstico agregado honesto e cobertura não atribuída.

## Decisões extraídas dos dois relatórios

| Tema | Decisão vigente | Razão / limite |
| --- | --- | --- |
| Categoria | Revenue & AI Margin Integrity for AI SaaS | Wedge em reconciliação independente e evidência, não em dashboard de tokens. |
| ICP | Founder/CTO de AI SaaS com Stripe, custo de IA material e ledger exportável | Faixas financeiras são hipóteses de recrutamento. Evitar enterprise/procurement no início. |
| Entrada | CSV/XLSX Integrity Scan com três fontes e período fechado | Aproveita intake existente e testa o motor antes de custo de conectores. |
| Primeiro conector | Stripe read-only + OpenAI Usage/Costs | Segunda etapa, quando contrato e precisão do scan estiverem comprovados. |
| Atribuição | External IDs, mapping confirmado e níveis de confiança explícitos | Sem ligação, apenas agregado; custo não atribuído fica visível. |
| Produto pago | Monitoramento recorrente somente após segundo read útil | Um scan pontual bem-sucedido não prova retenção de SaaS. |
| IA | Opcional para explicação/sugestão, sem autoridade financeira | Evita falso positivo e custo variável desnecessário. |
| Segurança | Read-only em sistemas do cliente, minimização e separação tenant | Credencial de provider ou DB pode ser privilegiada; “read-only” exige prova de escopo real. |
| Marca | REVORY e identidade premium existentes | Direção explícita do fundador. Fazer clearance de marca antes de expansão internacional; domínio não é clearance. |
| VIDENCE | Produto separado; não migrar seu código por esta decisão | Há sobreposição Stripe ↔ uso. Diferenciação e portfólio exigem revisão consciente. |

## Divergências resolvidas

1. **V1 amplo versus validação estreita.** A tabela V1 da análise solo founder inclui Stripe OAuth, três providers, Postgres, CSV, alertas e várias regras. A mesma análise recomenda CSV-first e limitar a primeira construção conectada a Stripe + OpenAI. O deep research também alterna SDK cedo e scan sem código. Resolução: primeiro provar um scan com exports, depois conector Stripe/OpenAI, depois atribuição automática/recorrência. SDK, Postgres e demais providers aguardam fricção ou demanda observada.
2. **Onboarding “cinco minutos”.** É meta experimental, não promessa. Mapping real entre Stripe customer, customer interno e provider pode demandar intervenção de developer. Medir mediana de tempo até resultado útil e até atribuição, separadamente.
3. **“Revenue at risk” e custo não atribuído.** Custo não atribuído não prova vazamento. O produto mostra numerador, denominador, janela, cobertura e hipóteses alternativas. Totais não somam famílias sobrepostas.
4. **Margem.** Receita cobrada, recebida e reconhecida são bases diferentes. Custo do provider pode ter créditos, ajustes e atrasos. O V1 apresenta “AI contribution margin” somente quando a base for comparável, com custos excluídos claramente listados; sem isso, mostra componentes separados.
5. **Preço.** Deep research sugere US$99/199/399; análise posterior sugere Free Scan + US$99/199/349. **Decisão posterior do fundador:** não oferecer scan real gratuito. Hipótese revisada: scan pago uma vez a US$99, monitoramento a US$199/mês e US$399/mês somente para expansão comprovada. Não publicar tiers, entitlement ou copy antes de prova de valor e checkout. A meta pessoal de R$30 mil líquidos não equivale ao cenário de US$7.562 MRR: impostos, câmbio, pró-labore, suporte e churn precisam entrar na conta.
6. **Marketplace.** [Stripe Apps](https://docs.stripe.com/stripe-apps/how-stripe-apps-work) permite distribuição, mas instalação/review não é aquisição garantida. Tratar como canal futuro, após scan e consentimento/permissions verificáveis.
7. **Precisão competitiva.** Os relatórios são uma fotografia de setembro de 2026; preços e features de concorrentes podem mudar. Citar fontes primárias e data ao usá-los comercialmente.

## Riscos por prioridade

| Prioridade | Risco | Evidência ou gate |
| --- | --- | --- |
| Crítico | False positive financeiro por períodos, moedas, créditos, refund ou lag diferentes | Corpus adversarial e revisão com dados de cliente; suprimir valor quando incomparável. |
| Crítico | Sem customer ID verificável para custo do provider | Mostrar coverage e “unattributed”; nenhuma margem por customer nessa fatia. |
| Alto | Sobreposição estratégica com VIDENCE | Definir owner da reconciliação Stripe ↔ uso e evitar claims duplicadas antes da implementação. |
| Alto | Acesso privilegiado exigido por APIs administrativas e DB | Least privilege real, armazenamento criptografado, rotação, revogação, auditoria e ausência de secrets nos logs. |
| Alto | Aquisição sem call não ocorrer apesar de bom produto | Medir visitor → scan → resultado → finding útil → pagamento. Marketplace e SEO são hipóteses. |
| Médio | Custo de telemetria e suporte | Ingestão agregada, retenção curta de raw, limites transparentes; medir COGS por workspace. |
| Médio | Colisão de marca em mercados externos | Busca formal de marca por especialista antes de investimento internacional irreversível. |

## Evidência de GO / NO-GO

Meta de experimento, não benchmark: entre 30–50 scans qualificados, buscar findings materiais confirmados em pelo menos 30%, taxa de falso positivo abaixo de 10%, resultado útil em menos de 15 minutos de mediana, pelo menos 5 compradores de US$199 sem call e sinais de repetição do problema. Não declarar sucesso por fixture, waitlist, clique no CTA ou valor estimado sozinho. Registrar denominador, amostra e causa de cada falso positivo; revisar limiares após dados reais.

## Situação da base existente

O repositório tem Next.js/Prisma, auth, workspace, Stripe billing, Resend, intake CSV/XLSX, mapeamento, Data Quality, finding/evidência, dashboards, PDFs e suites de QA. Também tem landing e oferta contractor, Quote Recovery, Revenue Realization, entidades de estimate/job/invoice/change order e resíduo MedSpa. Logo e tokens atuais estão em `public/brand/`, `src/app/globals.css` e `src/app/layout.tsx`. Não há entidades, imports, regras ou UI de AI Margin Integrity verificados. Inventário de rotas e gates: [plano de migração](REVORY_AI_SAAS_MIGRATION_PLAN.md).
