# Monitor 399 — implementação

Direção explícita do fundador em 2026-10-19: implementar com prioridade o monitoramento recorrente e a assinatura de US$399/mês. Preço é uma hipótese comercial; não constitui validação de renovação. Preservar marca, autenticação, Resend e o caráter read-only das fontes.

## Contrato de entrega

- Uma empresa, Stripe invoices + OpenAI completions Usage/Costs e ledger interno.
- Períodos UTC fechados de um ou sete dias, atraso configurável, consentimento recorrente com validade e revogação. Sem leitura de períodos fora do consentimento.
- Ledger pode chegar por arquivo revisado ou por endpoint autenticado com token revogável. Metadados de fechamento explícitos; ausência não significa zero.
- Jobs persistidos, lease, retries limitados, idempotência por período, cancelamento e isolamento.
- Relatórios imutáveis e comparação conservadora: novo, persistente, não observado e comparação limitada. Não observado não comprova correção ou dinheiro recuperado.
- Investigação auditável com notas, confirmação humana e verificação pelo relatório seguinte.
- Outbox para avisos operacionais e diferenças relevantes via Resend existente, opt-in e deduplicação.
- Checkout mensal e portal Stripe próprios. Sem trial/gratuidade real ou conversão automática do scan. Acesso depende de assinatura paga verificada, expiração e revogação.

## Publicação

Implementar e verificar localmente antes de configurar recursos externos. Gates comerciais anteriores continuam aplicáveis: ambiente/cofre, migrations, fonte Stripe live, sandbox real, políticas e segurança operacional. Não reutilizar Price IDs históricos. Este trabalho não cria clientes, receita ou renovações.

## Entrega implementada

Jobs, ledger por token/arquivo, comparação conectada 4.2, investigação auditada, notificações com outbox, checkout mensal/portal/webhook e gate comercial separado estão no código. O gate aceita homologação test ou produção live somente com banco/origem/cofre/liberação explicitamente configurados. Todos os defaults permanecem desligados; nenhuma configuração externa foi alterada.

A migração nova cria estado durável por workspace e amplia o modo da comparação sem reinterpretar snapshots de ensaio. Scan avulso, login e serviços existentes permanecem preservados. Consultas de uso/custo conectado agora limitam o contexto à janela relevante, mantendo evidências conflitantes da janela.

Prova em Postgres descartável: quatro períodos, diferença persistente de 20 input tokens, posterior zero comparável e reaparecimento; input/output e custo observado separados. Um worker concorrente não duplica o relatório. Vínculos são corroborados por período; ausência/revogação não confirma resolução. SDK e webhook são exercitados com respostas fictícias, sem transação real.

Prova de navegador: pausar/retomar consentimento, registrar investigação, baixar comparação, enviar ledger por HTTP com token e rejeitá-lo após revogação. Desktop/mobile sem overflow. Artefatos em [QA](../qa/recurring-monitor/verification.json).

Operação comercial e configuração: [runbook](../operations/REVORY_MONITOR_399_RELEASE.md). Sandbox real, transporte live não vazio, envio de e-mail real, publicação e renovação por clientes continuam sem prova nesta entrega.

Períodos sem linhas são registrados como limitados, sem relatório zero, e o histórico continua. Pular um período exige nota do proprietário; o gap impede inferir resolução. O teste de refund assinado demonstra bloqueio que um evento antigo de assinatura ativa não reverte.

## Verificações finais

- `qa:ai-monitor:db`: PASS, 37 migrations, quatro relatórios e casos de ausência/skip/refund; [prova do motor](../qa/recurring-monitor/core-proof.json).
- `REVORY_MONITOR_QA_BROWSER=true npm run qa:ai-monitor:db`: PASS, desktop/mobile, origens/sessão, ingestão HTTP e revogação.
- `qa:ai-connected-report:db`: PASS, mantendo scan pontual, grant, replay, retenção e fontes separadas.
- `qa:ai-integrity-sprint-8:db`: PASS, ensaio histórico preservado e export aditivo v11.
- TypeScript e ESLint dos módulos afetados: PASS.
- `npm run build`: PASS, compilação otimizada e 67 páginas estáticas geradas, usando segredo efêmero de QA somente no processo.

Rotas de login e integrações horizontais são keep. `/app/ai-integrity/monitoring`, conexões, navegação e dashboard são adapt; endpoints novos são aditivos. Nenhuma rota histórica foi excluída.
