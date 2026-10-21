# Sprint 09 — Preparação do lançamento controlado

Data: 2026-10-02. **Preparação local concluída; gate de lançamento aberto. Decisão: NO_GO.** Esta é a última sprint numerada do plano 0–9, não a conclusão da migração ou autorização de publicação.

## Entrega

- Auditoria reproduzível `npm run qa:ai-integrity-sprint-9`, com [resultado JSON](../qa/ai-integrity-sprint9/launch-readiness.json). O comando confirma seis guardrails do estado local e mantém oito requisitos externos como `NOT_VERIFIED`. Retorna sucesso quando o audit foi executado corretamente, mesmo com decisão `NO_GO`.
- [Runbook específico de AI SaaS](../launch/REVORY_AI_SAAS_RELEASE_RUNBOOK.md): responsáveis, evidência mínima, sequência de liberação, suporte assíncrono, métricas de aquisição/ativação e resposta a incidente. O runbook de Quote Recovery continua histórico e não prova prontidão deste lançamento.
- Inventário das superfícies públicas pendentes. Nenhuma rota foi removida nem liberada em produção. Google OAuth/NextAuth, e-mail/senha, sessões/workspaces, Resend, billing legado, domínio, secrets e infraestrutura externa foram preservados.

## O que o audit realmente prova

O código atual exige `NODE_ENV !== production` e `REVORY_AI_SAAS_PREVIEW=true` para a experiência nova. A home pública usa fallback contractor; metadados e limitações públicas ainda descrevem Quote Recovery. A Sprint 08 registra somente comparação sintética, zero conexões reais, scans automáticos, e-mails e assinaturas. Esses são fatos locais do checkout auditado; o script **não consulta produção** e não valida usuários, consentimento, preço, pagamentos ou serviços externos. Sua checagem de arquivos é um sentinela de regressão do estado atual, não um teste end-to-end de lançamento.

## Gates que permanecem abertos

| Gate | Evidência requerida antes de marcar completo |
| --- | --- |
| Sprint 05 — compra pontual | Checkout Stripe **sandbox real**, webhook, refund e entitlement exercitados no ambiente de teste. Simulação loopback não conta. |
| Sprint 06 — utilidade paga | 3–5 compradores AI SaaS pagos e consentidos, com findings revisados e atrito/ativação medidos. Estado atual: **zero compradores reais verificados**. |
| Sprint 07 — OpenAI real | Permissões mínimas, credencial protegida, revogação, retries/checkpoints e equivalência com export do mesmo período; custo agregado sem atribuição fictícia. |
| Sprint 07 — Stripe de dados | Mesmo padrão de permissão, proteção, revogação e equivalência real para receita/estado de cobrança. Por direção do fundador, resolver Stripe por último, antes da oferta. |
| Sprint 08 — recorrência | Segundo read real, execução agendada, alertas entregues com opt-out, assinatura/entitlement/cancelamento testados e valor de repetição observado. |
| Sprint 09 — experiência pública | Landing, signup, consentimento, importação/integração, mapping, scan, findings, histórico, export, billing, copy/preço, metadados e documentos públicos coerentes e testados em desktop/mobile. |
| Sprint 09 — operação | Ambiente alvo auditado; auth Google/e-mail e Resend verificados; saúde, monitoramento, incidente, rollback e smoke test de produção com responsáveis e registros. |
| Sprint 09 — ativação | Eventos e denominadores aprovados, primeiros usuários concluindo sem call ou intervenção obrigatória; incidentes/fricção observados. Vercel Analytics e SpeedInsights existentes não medem este funil sozinhos. |

O preço de US$99 por scan e US$199/US$399 mensais continua hipótese, sem publicação comercial. Demo pública pode ser sintética; scan com dados reais exige compra explícita. Receita líquida, margem por customer, saldo de créditos, conexões reais e monitoramento recorrente não devem aparecer como capacidades disponíveis enquanto não passarem seus próprios gates.

## Rotas e dependências de substituição

| Superfície | Classe | Condição antes de trocar/retirar |
| --- | --- | --- |
| `/`, `/start`, `/demo`, metadados globais | **adapt** | Landing, oferta, onboarding e demo AI SaaS aprovados; claims, noindex/index, links e mobile verificados no ambiente alvo. |
| `/limitations`, privacy, security e termos | **adapt** | Linguagem AI SaaS, fluxo de dados, retenção, subprocessadores, consentimento e oferta revisados; links públicos corretos. |
| Login Google/e-mail, reset/verify, sessões, identidade/workspace | **keep** | Testar round-trip e isolamento no alvo; preservar configuração externa e comportamento. |
| Resend, health, logs, retenção, auditoria | **keep** infraestrutura; **adapt** contexto | Testar operação no alvo e política de dados AI SaaS. |
| Checkout, portal, webhook e Price IDs antigos | **keep** plumbing; **adapt** novos contratos | Gate de sandbox, preços/entitlements novos, cancelamento/refund e migração comercial definidos; não renomear planos antigos. |
| Rotas contractor/MedSpa e dados antigos | **retire** só após replacement | Mapear callers, usuários, dados e entitlements; verificar substituto, acesso histórico e rollback antes de remover. |

## Ordem para fechar a migração

1. Fechar conexão OpenAI real e equivalência de dados, mantendo o ledger interno CSV/XLSX; corrigir o que a evidência revelar.
2. Preparar ambiente e política do piloto, fechar checkout Stripe sandbox, dados Stripe e a coorte paga; Stripe permanece por último na sequência de implementação externa, mas é pré-requisito de venda e lançamento.
3. Fechar recorrência, documentos públicos, operação e métricas; então executar o gate de lançamento controlado com primeiros usuários. A decisão de expansão vem **depois** dos dados de uso.

Não houve deploy, alteração de domínio, credenciais, Vercel, Stripe externo, banco principal ou publicação do novo produto nesta sprint.
