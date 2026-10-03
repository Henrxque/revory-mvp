# REVORY — Bíblia do produto

> Versão 1, criada em 2026-09-29; estado atualizado em 2026-10-01. Documento vivo de produto para a migração completa de nicho. [Source of truth](source-of-truth.md) decide conflitos; [análise dos anexos](REVORY_RESEARCH_DECISION_RECORD_2026-09-29.md) registra hipóteses e [plano de migração](REVORY_AI_SAAS_MIGRATION_PLAN.md) registra dependências técnicas.

## 1. O produto em uma página

**Nome público:** REVORY. **Categoria de trabalho:** Revenue & AI Margin Integrity for AI SaaS. **Job central:** encontrar e explicar quando cobrança, uso interno e consumo/custo externo de IA não fecham entre si. **Resultado:** um founder sabe qual diferença merece revisão, quais fontes a sustentam, qual valor é defensável e o que ainda não pode ser atribuído.

```text
Stripe: receita / estado da cobrança
             ↘
Ledger do produto: cliente / uso / créditos  → mapping + Data Quality
             ↗                                  → reconciliação determinística
Provider: uso / custo da organização          → coverage + findings + evidência
```

O REVORY lê e audita sistemas existentes. Não coleta pagamento do cliente final, não controla execução de IA, não muda preços, subscriptions, créditos ou entitlements e não escreve no banco do cliente. Cobrança da assinatura do próprio REVORY é separada dessa promessa read-only.

**Mensagem proposta, ainda não publicável como funcionalidade:** “Reconcile what customers paid, what your product recorded, and what your AI providers consumed.” A formulação mais emocional “Find where your AI SaaS is quietly losing money” pode ser testada, sempre subordinada à precisão da promessa.

## 2. Buyer, contexto e rejeições

Buyer principal: founder/CTO ou responsável por engenharia/finanças de AI SaaS pequeno ou médio, usando Stripe e pelo menos um provider de IA, com custo variável que já merece atenção mensal. Critério de ativação: consegue fornecer export de receita/assinaturas, ledger de uso com IDs e período, e extrato de uso/custo do provider. Faixas sugeridas de US$20–100k MRR e US$1–15k de AI spend são hipóteses de prospecção; não barrar clientes por número sem dado.

Dor: crescimento de custos de modelos, créditos que não batem, requests sem atribuição, usuários cancelados ainda consumindo, divergência entre ledger e provider, planos que subsidiam heavy users. O usuário quer diagnóstico financeiro confiável com pouca configuração; prefere correção no próprio sistema. O REVORY aponta a revisão, sem assumir a remediação.

Evitar no início buyers que exigem on-prem, procurement, SLA customizado, múltiplos sistemas contábeis ou instrumentação complexa antes do primeiro valor. Recrutar beta por canais assíncronos é válido. “Sem call obrigatória” não dispensa conversar com usuários por formulário, e-mail ou revisão voluntária dos findings.

## 3. Três verdades e suas limitações

| Fonte | O que pode provar | O que não prova sozinha |
| --- | --- | --- |
| Stripe | Customer/subscription/price/invoice/payment/refund conforme objeto, estado e período importados | Consumo real do produto, custo de IA por customer, receita reconhecida contábil |
| Ledger interno | Eventos, créditos e customer IDs conforme instrumentação do SaaS | Que todos os requests foram registrados ou que preço/custo do provider é igual à estimativa |
| Provider | Uso e custos oficiais nas dimensões que a API/export expõe | Customer final do SaaS quando vários customers compartilham project/API key |

Para um período, registrar timezone, fechamento, watermark e idade da última atualização de cada fonte. Nenhuma diferença em janela ainda aberta vira “leak confirmado”. Diferenciar invoice criada, paga, reembolsada e receita líquida coletada. Custos do provider podem refletir créditos, descontos, tiers, batch, cache, modalidades e ajustes; armazenar a metodologia de cada componente. Não inventar conversão entre moeda de receita e custo: mostrar separadamente ou usar taxa explícita, datada e rastreável.

## 4. Linguagem financeira

- **Observed revenue:** valor presente no objeto Stripe selecionado; indicar se invoice, charge ou net collected. Um mesmo pagamento nunca entra duas vezes.
- **Observed provider cost:** custo reportado pelo provider, no bucket e escopo definidos. Se o dado for apenas usage, não rotular o custo modelado como cobrado.
- **Observed internal usage:** contagem/quantidade/créditos registrada pelo cliente, com unidades e IDs originais.
- **Calculated mismatch:** diferença determinística entre bases comparáveis, após deduplicação e janela de atraso. Pode ser quantidade ou valor.
- **Estimated cost / exposure:** preço de catálogo × usage ou extrapolação; sempre separado do observado e nunca somado a valor observado sobreposto.
- **Unattributed spend:** parcela de custo observado sem vínculo confiável a customer. É problema de cobertura; causa e perda são desconhecidas.
- **Potential revenue leakage:** diferença com caminho de cobrança demonstrável e evidência suficiente; pedir confirmação do cliente antes de “confirmed”.
- **AI contribution margin:** (net collected revenue − attributable AI provider costs) / net collected revenue, somente quando as bases são comparáveis e a cobertura é exibida. Não inclui infraestrutura, pagamentos, suporte ou outros COGS.

Nenhum “Integrity Score” ou “Margin at Risk” numérico aparece até uma fórmula auditável, escala, denominador e regra de não duplicação estarem definidos e testados. Percentual de confiança não é probabilidade estatística sem calibração real; V1 usa classes legíveis e critérios.

## 5. Contratos mínimos de dados

Toda entidade tem `workspaceId`, `sourceSystem`, `externalId`, versão de import/snapshot, período, moeda/unidade quando aplicável e provenance. Preservar registro original ou referência verificável durante a janela de retenção; normalização nunca apaga conflito.

| Objeto | Campos centrais |
| --- | --- |
| Revenue record | stripe customer ID, subscription/invoice/payment ID, amount, currency, status, effective period, refund/credit state |
| Internal customer map | internal account/customer ID, stripe customer ID, origem da confirmação, validade temporal |
| Usage event/aggregate | event ID ou dedupe key, internal customer ID, provider, project/key se disponível, model, feature opcional, timestamp, quantity/unit, credits debited |
| Provider bucket | provider, organization/project/key, model/serviço, janela, quantity/unit, cost, currency, report freshness, adjustments |
| Mapping | duas identidades ligadas, método (exact/confirmed), quem confirmou, data, vigência, conflito |
| Analysis run | input hashes, período fechado, versão das regras/preços, coverage, suppressions, findings, idempotency key |
| Finding | type, category, status, severity/priority, inputs, source IDs, formula, value basis, confidence class, limitation, recommended review, fingerprint |

CSV/XLSX exige template de exemplo, preview, confirmação de colunas, validação de tipos/datas/moeda/duplicatas e erro por linha. Importar parcialmente com exclusões visíveis, quando seguro. Um arquivo de “provider cost” sem dimensão de customer não deve receber customer ID por matching de nome.

## 6. Matching, atribuição e cobertura

Ordem de vínculo: ID explícito compartilhado → mapping confirmado pelo usuário → dimensão exclusiva por customer comprovada no período. Matching fuzzy pode gerar sugestão para revisão, jamais vínculo financeiro persistido.

Classes de atribuição: **Exact** (evento com customer e provider correlacionáveis); **Strong** (project/API key comprovadamente exclusivo); **Mapped** (ledger confirmado e reconciliado com total do provider); **Estimated** (usage × preço, sem custo observado por customer); **Unattributed**. Cada fatia carrega método, período e fonte. Uma classe não substitui a outra por UI styling.

`Attribution coverage = provider cost atribuído com método elegível / provider cost total comparável`. Excluir fontes ausentes do denominador somente com indicação explícita do escopo; não vender “95% de todo o custo” se o scan conhece apenas OpenAI. `Integrity coverage` exige denominador próprio e só será exibida depois que “fluxos reconciliáveis” estiver definido.

**Estado local após Sprint 04 (2026-09-30):** revisão explícita de vínculos e coverage por provider/moeda, seguida de scan interno com dados sintéticos. Buckets só permitem Strong quando projeto exclusivo foi confirmado e corroborado; Exact, Mapped e Estimated não entram no numerador de custo. O motor gera custo observado sem atribuição e delta comparável de uso, preservando snapshots e export completo. Margem e claim público continuam fora do escopo. [Evidência](sprints/SPRINT_04_AI_INTEGRITY_ENGINE_2026-09-30.md).

No motor `ai-integrity/4.1.0`, as três fontes selecionadas devem declarar o mesmo intervalo UTC e ter membership completo. O operador informa fechamento, export/refresco e lag de 0–720 horas; isso é uma declaração auditável, não garantia do provider. Buckets com timestamp de reporte contraditório ou anterior ao lag ficam suprimidos. Imports parciais suprimem comparação de uso; custo elegível restante é um denominador parcial explicitamente delimitado. Sobreposições agregado/detalhe, versões conflitantes, requests duplicados e unidades incompatíveis não geram deltas. Relatórios só de uso podem ser comparados com mapping e escopo elegíveis, mantendo valor monetário ausente.

O snapshot congela dados normalizados, hashes, source reviews, mappings/provenance, regra, coverage e suppressions; o JSON permite replay. CSV é resumo de findings, sem capacidade de replay sozinho. Retenção inclui todos os lotes usados como evidência, inclusive imports que revelam contradições. Não existe soma conjunta de custo sem atribuição e delta de uso.

**Estado local do Sprint 05 (2026-10-01):** experiência AI SaaS sob flag de desenvolvimento, com landing, demo derivada do motor, onboarding, dashboard, relatório e finding detail. Oferta sintética de US$99 pontual, ordens/capacidades próprias, confirmação de pagamento e consumo atômico por relatório. Fluxo completo verificado com SDK Stripe contra simulação local e dados sintéticos; Stripe sandbox real ainda não validado. Sem produção, customer beta ou liberação automática do Sprint 06. [Evidência e pendência](sprints/SPRINT_05_AI_INTEGRITY_EXPERIENCE_2026-10-01.md).

**Preparação local do Sprint 06 (2026-10-01):** revisão sintética de findings e utilidade, histórico de correções e export separado da evidência do motor. Categorias: diferença sustentada, diferença esperada, falso positivo e evidência insuficiente. Confirmar diferença não confirma perda financeira. A taxa de falso positivo usa apenas a última revisão conclusiva de cada finding; sem revisão/evidência insuficiente são contagens separadas, e ausência de denominador não vira 0%. Tempo de preparação é auto declarado; ajuda necessária é registrada. Tudo está em `SYNTHETIC_REHEARSAL`, com zero participantes reais pagos. [Evidência](sprints/SPRINT_06_AI_INTEGRITY_VALIDATION_PREPARATION_2026-10-01.md) e [protocolo do piloto](validation/SPRINT_06_PAID_PILOT_PROTOCOL.md). A coorte de 3–5 compradores ainda exige gate Stripe, ambiente/condições de dados e compra/consentimento reais; nenhum desses resultados foi produzido pelo ensaio.

Conflitos de mapping, customer com múltiplas subscriptions, shared keys, moedas distintas, lacunas de datas e ausência de invoice/refund devem ficar em “Needs review” ou “Not enough evidence”. Esses records não desaparecem nem contaminam somas.

**Preparação local do Sprint 07 (2026-10-01):** leituras paginadas com fixtures Stripe/OpenAI, consentimento/revogação e checkpoint incremental por workspace, artefatos separados e equivalência sintética com CSV. Invoice amount_paid é contexto de criação, não receita líquida; completions input já inclui cached tokens; Costs por project não tem model/customer automaticamente. Não há transporte HTTP, API keys ou contas reais. A tela exige a flag adicional `REVORY_AI_SOURCE_REHEARSAL=true` em banco local preparado, sem liberar dados reais ou produção. [Evidência e gate pendente](sprints/SPRINT_07_AI_INTEGRITY_SOURCE_PREPARATION_2026-10-01.md).

**Preparação local do Sprint 08 (2026-10-01):** compara dois scans sintéticos por escopo temporal, com estados New/Still observed/No longer observed/Limited, custo e uso separados, alertas locais limitados, reconhecimento auditado e export v9 do workspace. Exige períodos adjacentes de mesma duração, lag e fontes/buckets equivalentes. Não existe leitura agendada, envio de e-mail, assinatura ou OpenAI real. Stripe foi adiado pelo fundador para o final; isso não conclui gates comerciais. [Evidência](sprints/SPRINT_08_AI_INTEGRITY_MONITORING_PREPARATION_2026-10-01.md) e [runbook](validation/SPRINT_08_MONITORING_REHEARSAL_RUNBOOK.md).

**Preparação local do Sprint 09 (2026-10-02):** audit reproduzível e runbook de lançamento controlado, com decisão `NO_GO`. A experiência AI SaaS segue indisponível em produção; home, metadados e limitações públicos ainda são contractor. Não há compradores pagos verificados, conexões reais, recorrência, funil de ativação ou operação de produção AI SaaS comprovados. É a última sprint numerada, mas o produto e o lançamento dependem do fechamento dos gates reais. [Evidência](sprints/SPRINT_09_AI_SAAS_LAUNCH_PREPARATION_2026-10-02.md) e [runbook](launch/REVORY_AI_SAAS_RELEASE_RUNBOOK.md).

## 7. Findings do primeiro produto

| Finding | Condição mínima | Saída honesta |
| --- | --- | --- |
| Provider spend sem atribuição | Custo observado > custo atribuído no mesmo escopo/período, com coverage conhecida | Diferença e fração sem customer, não “dinheiro perdido” |
| Ledger ↔ provider divergente | Mesma unidade/escopo/período, mappings confirmados, lag superado | Delta de uso/custo, alternativas e IDs |
| Uso com customer sem cobrança observada | Customer mapeado e uso pós janela de cobrança/estado, sem trial/crédito explicativo | Risco para revisão; valor somente com rate/contrato defensável |
| Custo de IA maior que receita atribuível | Net collected e custo por customer comparáveis, coverage suficiente | AI contribution negativa no período; não lucro líquido negativo |
| Débito de créditos inconsistente | Regras de créditos e ledger disponíveis | Delta de créditos; valor financeiro apenas quando preço/contrato permitem |
| Múltiplos vínculos ativos | Dois ou mais IDs/assinaturas incompatíveis para o mesmo período | Risco de Data Quality, sem somar “leak” |

O primeiro scan pode lançar apenas as duas primeiras famílias e Data Quality. As demais exigem os dados e testes indicados. Cost spike, plan profitability, canceled usage e entitlement drift são expansão, não promessa automática do V1.

Cada detalhe mostra lado A, lado B, período, fonte, último sync, cálculo, hipótese alternativa e ação limitada (“review mapping”, “compare internal logs”, “check billing state”). O usuário marca “confirmed issue”, “expected”, “false positive” ou “needs more data”; histórico conserva a classificação para melhorar precisão.

## 8. Experiência e telas

**Landing:** uma tese, três fontes, exemplo de finding com rótulo de dados sintéticos, metodologia curta, segurança/read-only, requisitos de dados, preço apenas quando oferta existir e CTA para demo ou scan pago. Não prometer instalação em 5 minutos antes de medir. Demo pública é somente leitura, sem dados do visitante e separada da análise real.

**Onboarding:** conta/workspace → escolher caminho CSV → upload das três fontes → mapear colunas e IDs → Data Quality → período e base financeira → scan → relatório. Se o usuário tiver só duas fontes, mostrar diagnóstico agregado e a fonte que falta para atribuição. Conector Stripe/OpenAI entra depois com consentimento mínimo e revogação visível.

**Relatório inicial:** (1) período e fontes; (2) cobertura por fonte e atribuição; (3) totais observados separados; (4) diferenças calculadas elegíveis; (5) findings ordenados por impacto e confiança; (6) records excluídos; (7) CTA de próxima revisão. O primeiro bloco responde “What can I trust?” antes de mostrar margem.

**Histórico:** duas leituras comparáveis mostram novos, persistentes, resolvidos e suprimidos. “Recovered” requer confirmação e evidência pós-correção; uma diferença que desapareceu não prova dinheiro recuperado.

## 9. Segurança, privacidade e operação

Read-only em sistemas externos; conta própria do REVORY pode gravar mappings, preferências e classificações. Segredos de connectors criptografados, isolados por workspace, sem logs e com rotação/revogação. Preferir arquivos e views específicas sem prompts, completions, PII ou dados de cartão. Postgres futuro usa SELECT-only em views dedicadas e nunca credencial admin. SDK futuro deve ser assíncrono e fail-open; nenhuma falha do REVORY pode bloquear o produto do cliente.

Definir retenção de raw e rollups por necessidade e compromisso contratual, com export/delete verificáveis. Finite file size, row/event caps e custo por workspace. Workspace authorization em todas as rotas/jobs/exports, import idempotente, snapshot imutável, auditoria de mappings e testes cross-tenant. Não anunciar certificação não obtida.

## 10. Packaging e economia

**Preferência do fundador:** nenhum scan real gratuito. Demo sintética e requisitos de dados podem ser públicos, sem analisar arquivos de visitantes. **Hipótese para experimento:** Integrity Scan a US$99 uma vez, sem assinatura automática; monitoramento a US$199/mês, somente depois de demonstrar valor recorrente; US$399/mês para expansão futura que sustente preço maior. Esses valores não estão aprovados para publicação nem substituem contratos Stripe antigos. Testar preço e escopo com compradores; evitar três planos mensais antes de provar a primeira oferta. Cobrar por empresa/faixa de monitoramento com limites de fontes, histórico e volume transparentes, não por seat ou token sem relação com valor.

Na experiência local de teste do Sprint 05, uma compra ativa concede um relatório por período/evidência. Reenvio idêntico retorna o snapshot, sem consumir outra compra; falha não consome. Retenção não restaura capacidade usada. Condições sintéticas `test-v1` são separadas dos contratos históricos e não constituem aprovação de preço/termos para clientes reais.

Validação separada: fixture/sandbox prova engenharia; dados reais e revisão do comprador provam utilidade; compra/renovação prova disposição a pagar e recorrência. A meta pessoal de R$30 mil líquidos/mês exige P&L com tributos brasileiros, câmbio, fees, infra, suporte e pró-labore; os cenários anexos excluem partes relevantes e não são forecast.

## 11. Gates

| Gate | Saída requerida |
| --- | --- |
| G0 — domínio | Contratos de dados, bases financeiras, threat model e inventário da plataforma aprovados |
| G1 — scan local | Imports/mapping, Data Quality e regras ponta a ponta com fixtures positivas, negativas, atrasos, refunds, duplicatas, moeda e tenant isolation |
| G2 — utilidade | Compra pontual testada e 3–5 scans pagos com dados reais consentidos; revisão assíncrona dos findings, erros e tempo até primeiro valor documentados |
| G3 — conectores | Stripe/OpenAI somente leitura real, escopos e lag entendidos, revogação, sync idempotente e comparação com CSV |
| G4 — beta de monitoramento | Primeiro e segundo read úteis, assinatura/entitlement testados, privacy/legal/ops, limites e suporte definidos; preço de teste explícito |
| G5 — expansão | Evidência de demanda e retenção para provider/SDK/DB/Marketplace específico |

O documento de análise sugere métricas de GO como 30% dos scans com finding material, falso positivo <10%, <15 minutos até resultado e cinco compradores de US$199 sem call. Tratar como limiares de teste revisáveis, com denominadores e amostras publicados, não fatos comprovados.

## 12. Contrato visual

Preservar integralmente logo transparente, `#141516`, `#252729`, `#43B39B`, mistura dos cards, Instrument Serif/DM Sans/Sora e a composição premium estabelecida. A nova UI muda linguagem, dados, ícones e exemplos para AI SaaS; não perde contraste, elegância ou foco em uma decisão por tela. Verificar desktop e mobile com screenshots antes de substituir a experiência pública.
