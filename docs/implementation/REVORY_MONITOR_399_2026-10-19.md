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


## Revisão de UX — 2026-10-19

Feedback do fundador: a primeira tela parecia um painel técnico, extensa e sem orientação clara. A rota foi adaptada mantendo contratos, permissões, endpoints e evidências.

- Visão geral começa pela próxima ação: ativação/setup, revisão de permissões, falha de coleta, ledger ausente ou diferenças para revisar. O estado vem dos registros existentes; não há indicadores fictícios de saúde ou receita.
- Resumo mostra investigações recentes que precisam de revisão, último relatório e próximo período. Contagens são do conjunto recente carregado, sem somar unidades e moedas.
- Diferenças têm filtros e revisão expandida por seleção. Evidência, quantidades exatas, notas auditadas e verificação no período seguinte permanecem acessíveis. Listas mostram até cinco itens antes da expansão.
- Histórico usa linhas compactas expansíveis, preservando relatório, export e skip com nota/consentimento explícitos. Ausência de dados continua sem inferência de zero ou resolução.
- Envio do ledger fica em “Send usage data”; API/token em disclosure avançado. Assinatura, consentimento e agenda ficam em “Settings”. Nenhum consentimento passou a ser implícito.
- Avisos operacionais usam linguagem legível, separados dos findings. Falhas de leitura têm prioridade na próxima ação.
- Identidade REVORY preservada: canvas #141516, superfícies derivadas de #252729, accent #43B39B, Sora/DM Sans, sem setas decorativas. Layout verificado em 1440 px e 390 px, inclusive investigação expandida e configurações móveis.

Prova de navegador atualizada em [verification.json](../qa/recurring-monitor/verification.json), [desktop](../qa/recurring-monitor/desktop.png), [mobile](../qa/recurring-monitor/mobile.png), [investigação](../qa/recurring-monitor/investigation.png) e [configurações móveis](../qa/recurring-monitor/mobile-settings.png). Fixture local em banco descartável: pausa/retomada, nota, exportação, navegação/filtros, ingestão HTTP com token e revogação passaram. Não houve cobrança, e-mail, leitura real de provedor ou alteração de ambiente externo.

## Homologação com provedores reais — 2026-10-20

O registro de 19/10 acima descreve a entrega inicial. Em 20/10, a cobrança foi exercitada no Stripe sandbox real: Checkout hospedado, webhook assinado, renovação por test clock, falha/recuperação, portal, cancelamento no término, refund e replay passaram. A mesma assinatura autorizou quatro relatórios com fontes controladas e ledger CSV/API. Leituras reais com chaves temporárias restritas de Stripe e OpenAI passaram nas contas vazias; ausência foi preservada e não virou relatório zero. As duas chaves foram revogadas e removidas do cofre do app.

Foram corrigidos prazo e retomada de Checkout, isolamento da configuração de portal e cancelamento por `cancel_at`. O cron incompatível com Hobby foi substituído no código por dispatcher GitHub desligado por padrão. Esse trabalho não foi publicado, não ativou jobs remotos e não realizou cobrança live. Fontes não vazias/equivalência, entrega real de avisos, homologação remota e renovação comercial continuam pendentes. Ver [evidências e limites](../qa/monitor-homologation/README.md).
