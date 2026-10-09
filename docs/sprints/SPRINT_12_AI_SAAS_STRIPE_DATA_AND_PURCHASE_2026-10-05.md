# Sprint 12 — Stripe de dados e compra pontual

Estado em 2026-10-05: **PLANEJADA; gate aberto**. Stripe é a última integração externa na sequência escolhida pelo fundador. A [Sprint 05](SPRINT_05_AI_INTEGRITY_EXPERIENCE_2026-10-01.md) testou o SDK contra uma simulação local; isso não valida o sandbox real. Esta sprint depende da homologação isolada da [Sprint 10](SPRINT_10_AI_SAAS_REMOTE_HOMOLOGATION_2026-10-05.md) e da fonte OpenAI verificada na [Sprint 11](SPRINT_11_AI_SAAS_OPENAI_SOURCE_2026-10-05.md).

## Resultado executável

Em ambiente controlado, conectar Stripe com leitura mínima de receita/estado de cobrança e concluir uma **compra única de teste** do Integrity Scan no Stripe sandbox real. O resultado pago fica associado a um workspace e a uma unidade de scan, sem iniciar assinatura. Nenhum Price ID contractor é reutilizado.

## Trabalho

1. Definir duas capacidades separadas: **Stripe como fonte do cliente** (somente leitura) e **Stripe do REVORY para cobrar**. Registrar contas, escopos, proprietário, consentimento, revogação e limites; não misturar credenciais nem eventos dos dois papéis.
2. Verificar na documentação vigente os objetos/permissões necessários para invoices, subscriptions, refunds/ajustes e moeda. Implementar paginação, watermark, retry, dedupe, exclusões e equivalência com export Stripe do mesmo intervalo. Preservar IDs externos e estado; não inferir receita líquida sem regras e evidência suficientes.
3. Proteger credenciais de fonte e assegurar isolamento por workspace. Revogação deve impedir novas leituras; erros de autorização não podem virar dataset aparentemente completo.
4. Criar oferta de **teste** própria do AI SaaS, com preço e termos identificados como hipótese. Reutilizar somente o plumbing de billing; proteger Price IDs e contratos antigos. Testar checkout hospedado, retorno, webhook assinado, repetição/reordenação de evento, falha, cancelamento, reembolso e entitlement de um relatório.
5. Verificar que import/scan de dados reais exige compra live confirmada **e** consentimento/política aprovados antes da Sprint 13. Pagamento sandbox não é comprador real. Não liberar análise gratuita de dados próprios por falha, replay ou refresh de página.
6. Registrar decisão comercial para o piloto: escopo, preço pontual efetivo, moeda/impostos quando aplicáveis, refund e suporte. US$99 é hipótese; US$199/399 mensais não são criados nem publicados nesta sprint.

## Aceite verificável

- Leitura Stripe real autorizada é somente leitura, isolada, revogável e comparada com export do mesmo período; discrepâncias ficam visíveis.
- Checkout **real do Stripe em test-mode** confirma uma compra única; webhook concede exatamente um direito de scan, falha não concede, reembolso revoga conforme regra documentada e replay não duplica crédito.
- Cobrança nova não altera clientes, subscriptions, Price IDs ou webhooks históricos; nenhum scan pontual cria assinatura.
- E2E no ambiente isolado cobre compra → importação sintética → scan → relatório/export, além de falha e reembolso. O resultado não conta como piloto pago.
- Relatório redigido contém IDs de testes mascarados, versões, cenários, decisão `PASS/FAIL` e pendências para habilitar cobrança live restrita.

## Fora desta sprint

Cobrança live aberta ao público, coorte paga, assinatura mensal e oferta oficial. A [Sprint 13](SPRINT_13_AI_SAAS_PAID_SELF_SERVICE_PILOTS_2026-10-05.md) só inicia coleta real quando seus contratos e ambiente também estiverem aprovados.
