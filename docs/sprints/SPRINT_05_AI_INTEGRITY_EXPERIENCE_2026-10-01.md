# Sprint 05 — Experiência self-service e compra pontual de teste

Atualizado em **2026-10-01**. Autoridade: source of truth, bíblia e plano de migração.

**Estado: implementação local entregue e fluxo verificado com simulação. Gate completo pendente da validação no Stripe sandbox real.** Não é lançamento, disponibilidade comercial nem validação com clientes. O Sprint 06 não está automaticamente liberado.

## Entrega

| Superfície | Comportamento implementado |
| --- | --- |
| Landing AI SaaS | Explica três fontes, atribuição e diferenças de uso; oferta de teste US$99 pontual, hipótese explícita; sem promessa de margem ou receita recuperada |
| Demo | Dados sintéticos passam pelo motor `ai-integrity/4.1.0`; mostra duas famílias de findings, fórmula, evidência, limites, coverage e Data Quality |
| Start/compra | Pré-requisitos de exportação, escopo do relatório, ambiente de pagamento identificado, consentimento do teste, cancelamento e confirmação |
| Workspace | Navegação AI SaaS, dashboard com estado de preparação, scans disponíveis e histórico de relatórios do workspace |
| Preparação | Três passos: imports revisados, vínculos explícitos e fechamento/lag antes de executar; CSVs sintéticos disponíveis para download |
| Relatório/finding | Valores monetários e quantidades separados; detalhe da fórmula, IDs, elegibilidade, limites e próxima revisão; JSON reproduzível e CSV resumo |
| Condições do preview | `/ai-integrity-preview-policy`: escopo sintético, preço hipotético, pagamento de teste, cancelamento, retenção e acesso; não substitui o gate legal de clientes reais |

O motor continua limitado a **custo observado sem atribuição** e **diferença comparável de uso**. Stripe é contexto; não há regra de receita líquida, margem, vazamento monetizado ou saldo de créditos. Uma diferença de tokens não vira valor financeiro. Cada provider/moeda mantém seu denominador.

## Identidade visual

- Tokens e logo transparente canônicos preservados: `#141516`, `#252729`, `#43B39B`.
- Títulos de marketing em Instrument Serif; corpo/nav/cards em DM Sans. Shell/dashboard em Sora.
- Cards normais da experiência AI usam `--background-card`, mistura de aproximadamente 32% da superfície; heroes mantêm elevação de ênfase.
- Corrigida sintaxe de font-family que o Tailwind interpretava como font-weight. A verificação do navegador confirma Instrument Serif no headline.
- Capturas de 1280×800 e 390×844 para landing, demo, start, onboarding, imports, identidade, relatório e finding. Sem overflow horizontal ou erros de console no percurso validado.

Capturas: [diretório de QA](../qa/ai-integrity-sprint5/). Exemplos: [landing](../qa/ai-integrity-sprint5/landing-desktop.png), [relatório](../qa/ai-integrity-sprint5/report-desktop.png), [mobile](../qa/ai-integrity-sprint5/report-mobile.png).

## Contrato da compra

Tabelas **aditivas**: `AiIntegrityScanOrder` e `AiIntegrityScanGrant`. Migration `20260930000100_ai_integrity_scan_purchase`. Testada somente em bancos descartáveis; não aplicada automaticamente ao banco principal.

1. Price independente, ativo, test-mode, USD 9900 minor units, sem recurring. IDs históricos, incluindo listas de IDs legados, não podem ser reutilizados.
2. Checkout Sessions em `mode: payment`, uma unidade, sem assinatura ou lista rígida de payment methods. Request key e integration identifier determinísticos estabilizam reenvios.
3. Workspace, order, oferta e versão são vinculados em metadata. O retorno de sucesso não libera capacidade sozinho.
4. Webhook verifica assinatura sobre o corpo bruto limitado. Eventos live são rejeitados; valor, moeda, modo, session ID, workspace, versão, status completo e pagamento paid são conferidos antes de conceder um scan.
5. Registro do evento, grant e auditoria são atômicos; reenvios e payloads conflitantes com o mesmo ID são controlados. Falhas de assinatura retornam 400; falhas de processamento retornam 500 para retry.
6. Refresh autenticado consulta o status da sessão e confere o mesmo contrato. O order nunca é buscado fora do workspace ativo.
7. Scan trava a capacidade e cria snapshot/findings/consumo na mesma transação. Uma tentativa inválida preserva a compra. Reenvios idênticos retornam o snapshot. Nova evidência exige outra capacidade. Reabrir um relatório existente não consome uma segunda compra.
8. Reembolso de teste revoga o grant. Refund recebido antes de existir referência de pagamento exige retry, sem ser marcado como processado. Evento de pagamento tardio não reativa compra já reembolsada.
9. Retenção pode remover evidência/snapshot, mas preserva `consumedAt`; nunca restaura um scan usado. Export do workspace inclui ordens e grants sem URL do checkout ou referências de pagamento.

Decisões de integração baseadas em [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [assinatura de webhooks](https://docs.stripe.com/webhooks/signature) e [fulfillment](https://docs.stripe.com/checkout/fulfillment). Esses documentos orientam o contrato; não comprovam sua execução no sandbox real deste projeto.

## O que foi realmente verificado

| Gate local | Evidência |
| --- | --- |
| Oferta | QA de compra única, preço test-only, rejeição live/unpaid/foreign/wrong currency/recurring e demo com motor real |
| Banco | Migrations em PostgreSQL descartável; fulfillment concorrente, replay/hash conflitante, cross-workspace, rollback de tentativa inválida, consumo único, conservação de segunda compra, reembolso, evento fora de ordem, portabilidade e retenção |
| Navegador | SDK Stripe real contra servidor HTTP **loopback simulado**, checkout identificado, cancelamento sem grant, reenvio, webhook assinado, imports reais dos CSVs sintéticos pela UI, mapping exclusivo, scan persistido, finding e JSON/CSV |
| Regressão | 31 casos adversariais do motor Sprint 04 e seu teste de DB passam com a experiência AI desabilitada |
| Tipos/lint/build | Typecheck, ESLint dos arquivos envolvidos e build de produção passam; build mantém o fallback e bloqueio da experiência AI em produção |

Scripts:

```powershell
npm run qa:ai-integrity-sprint-5
npm run qa:ai-integrity-sprint-5:db
npm run qa:ai-integrity-sprint-5:browser
```

O navegador usa banco descartável, usuário/workspace sintéticos, segredo de sessão temporário e Next isolado na porta 3145. Apaga somente seu banco aleatório e encerra seus próprios processos. Não faz chamada ao Stripe, OpenAI, Resend ou Vercel. A simulação é infraestrutura de QA, não um fallback comercial.

## Pendência para fechar o gate do Sprint 05

Não havia credenciais nem Price de teste AI configurados no ambiente inspecionado. Nenhum objeto Stripe foi criado/alterado. A simulação local prova a integração entre UI, SDK, endpoints e banco, **não prova um pagamento no Stripe sandbox**.

Para a verificação real são necessárias configuração segura e autoridade para usar o sandbox:

| Variável | Requisito |
| --- | --- |
| `REVORY_AI_SAAS_PREVIEW` | `true` somente em desenvolvimento |
| `REVORY_AI_SCAN_TEST_SECRET_KEY` | Chave `sk_test_` ou `rk_test_` apropriada para Checkout/Prices |
| `REVORY_AI_SCAN_TEST_PRICE_ID` | Price novo, independente, ativo, USD 99, pontual, test-mode |
| `REVORY_AI_SCAN_TEST_WEBHOOK_SECRET` | Assinatura do webhook de teste encaminhado ao endpoint AI |
| `NEXT_PUBLIC_APP_URL` | Origem local do app; domínio público não é permitido neste preview |
| `REVORY_AI_SCAN_TEST_API_ORIGIN` | **Ausente** para Stripe real; reservado ao loopback do QA para simulação |

Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`.

Fechamento exige executar checkout real hospedado no Stripe em test-mode, confirmar compra sem assinatura, retorno/refresh, assinatura/replay, cancelamento e reembolso com evidência redigida. Nunca colocar secrets em documentação/chat. O banco local escolhido deve receber as migrations antes da revisão manual autenticada; o harness já trata isso em seu banco descartável.

## Limites e proteção da migração

- Ativação por `REVORY_AI_SAAS_PREVIEW=true`, exclusivamente fora de produção. Sem flag, superfícies e navegação históricas continuam no fallback.
- Landing/start/demo originais preservados em `components/legacy/Contractor*Page.tsx`. Inventário: [dependências de substituição](SPRINT_05_ROUTE_REPLACEMENT_INVENTORY.md). Nenhuma rota histórica removida ou schema contractor reaproveitado semanticamente.
- Condições comerciais, política de dados reais, suporte, preço validado e segurança operacional do beta continuam dependências antes do Sprint 06; a página de condições é do teste sintético.
- Sem free scan de dados reais. Sem assinatura de US$199/399 criada, gateway, conectores, remediação ou margem implementada.
- Nenhum deploy, domínio, segredo persistente, integração externa, preço histórico ou banco principal alterado. Sem commit/push nesta execução.

## Leitura de produto

A experiência agora permite testar se um founder consegue preparar evidência e entender dois findings sem call obrigatória. Isso valida o percurso técnico local, não demanda, disposição a pagar ou adequação dos US$99 ao valor limitado do motor atual. A utilidade e a fricção ainda precisam ser observadas com compradores consentidos quando os gates externos e de dados reais estiverem aprovados.
