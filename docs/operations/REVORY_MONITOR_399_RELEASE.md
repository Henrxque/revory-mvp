# REVORY Monitor — liberação operacional

Oferta implementada: US$399/mês, USD, uma empresa/workspace, sem trial e sem conversão automática do scan. Hipótese comercial ainda sem renovação de clientes validada. Não reutilizar produtos ou Price IDs contractor.

## Escopo e requisitos

Stripe invoices criadas no período são contexto de cobrança, não receita líquida recebida. OpenAI cobre completions Usage e Costs em canais independentes. Ledger interno chega pelo arquivo revisado ou pelo endpoint abaixo. Margem por cliente, recuperação financeira, outros providers e correção automática não fazem parte da oferta.

Períodos UTC de 1 ou 7 dias; lag de 24–168 horas; consentimento de até 90 dias. Até 10 mil linhas de ledger por período, corpo API até 2 MB, sujeito também aos limites de tamanho e leitura das fontes. Projetos compartilhados ou identidade insuficiente limitam comparação/atribuição. Nenhuma linha ausente vira zero.

Confirmar primeiro as fontes e seus vínculos. O consentimento recorrente reutiliza as identidades explicitamente revisadas, corroborando cada período novo; não amplia silenciosamente o mapping antigo. Mudança de conta, geração da conexão ou revogação de vínculo impede a execução até nova revisão.

## Gate antes de configurar o ambiente remoto

1. Encerrar a pendência conhecida da credencial owner Neon com rotação coordenada e verificar consumidores. Guardar registro sem credenciais. Confirmar cofre/keyring, retenção, suporte, termos da assinatura e política de refund.
2. Aplicar migrations aditivas em banco aprovado e verificar backup/restore. A apresentação sintética atual continua isolada. Não ativar coleta real no banco reservado da demo.
3. Criar produto e Price próprios no Stripe: USD 39900, mensal, intervalo 1, licensed; metadata do Price `revory_offer=revory-monitor-399/v1`. Criar configuração dedicada de portal com a mesma metadata, cancelamento e atualização de pagamento habilitados e `subscription_update.enabled=false`; fornecer seu `bpc_` no ambiente. O portal histórico não é alterado.
4. Verificar o percurso em sandbox real: checkout, webhook, pagamento, falha, replay, cancelamento, refund, fontes não vazias, ledger e relatório. Fixture/assinatura simulada não substituem essa prova.
5. Direção posterior do fundador em 20/10: antecipar a preparação de recursos live **inativos**, sem esperar a consolidação da fonte OpenAI. Produto/Price e portal ficam inativos e o webhook fica desabilitado; o SDK cria portal/webhook habilitados e a preparação os desabilita imediatamente, antes da liberação. Credenciais novas ainda exigem confirmação específica conforme a política do navegador. Publicar a experiência comercial, ativar a oferta/endpoint e receber compras permanecem depois da prova completa, aprovação do alvo e smoke. A necessidade de registros tributários deve ser revisada; este código não ativa Stripe Tax automaticamente.

## Configuração no servidor

Preservar Google OAuth, NextAuth, Resend e seus recursos/callbacks. Não colocar chaves em URL, arquivos versionados, HTML, logs ou chats.

| Variável | Contrato |
| --- | --- |
| `REVORY_AI_COMMERCIAL_ENABLED` | `true` somente no ambiente aprovado |
| `REVORY_AI_COMMERCIAL_RELEASE` | `monitor-399/v1` |
| `REVORY_AI_COMMERCIAL_SECURITY_REVIEWED` | `true` somente após encerrar o gate operacional acima |
| `REVORY_AI_COMMERCIAL_DATABASE` | Nome exato do banco aprovado, distinto do banco reservado da demo |
| `REVORY_AI_COMMERCIAL_BRANCH` | No Preview comercial isolado, branch exato aprovado; deve corresponder ao ref Vercel |
| `REVORY_AI_RECURRING_MONITOR`, `REVORY_AI_CUSTOMER_SOURCES`, `REVORY_AI_CONNECTED_REPORTS` | `true` |
| `REVORY_AI_SAAS_SYNTHETIC_ONLY` | `false` no ambiente comercial; manter `true` na demo |
| `REVORY_AI_MONITOR_BILLING_MODE` | `test` na homologação; `live` em produção |
| `REVORY_AI_CUSTOMER_STRIPE_MODE` | `test` ou `live`, explicitamente selecionado para as fontes dos clientes |
| `REVORY_AI_MONITOR_STRIPE_KEY` | Chave do REVORY separada das credenciais de fonte; ambiente deve corresponder ao billing mode |
| `REVORY_AI_MONITOR_PRICE_ID` | Price novo com o contrato acima |
| `REVORY_AI_MONITOR_WEBHOOK_SECRET` | Segredo do destino novo |
| `REVORY_AI_MONITOR_PORTAL_CONFIGURATION_ID` | Configuração `bpc_` dedicada, ativa e do mesmo modo test/live; metadata `revory_offer=revory-monitor-399/v1` |
| `REVORY_AI_CONNECTION_ACTIVE_KEY`, `REVORY_AI_CONNECTION_KEYRING` | Envelope criptográfico existente, fora do banco; manter versões antigas durante rotação |
| `NEXTAUTH_URL` | Origem HTTPS do ambiente aprovado |
| `CRON_SECRET` | Autenticação do dispatcher |
| `REVORY_AI_MONITOR_DISPATCH_SECRET` | Segredo dedicado preferencial do Monitor; quando configurado, não aceita o CRON_SECRET histórico nessa rota. Preserva os demais jobs. |

Credenciais de fontes continuam restritas ao workspace. Stripe exige restricted key `rk_` com leitura de invoices e conta; o endpoint de identidade verifica a conta declarada antes da coleta comercial. OpenAI exige acesso administrativo a Usage/Costs com o menor escopo disponível. Uma chave de geração não equivale a esse acesso.

Na organização OpenAI verificada em 20/10/2026, uma Admin key em `Restricted`, somente `Usage API Scope: Read` e os demais escopos em `None` leu Usage/Costs. Usar esse escopo quando disponível, com expiração e revogação; não solicitar administração ampla por padrão. A homologação usou uma chave de um dia e a revogou logo após os GETs.

## Webhook e agendador

- Destino: `/api/ai-integrity/recurring/webhook`.
- Eventos: `checkout.session.completed`; `customer.subscription.created/updated/deleted/paused/resumed`; `invoice.paid/payment_failed/payment_action_required`; `charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created`.
- Assinatura do webhook verificada pelo SDK. Leitura canônica da assinatura e invoice após lock por workspace reduz reordenação. Browser return sozinho não libera acesso.
- Acesso requer assinatura ativa, Price correto e linha de invoice paga correspondente ao período. Trial, invoice não paga, preço incompatível ou mistura test/live não concedem análise.
- Cancelamento agendado preserva acesso até a menor data entre período pago e `cancel_at`. O portal pode usar `cancel_at` sem marcar `cancel_at_period_end`; a tela mostra a data canônica e informa que não haverá renovação.
- Checkout expira após uma hora para preservar margem sobre o mínimo de 30 minutos do Stripe. Uma nova tentativa do mesmo proprietário reutiliza o checkout pendente, mesmo após recarregar a página; não cria uma segunda assinatura.
- Refund/disputa/fraude bloqueiam acesso; não reativar automaticamente após evento antigo de assinatura. Revisar o caso operacionalmente antes de encerrar o bloqueio.
- `GET /api/jobs/ai-integrity-monitor`, Bearer `CRON_SECRET`. O dispatcher processa uma renovação de estado Stripe, um período e até três avisos por chamada, com limites persistidos.
- Vercel Hobby não suporta cron a cada cinco minutos. O job de monitoramento foi retirado de `vercel.json`; retenção e digest existentes foram preservados. O workflow `.github/workflows/revory-ai-monitor.yml` prepara a chamada externa pelo GitHub Actions, desabilitada por padrão. Não há garantia de pontualidade ou SLA de cinco minutos.
- Para ativação explicitamente aprovada: definir a repository variable `REVORY_MONITOR_DISPATCH_URL` como a URL HTTPS exata do endpoint no alvo aprovado e o Actions secret `REVORY_MONITOR_DISPATCH_SECRET` com seu `CRON_SECRET`; executar manualmente e observar sucesso antes de definir `REVORY_MONITOR_DISPATCH_ENABLED=true`. O workflow somente executa em `main`. Não adicionar segredos à URL nem desligar proteção de Preview para contornar 401/403.
- O cliente recusa host fora de `revory.app`, `monitor-hml.revory.app` e Previews da equipe, redirecionamentos, paths alternativos, credencial curta e resposta de monitoramento desabilitado. Logs contêm somente contagens, sem corpo de fonte ou credencial. Teste local: `node scripts/validate-monitor-dispatch.mjs`.
- Homologação remota: PR operacional #9 prepara `.github/workflows/revory-monitor-hml.yml`, uma chamada por hora, host fixo `monitor-hml.revory.app` e segredo/flag próprios (`REVORY_MONITOR_HML_DISPATCH_SECRET` e `REVORY_MONITOR_HML_DISPATCH_ENABLED`). Não confundir com o workflow geral acima. Validar HTTPS e execução manual antes de habilitar a flag. Evidências e pendências em `docs/qa/monitor-remote/README.md`.
- Lease de 10 minutos, até cinco tentativas, retry com atraso. Replay não duplica o período. Fila e assinaturas precisam de observação operacional; não há SLA customizado.
- Fonte completa sem linhas registra período LIMITED e avança o acompanhamento, sem relatório ou zero inventado. Falha de coleta recebe retry e permanece pendente. O proprietário pode pular um período incompleto com nota auditada; comparações posteriores preservam a lacuna. `WAITING_LEDGER` requer arquivo/API; após erro, revisar fontes e reenviar o ledger para a mesma janela. Ao pausar, jobs em andamento não podem confirmar novo resultado.
- Avisos usam o Resend existente, opt-in, outbox e chave de idempotência. Entrega ambígua/fora da janela de idempotência fica `NEEDS_ATTENTION` para revisão, sem reenvio silencioso.
- Em Settings, `Send test email` permite ao proprietário com e-mail verificado e acesso pago testar a entrega para a própria conta. Um teste por dia UTC, com deduplicação/lease e vínculo ao destinatário; não autoriza leituras, não altera opt-in nem cria finding. Perda do acesso pago, troca de dono ou mudança de e-mail cancela a entrega pendente. O envio imediato processa somente esse aviso, com os mesmos controles de outbox. Aceite pelo Resend é distinto de entrega à caixa postal.

## Endpoint do ledger

`POST /api/ai-integrity/ledger/{workspaceId}`, `Authorization: Bearer TOKEN`, `Content-Type: application/json`.

Gerar/substituir/revogar token na tela de Monitoring. A versão em claro aparece uma vez; somente hash é armazenado, e o token é excluído do export. Ele não dá acesso de leitura, a outras empresas ou a cobrança. Payload recomendado:

```json
{
  "sourceSystem": "my-product-ledger",
  "windowStart": "2026-10-01T00:00:00.000Z",
  "windowEnd": "2026-10-02T00:00:00.000Z",
  "exportedAt": "2026-10-05T00:00:00.000Z",
  "completeThrough": "2026-10-02T00:00:00.000Z",
  "records": [{
    "externalId": "stable-usage-event-001",
    "occurredAt": "2026-10-01T12:00:00.000Z",
    "quantity": "80",
    "unit": "input_tokens",
    "provider": "openai",
    "providerProjectId": "project-id",
    "model": "model-reported-by-provider",
    "internalCustomerExternalId": "internal-customer-id"
  }]
}
```

Exemplo fictício; substituir janela pelo próximo período autorizado. Quantidades são strings decimais exatas. Separar input/output e preservar IDs estáveis. Usar o mesmo sourceSystem e contrato em períodos comparados. Não colocar prompts, secrets ou dados pessoais desnecessários nas linhas. O servidor acrescenta workspace, hashes e proveniência.

Também aceita o contrato canônico `{batch, exportedAt, completeThrough}` para integrações existentes. Import e associação ao período são atômicos; falha de escopo ou fechamento desfaz a importação. Resposta 202 significa ledger enfileirado, não análise concluída. Retentativa de entrega de um período concluído exige conteúdo e metadados idênticos.

## Verificação e retorno

- `npm run qa:ai-monitor:db` usa exclusivamente Postgres local descartável. `REVORY_MONITOR_QA_BROWSER=true` acrescenta o percurso no navegador.
- Provas em `docs/qa/recurring-monitor/`: desktop, mobile, autenticação, origem, consentimento, investigação, export e ingestão HTTP.
- Para interromper leituras: pausar schedule/revogar fonte ou desligar `REVORY_AI_RECURRING_MONITOR`. Isso não cancela a cobrança: usar Stripe Portal/cancelamento para encerrar a assinatura.
- Não remover tabelas/evidências em rollback. Preservar snapshots e aplicar retenção/exclusão conforme política.
- A homologação adicional de 20/10 está registrada em `docs/qa/monitor-homologation/`: usa transporte real do Stripe em sandbox, webhook assinado encaminhado pelo CLI e banco local isolado. Os relatórios dessa prova usam fontes controladas; não equivalem a dados reais de clientes, lançamento ou deploy remoto. Consultar o registro dessa homologação para os cenários efetivamente concluídos.
