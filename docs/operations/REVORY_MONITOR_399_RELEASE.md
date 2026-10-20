# REVORY Monitor — liberação operacional

Oferta implementada: US$399/mês, USD, uma empresa/workspace, sem trial e sem conversão automática do scan. Hipótese comercial ainda sem renovação de clientes validada. Não reutilizar produtos ou Price IDs contractor.

## Escopo e requisitos

Stripe invoices criadas no período são contexto de cobrança, não receita líquida recebida. OpenAI cobre completions Usage e Costs em canais independentes. Ledger interno chega pelo arquivo revisado ou pelo endpoint abaixo. Margem por cliente, recuperação financeira, outros providers e correção automática não fazem parte da oferta.

Períodos UTC de 1 ou 7 dias; lag de 24–168 horas; consentimento de até 90 dias. Até 10 mil linhas de ledger por período, corpo API até 2 MB, sujeito também aos limites de tamanho e leitura das fontes. Projetos compartilhados ou identidade insuficiente limitam comparação/atribuição. Nenhuma linha ausente vira zero.

Confirmar primeiro as fontes e seus vínculos. O consentimento recorrente reutiliza as identidades explicitamente revisadas, corroborando cada período novo; não amplia silenciosamente o mapping antigo. Mudança de conta, geração da conexão ou revogação de vínculo impede a execução até nova revisão.

## Gate antes de configurar o ambiente remoto

1. Encerrar a pendência conhecida da credencial owner Neon com rotação coordenada e verificar consumidores. Guardar registro sem credenciais. Confirmar cofre/keyring, retenção, suporte, termos da assinatura e política de refund.
2. Aplicar migrations aditivas em banco aprovado e verificar backup/restore. A apresentação sintética atual continua isolada. Não ativar coleta real no banco reservado da demo.
3. Criar produto e Price próprios no Stripe: USD 39900, mensal, intervalo 1, licensed; metadata do Price `revory_offer=revory-monitor-399/v1`. Configurar portal para cancelamento e atualização de pagamento, sem oferecer planos incompatíveis.
4. Verificar o percurso em sandbox real: checkout, webhook, pagamento, falha, replay, cancelamento, refund, fontes não vazias, ledger e relatório. Fixture/assinatura simulada não substituem essa prova.
5. Configurar live apenas depois desse percurso, com autorização de publicação e smoke no alvo. A necessidade de registros tributários deve ser revisada; este código não ativa Stripe Tax automaticamente.

## Configuração no servidor

Preservar Google OAuth, NextAuth, Resend e seus recursos/callbacks. Não colocar chaves em URL, arquivos versionados, HTML, logs ou chats.

| Variável | Contrato |
| --- | --- |
| `REVORY_AI_COMMERCIAL_ENABLED` | `true` somente no ambiente aprovado |
| `REVORY_AI_COMMERCIAL_RELEASE` | `monitor-399/v1` |
| `REVORY_AI_COMMERCIAL_SECURITY_REVIEWED` | `true` somente após encerrar o gate operacional acima |
| `REVORY_AI_COMMERCIAL_DATABASE` | Nome exato do banco aprovado, distinto do banco reservado da demo |
| `REVORY_AI_RECURRING_MONITOR`, `REVORY_AI_CUSTOMER_SOURCES`, `REVORY_AI_CONNECTED_REPORTS` | `true` |
| `REVORY_AI_SAAS_SYNTHETIC_ONLY` | `false` no ambiente comercial; manter `true` na demo |
| `REVORY_AI_MONITOR_BILLING_MODE` | `test` na homologação; `live` em produção |
| `REVORY_AI_CUSTOMER_STRIPE_MODE` | `test` ou `live`, explicitamente selecionado para as fontes dos clientes |
| `REVORY_AI_MONITOR_STRIPE_KEY` | Chave do REVORY separada das credenciais de fonte; ambiente deve corresponder ao billing mode |
| `REVORY_AI_MONITOR_PRICE_ID` | Price novo com o contrato acima |
| `REVORY_AI_MONITOR_WEBHOOK_SECRET` | Segredo do destino novo |
| `REVORY_AI_CONNECTION_ACTIVE_KEY`, `REVORY_AI_CONNECTION_KEYRING` | Envelope criptográfico existente, fora do banco; manter versões antigas durante rotação |
| `NEXTAUTH_URL` | Origem HTTPS do ambiente aprovado |
| `CRON_SECRET` | Autenticação do dispatcher |

Credenciais de fontes continuam restritas ao workspace. Stripe exige restricted key `rk_` com leitura de invoices e conta; o endpoint de identidade verifica a conta declarada antes da coleta comercial. OpenAI exige acesso administrativo a Usage/Costs com o menor escopo disponível. Uma chave de geração não equivale a esse acesso.

## Webhook e agendador

- Destino: `/api/ai-integrity/recurring/webhook`.
- Eventos: `checkout.session.completed`; `customer.subscription.created/updated/deleted/paused/resumed`; `invoice.paid/payment_failed/payment_action_required`; `charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created`.
- Assinatura do webhook verificada pelo SDK. Leitura canônica da assinatura e invoice após lock por workspace reduz reordenação. Browser return sozinho não libera acesso.
- Acesso requer assinatura ativa, Price correto e linha de invoice paga correspondente ao período. Trial, invoice não paga, preço incompatível ou mistura test/live não concedem análise.
- Refund/disputa/fraude bloqueiam acesso; não reativar automaticamente após evento antigo de assinatura. Revisar o caso operacionalmente antes de encerrar o bloqueio.
- `GET /api/jobs/ai-integrity-monitor`, Bearer `CRON_SECRET`; cron a cada cinco minutos em `vercel.json`. Verificar plano Vercel compatível. O dispatcher processa uma renovação de estado Stripe, um período e até três avisos por chamada, com limites persistidos.
- Lease de 10 minutos, até cinco tentativas, retry com atraso. Replay não duplica o período. Fila e assinaturas precisam de observação operacional; não há SLA customizado.
- Fonte completa sem linhas registra período LIMITED e avança o acompanhamento, sem relatório ou zero inventado. Falha de coleta recebe retry e permanece pendente. O proprietário pode pular um período incompleto com nota auditada; comparações posteriores preservam a lacuna. `WAITING_LEDGER` requer arquivo/API; após erro, revisar fontes e reenviar o ledger para a mesma janela. Ao pausar, jobs em andamento não podem confirmar novo resultado.
- Avisos usam o Resend existente, opt-in, outbox e chave de idempotência. Entrega ambígua/fora da janela de idempotência fica `NEEDS_ATTENTION` para revisão, sem reenvio silencioso.

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
- Nenhuma conta real, e-mail real, pagamento real, alteração de domínio ou deploy é demonstrado pelos testes locais.
