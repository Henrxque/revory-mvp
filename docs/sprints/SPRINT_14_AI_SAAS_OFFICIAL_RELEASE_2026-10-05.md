# Sprint 14 — Liberação oficial controlada e gate de monitoramento

Estado em 2026-10-05: **PLANEJADA; decisão atual `NO_GO`**. Esta sprint executa o [runbook de AI SaaS](../launch/REVORY_AI_SAAS_RELEASE_RUNBOOK.md) após o resultado dos [pilotos pagos](SPRINT_13_AI_SAAS_PAID_SELF_SERVICE_PILOTS_2026-10-05.md). Publicar a apresentação e demo sintética não equivale a liberar o produto após login.

## Resultado executável

Tomar uma decisão explícita e baseada em evidência para **`GO_SCAN_ONLY`**, **`GO_SCAN_AND_MONITORING`** ou **`NO_GO`**. Em qualquer `GO`, um novo AI SaaS consegue conhecer a oferta, criar conta, pagar, autorizar dados, concluir o fluxo e obter relatório/export sem call obrigatória. Planos mensais só entram em `GO_SCAN_AND_MONITORING` após o gate recorrente abaixo.

## Trabalho

1. Fechar defeitos críticos dos pilotos e fazer auditoria ponta a ponta: landing → signup/login → consentimento → conexão/importação → mapping/Data Quality → compra → scan → finding → export/histórico → suporte/refund. Verificar desktop/mobile, acessibilidade básica, metadados, links, limitações e ausência de copy contractor no percurso novo.
2. Implementar ativação por ambiente/coorte e plano de reversão da navegação autenticada. Preservar Google OAuth/NextAuth, e-mail/senha, reset/verify, sessões, workspaces e Resend; testar round-trip no alvo. Retirar rota antiga da nova navegação só após classificar dependências, acesso histórico e substituto aprovado.
3. Revisar segurança/privacidade e operação: permissões read-only, segredos, isolamento, retenção/exclusão, backup e restore, migrations, logs/alertas, saúde, suporte assíncrono, incidente e rollback. Fazer smoke test no ambiente alvo e registrar responsável e resultado.
4. Fechar contrato comercial do scan: preço, moeda, impostos aplicáveis, entrega, limites, política de refund e claims proporcionais ao motor. Publicar preço apenas após aprovação e teste live restrito. O scan real nunca é grátis por padrão; demo aberta continua sintética.
5. Para **monitoramento mensal**, implementar leitura agendada idempotente, segundo período real comparável, movimentos/alertas conservadores, entrega por canal aprovado com opt-out, falha/retry, subscription/entitlement/renovação/cancelamento/refund e suporte. Observar pelo menos dois reads reais úteis e valor de repetição com participantes autorizados. Testar billing mensal em sandbox e live restrito antes de oferecer publicamente; US$199/399 permanecem hipóteses até então.
6. Rodar novamente `npm run qa:ai-integrity-sprint-9` **após atualizar seus sentinelas e evidências para o produto novo**; o audit de 2026-10-02 é snapshot local antigo e não deve ser editado manualmente para fabricar `GO`. Consolidar commit, ambiente, pilotos, QA, riscos, owners, rollback e decisão assinada num pacote de release.
7. Liberar primeiro uma coorte limitada, observar compra, ativação, erros, refunds, suporte e incidentes. Expandir gradualmente somente após smoke e uso independente confirmados. Suspender novas compras/conexões se houver violação de isolamento, credencial exposta, cobrança indevida ou finding material sem evidência.

## Aceite verificável e decisão

| Decisão | Evidência mínima |
| --- | --- |
| `GO_SCAN_ONLY` | Sprints 10–13 aprovadas; compra live, dados reais consentidos, percurso completo, operação/privacidade e primeiros usuários independentes verificados. Copy e billing oferecem **somente** scan pontual. |
| `GO_SCAN_AND_MONITORING` | Todos os itens de `GO_SCAN_ONLY` **mais** segundo read real útil, agenda/entrega/opt-out operando, recorrência e cancelamento testados, preço mensal aprovado e suporte definido. |
| `NO_GO` | Qualquer dependência essencial ausente, discrepância financeira não resolvida, bloqueio de segurança/operação ou claims acima da evidência. A apresentação/demo podem permanecer públicas com seus limites atuais. |

Resultado final: URL e versão liberadas, decisão datada, evidências redigidas, métricas com denominadores, plano de reversão ensaiado e lista de riscos. O `GO` não autoriza automaticamente Anthropic, Gemini, SDK, billing engine, margem por customer ou promessa de receita recuperada.
