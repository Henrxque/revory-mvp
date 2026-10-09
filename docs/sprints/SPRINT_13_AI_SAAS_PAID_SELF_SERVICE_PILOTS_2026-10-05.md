# Sprint 13 — Pilotos pagos e self-service com dados reais

Estado em 2026-10-05: **PLANEJADA; zero compradores reais verificados**. Usa o [protocolo já preparado](../validation/SPRINT_06_PAID_PILOT_PROTOCOL.md). Requer `PASS` nas Sprints [10](SPRINT_10_AI_SAAS_REMOTE_HOMOLOGATION_2026-10-05.md), [11](SPRINT_11_AI_SAAS_OPENAI_SOURCE_2026-10-05.md) e [12](SPRINT_12_AI_SAAS_STRIPE_DATA_AND_PURCHASE_2026-10-05.md), além de ambiente e oferta próprios para dados/pagamentos reais. Fixtures, interesse declarado e compras sandbox não contam.

## Resultado executável

Recrutar **3–5 empresas AI SaaS independentes** que paguem uma compra pontual consentida, completem um scan de período fechado e revisem os achados. Medir se compra e primeiro resultado funcionam sem call obrigatória, quais findings ajudam numa decisão e onde a experiência falha.

## Trabalho

1. Aprovar ambiente de piloto: segregação de workspaces, backup/restauração, retenção, exclusão/export, acesso operacional, logs redigidos, resposta a incidente e responsável. Fazer teste com dados sintéticos nesse mesmo ambiente antes de receber o primeiro arquivo real.
2. Revisar termos, privacidade, subprocessadores, consentimento específico das três fontes, política de reembolso, suporte assíncrono e oferta pontual. Confirmar que escopo/copy não prometem margem ou recuperação financeira ainda indisponíveis. Obter aprovação comercial e configurar compra live **restrita ao piloto**, sem reusar planos antigos.
3. Qualificar candidatos de forma assíncrona: autorização da empresa, Stripe/OpenAI compatíveis, ledger exportável, janela fechada, unidades claras e expectativa que caiba nas duas regras atuais. O fundador convida/autoriza participantes; não importar dados antes de compra e consentimento.
4. Instrumentar eventos mínimos com revisão de privacidade: início de checkout, compra confirmada, consentimento, intake, mapping, scan elegível, relatório visto/exportado, pedido de ajuda e refund. Denominadores excluem testes, duplicatas e não elegíveis; telemetria não contém valores financeiros, chaves, PII ou findings.
5. Para cada comprador: registrar versão da oferta, pagamento confirmado, consentimento, janela, cobertura, tempos, intervenções e feedback. Revisor do comprador classifica cada finding como sustentado, esperado, falso positivo ou evidência insuficiente. Preservar snapshot imutável; correções geram nova versão.
6. Corrigir bloqueios e falsos positivos, repetir os casos atingidos e documentar limitações que permanecem. Registrar não respondentes e abandonos. Um usuário assistido pelo fundador não conta como ativação independente.

## Aceite verificável

- 3–5 empresas distintas, com compra **live** verificada, consentimento e scan real entregue/revisado; apresentar contagens e evidências redigidas, sem dados de clientes no repositório.
- Relatório por coorte mostra tentativas, elegíveis, compra, scan, revisão, abandono, ajuda humana, refunds, tempo até primeiro resultado e utilidade, com numerador/denominador explícitos.
- Findings materiais são sustentados por fonte/IDs/janela/fórmula ou reclassificados; falsos positivos conhecidos são corrigidos ou limitam a decisão `GO`.
- Pelo menos o percurso compra → primeiro resultado é demonstrado sem call obrigatória; todo apoio humano é registrado. Não declarar que 3–5 casos provam precisão ou demanda geral.
- Decisão `PASS/REPEAT/NO_GO` inclui objeções, risco remanescente e mudanças necessárias antes da [Sprint 14](SPRINT_14_AI_SAAS_OFFICIAL_RELEASE_2026-10-05.md).

## Fora desta sprint

Aquisição aberta, assinatura mensal, estudos de caso públicos sem consentimento separado e cálculo de margem por customer sem vínculo comprovado.
