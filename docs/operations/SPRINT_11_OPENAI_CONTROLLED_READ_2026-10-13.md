# Sprint 11 — OpenAI Usage/Costs, leitura controlada

**Estado em 2026-10-13: implementação local revisável; gate `FAIL` para conclusão da Sprint 11.** O fundador autorizou uso da própria conta, mas informou ausência de histórico de API. A sessão da OpenAI Platform foi aberta e a organização **Personal** selecionada; a organização corporativa listada na escolha inicial não foi acessada. Nenhuma chamada autenticada aos endpoints da conta real foi executada nesta evidência.

## Contrato verificado

- Endpoints: `GET /v1/organization/usage/completions` e `GET /v1/organization/costs`, com início inclusivo, fim exclusivo e buckets diários. Usage agrupa por projeto/modelo; Costs por projeto. Tokens de entrada já incluem os cached tokens.
- Ambos usam **Admin API key** da organização, separada de `OPENAI_API_KEY` de geração. A credencial administrativa não é enviada ao browser, armazenada no banco, exportada ou registrada em audit events.
- A tela da organização pessoal permite uma Admin key **Restricted → Usage API Scope: Read**, com expiração personalizada. Nenhuma chave foi criada antes de autorização específica. O transporte REVORY só aceita `GET` nos dois caminhos fixos, sem redirects. Organizações/credenciais de clientes exigirão solução de cofre, escopo e consentimento próprios antes de beta.
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
| Transação/isolamento com Postgres descartável | Não executado; usuário local `postgres` padrão rejeitado | PENDENTE |
| Leitura real da conta autorizada | Login na OpenAI Platform ainda pendente | PENDENTE |
| Export OpenAI independente ↔ API, mesmo período | Sem histórico não vazio disponível | PENDENTE |

## Próxima prova mínima

1. Com aprovação específica, criar uma Admin API key temporária com `Restricted → Usage API Scope: Read` na organização pessoal e expiração curta. Não fazer chamada de geração só para produzir gasto.
2. Configurar a chave apenas em ambiente local privado. Executar `npm run ops:openai-controlled-read`, que faz somente os dois GETs e imprime cobertura/contagem redigidas sem banco. Depois associar workspace autorizado, aplicar migração em **banco descartável** e testar consentimento/sync persistido. Guardar somente resultado redigido: HTTP/atividade/canais/IDs de evidência; nenhum segredo.
3. Se vier vazio, registrar `NO_REPORTED_ROWS` e confirmar que a UI não apresenta custo zero ou scan. Isso valida acesso e interpretação de vazio, mas não cobre cálculo financeiro real.
4. Para fechar o gate, comparar uma janela com atividade autorizada com export independente da OpenAI do mesmo intervalo e explicar qualquer diferença de atraso, arredondamento ou ajuste. Pode ser uma conta de teste com atividade já existente ou futuro piloto consentido; não comprar uso fictício para forçar o teste.

**Decisão:** manter fora de produção, do Preview sintético, de checkout e de oferta conectada até as provas pendentes. Stripe permanece na Sprint 12.
