# Sprint 11 — OpenAI Usage/Costs, leitura controlada

**Estado em 2026-10-13: implementação local revisável; gate `FAIL` para conclusão da Sprint 11.** O fundador autorizou uso da própria conta, mas informou ausência de histórico de API. A sessão da OpenAI Platform foi aberta e a organização **Personal** selecionada; a organização corporativa listada na escolha inicial não foi acessada. Os dois endpoints da conta pessoal foram consultados com uma chave temporária restrita, já revogada.

## Contrato verificado

- Endpoints: `GET /v1/organization/usage/completions` e `GET /v1/organization/costs`, com início inclusivo, fim exclusivo e buckets diários. Usage agrupa por projeto/modelo; Costs por projeto. Tokens de entrada já incluem os cached tokens.
- Ambos usam **Admin API key** da organização, separada de `OPENAI_API_KEY` de geração. A credencial administrativa não é enviada ao browser, armazenada no banco, exportada ou registrada em audit events.
- A tela da organização pessoal permite uma Admin key **Restricted → Usage API Scope: Read**, com expiração personalizada. A chave temporária foi criada após autorização específica, usada somente nesta prova e revogada em seguida. O transporte REVORY só aceita `GET` nos dois caminhos fixos, sem redirects. Organizações/credenciais de clientes exigirão solução de cofre, escopo e consentimento próprios antes de beta.
- Páginas, retry limitado de 429/5xx, timeout de 8 s por tentativa, resposta de 2 MiB por página, 20 páginas e 10 mil buckets/linhas são limites locais. Cursor OpenAI aceita padding `=`. Respostas inválidas e paginação incompleta falham sem avançar o checkpoint.
- Um response vazio em ambos os canais produz `NO_REPORTED_ROWS`, dois canais sem batch e **nenhuma afirmação de gasto zero**. Costs pode incluir outras modalidades de produto além de completions; Usage de completions não é cobertura universal de uso OpenAI.

Fontes oficiais: [Usage completions](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions), [Costs](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs), [Administration overview](https://developers.openai.com/api/reference/administration/overview), [RBAC](https://developers.openai.com/api/docs/guides/rbac).

## Controle de ambiente e dados

O caminho é habilitado apenas com `NODE_ENV != production`, sem `VERCEL_ENV`, `REVORY_AI_SAAS_PREVIEW=true`, `REVORY_AI_OPENAI_CONTROLLED_READ=true` e `REVORY_AI_SAAS_SYNTHETIC_ONLY != true`. Vincular `REVORY_AI_OPENAI_WORKSPACE_ID` e `REVORY_AI_OPENAI_ORG_ID` a um único workspace/organização. Configurar `REVORY_AI_OPENAI_ADMIN_KEY` somente no ambiente privado local; nunca copiar para `.env.example`, chat, log, screenshot ou Preview sintético. A chave deve ser diferente de `OPENAI_API_KEY`.

O consentimento persiste organização, todos os projetos, fontes Usage/Costs, finalidade, período fechado de até 31 dias, versão, ator e geração. O período requer 24 h de defasagem. A revogação e a geração são verificadas antes, durante e após cada leitura. Reserva de sync é curta; HTTP ocorre fora da transação; commit só ocorre com consentimento ativo e checkpoint inalterado. Falhas deixam `FAILED`, sem avançar cobertura; um processo interrompido libera sua reserva após 15 minutos. Reexecução com mesma chave é idempotente e chave reutilizada com outro conteúdo/consentimento falha. Export exige sessão do mesmo workspace e hash válido. Retenção de artefatos continua no mecanismo do workspace.

## Verificação realizada

| Item | Evidência | Resultado |
| --- | --- | --- |
| TypeScript e lint dos arquivos alterados | `npm run typecheck`; ESLint direcionado | PASS |
| Schema aditivo | `npm run db:validate` | PASS |
| Fonte local | `npm run qa:ai-integrity-sprint-11-source` | PASS: resposta vazia, modo/proveniência reais, 429, 403, cursor com `=`, sem chave no artefato |
| Regressão Sprint 07 | `npm run qa:ai-integrity-sprint-7` | PASS |
| Build | `npm run build` com variáveis locais descartáveis | PASS; rotas novas presentes |
| Painel da conta pessoal | Platform Usage, filtro `All projects`, últimos 7 dias | Sem dados de uso; 0 requests/tokens na janela exibida. Isso não é uma resposta de API nem prova cobertura histórica. |
| Migração e transações em Postgres descartável | Cluster local temporário; 33 migrações aplicadas. A primeira execução revelou que a constraint da Sprint 07 rejeitava o modo controlado e que a constraint de sync rejeitava `IN_PROGRESS`/`FAILED`. A migração aditiva `20261013000200_ai_openai_controlled_source_constraints` corrigiu os dois contratos. `npm run qa:ai-integrity-sprint-11-db` passou com consentimento, leitura vazia, checkpoint, replay, isolamento, export, revogação, geração, integridade e flag. `npm run qa:ai-integrity-sprint-7:db` passou novamente. | PASS |
| Leitura real da conta autorizada | `npm run ops:openai-controlled-read`; janela UTC `2026-10-11T00:00:00Z` a `2026-10-12T00:00:00Z`; `READ_COMPLETED`, `NO_REPORTED_ROWS`, `openai-usage: 0`, `openai-costs: 0`. A lista da Platform marcou a chave `Revoked` após refresh, com gasto registrado `$0.00`. Segredo removido do processo e clipboard; nunca persistido no repositório. | PASS para acesso e interpretação de vazio; sem prova de reconciliação não vazia |
| Export OpenAI independente ↔ API, mesmo período | Sem histórico não vazio disponível | PENDENTE |

## Próxima prova mínima

1. Confirmar no fluxo de UI que `NO_REPORTED_ROWS` não aparece como custo zero ou scan. A leitura real concluída valida acesso e interpretação de vazio, mas não cobre cálculo financeiro real.
2. Para fechar o gate, comparar uma janela com atividade autorizada com export independente da OpenAI do mesmo intervalo e explicar qualquer diferença de atraso, arredondamento ou ajuste. Pode ser uma conta de teste com atividade já existente ou futuro piloto consentido; não comprar uso fictício para forçar o teste.

**Decisão:** manter fora de produção, do Preview sintético, de checkout e de oferta conectada até as provas pendentes. Stripe permanece na Sprint 12.
