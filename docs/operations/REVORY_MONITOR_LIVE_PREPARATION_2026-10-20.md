# REVORY Monitor — preparação live de 20/10/2026

## Evidências verificadas nesta sessão

- O proprietário entrou no painel Stripe Revory, conta `acct_1Ttu8IRiSOuAN93T`. O ID coincide com a configuração histórica local, independentemente do nome comercial exibido no Checkout.
- Em Empresa → Status da conta, não existem tarefas ativas de verificação e Payments/Payouts aparecem ativos. Isto não garante aprovação de uma futura transação ou seu prazo de repasse.
- A conta anterior, Nova empresa (`acct_1USetIK6c2XmWOw1`, sandbox `acct_1USetdGVimDnwa8i`), é distinta e não deve receber a configuração comercial do REVORY.
- O inventário de variáveis do Vercel tem as 14 variáveis de oferta/liberação do Monitor somente no Preview `release/monitor-hml`. `REVORY_AI_SAAS_SYNTHETIC_ONLY` também existe nos Previews históricos. Não há essas variáveis de oferta do Monitor direcionadas a production. Nenhum valor secreto foi exportado para esta documentação.
- A credencial live local anteriormente verificada foi rejeitada. O login do Dashboard não a substitui nem autoriza ampliar uma chave existente.
- Checkout, reconciliação canônica e portal implementados em `services/ai-integrity/monitor-billing.ts` foram inspecionados: Price USD 39900/mês, metadata própria, segregação test/live, vínculo de workspace/checkout, invoice paga e verificação de assinatura dos webhooks.

## Auditoria live autorizada e executada

Formulário Stripe de uma chave restrita para agente: `REVORY live readiness audit 2026-10-20`. Somente **Read** para Accounts, Products, Prices, Customer Portal e Webhook Endpoints. Todas as demais permissões permanecem None, inclusive Invoices, Customers, Subscriptions e Charges.

O fundador confirmou especificamente criar, conferir e revogar a chave. O Stripe exigiu link no e-mail do proprietário e autenticador, concluídos pelo próprio usuário. A chave foi emitida e guardada no cofre DPAPI local, sem exposição em logs, screenshots ou variáveis Vercel.

GETs reais autenticados concluíram a leitura de Accounts, Products, Prices, Customer Portal e Webhook Endpoints. A paginação terminou sem truncamento. Evidência em `docs/qa/monitor-remote/live-account-readiness.json`. A chave foi encerrada no Dashboard ao final. A primeira prova após o encerramento ainda autenticou durante a propagação; a conferência seguinte retornou **401 StripeAuthenticationError**. A credencial foi então removida do cofre local. Esta chave de auditoria não serve ao runtime de cobrança, que precisa de permissões próprias de Checkout/portal.

Resultado da leitura (20/10, horário de Brasília; registro JSON em UTC):

| Item | Verificado |
| --- | --- |
| Conta | `acct_1Ttu8IRiSOuAN93T`, charges/payouts habilitados, details submitted, sem currently_due/past_due ou disabled_reason |
| Produtos | 5 no total; nenhum com metadata `revory_offer=revory-monitor-399/v1` |
| Preços | 7 no total; nenhum com a metadata do Monitor |
| Portais | 1 configuração; nenhuma dedicada ao Monitor pela metadata |
| Webhooks | 1 endpoint habilitado, live, para `https://revory.app/api/billing/webhook`; nenhum destino do novo Monitor |

## Delta de configuração live — preparado, não aplicado

1. Novo Product **REVORY Monitor** e Price **USD 39900/mês**, month/1, licensed, sem trial; metadata `revory_offer=revory-monitor-399/v1`. Não mudar os cinco produtos ou sete preços existentes.
2. Nova configuração de portal com a mesma metadata: cancelar ao fim do período e atualizar pagamento; sem mudar de plano. Preservar a configuração histórica.
3. Novo endpoint de webhook `https://revory.app/api/ai-integrity/recurring/webhook`, no modo live, inicialmente desabilitado até verificar o runtime aprovado. Eventos exatos definidos no runbook. Preservar o endpoint antigo `/api/billing/webhook`.
4. Nova chave restrita própria do runtime, separada da chave de auditoria e das credenciais de fonte de clientes. A inspeção de código exige Prices: Read, Subscriptions: Read, Invoices: Read (invoice expandida), Charges: Read (risco), Checkout Sessions: Write e Customer Portal: Write. Confirmar dependências de permissão com uma chave equivalente em sandbox antes de criar a live; não conceder escrita de invoices/subscriptions ou refunds por padrão.
5. Preparar o patch de variáveis Secret e IDs de recursos para o alvo aprovado, migrations aditivas e runtime sem DDL, deploy, smoke e dispatcher. As variáveis comerciais ainda não estão em production. O banco QA e sua assinatura test não são promoção de dados nem autorização live.
6. Conferir o catálogo pelo SDK, HTTPS, rejeição de assinatura inválida, Checkout de produção sem concluir pagamento e novo portal; habilitar o endpoint somente com o alvo pronto. Qualquer pagamento live ou compra do próprio fundador exige seu percurso financeiro separado.

Este delta não é uma execução autorizada de mudanças Stripe/produção. Sua aplicação fica depois do gate de fontes reais não vazias e da aprovação específica do alvo/recursos/credencial/Secret.

## Resultado que a auditoria deve produzir

1. API autenticada na conta exata; charges_enabled, payouts_enabled e requisitos pendentes, sem divulgar informações bancárias ou identidade fiscal.
2. Identificar eventual Price live com `revory_offer=revory-monitor-399/v1`; conferir USD 39900, month/1, licensed e ativo. Não reutilizar Price contractor, mesmo com o mesmo valor.
3. Identificar portal dedicado com a mesma metadata: cancelamento e atualização de pagamento habilitados, alteração de plano desabilitada. Não alterar o portal histórico.
4. Identificar webhook dedicado, modo live, URL e eventos. Não incluir seu signing secret no registro. Inventariar não cria nem habilita endpoint.
5. Produzir o delta exato da configuração; ainda não criar produto/Price/portal/webhook nem habilitar oferta comercial durante a auditoria.

## Ordem para ativação posterior

O runbook `REVORY_MONITOR_399_RELEASE.md` exige fechar a comparação de fontes reais não vazias antes da configuração live. Para o uso OpenAI de 20/10, a janela UTC termina em 21/10 00:00; com lag mínimo de 24h, só fica elegível em **21/10 às 21h de Brasília (22/10 00:00 UTC)**. O provedor ainda pode publicar depois. A geração e o recibo de tokens não comprovam Usage/Costs conciliados com ledger.

Após essa prova, preparar os recursos live ausentes, chave restrita de runtime, armazenamento Secret, banco/runtime/migrações aprovados, dispatcher e smoke do alvo. Pedir aprovação específica do delta de produção antes de aplicar; não substituir o banco de produção pelo banco QA e não promover a assinatura sandbox como acesso live.

Nenhum cliente real, pagamento live, repasse, renovação ou consentimento de coleta de cliente foi validado por este registro. O gate comercial permanece aberto. Também continuam separados o backup/retention natural e a custódia da chave de recuperação fora do PC.
