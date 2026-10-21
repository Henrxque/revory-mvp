# Sprint 07 — Preparação local de fontes conectadas

Data: 2026-10-01. **Preparação sintética verificada; gate de conexões reais aberto.**

O fundador pediu iniciar a Sprint 07. A implementação avança o ensaio local enquanto continuam pendentes o Stripe sandbox da Sprint 05 e a coorte paga da Sprint 06. Não representa validação com compradores, autorização de dados reais ou lançamento.

## Entrega

- Contratos de leitura GET com hosts, caminhos e parâmetros permitidos explicitamente; paginação limitada e normalização determinística.
- Consentimento sintético por workspace, revogação, nova geração ao reativar, histórico e auditoria.
- Checkpoint incremental avança somente após todas as páginas completarem. Falha não grava leitura nem avança cobertura; replay idêntico retorna a leitura existente e chave conflitante é rejeitada.
- Artefatos separados da evidência de scan, com hash verificado, export JSON e geração de CSV canônico para comparação com intake.
- Tela de ensaio desktop/mobile no shell premium existente, sem formulário de credenciais e sem scan ou compra automática.
- Portabilidade do workspace na versão 8, retenção e exclusão em cascata dos novos registros.

O transporte da aplicação usa **fixtures fixas locais**. Não há transporte HTTP, SDK de provider, coleta ou armazenamento de API keys. A injeção de transporte permite testar páginas/falhas; não é campo aceito pela API. Zero conexões reais, zero chamadas externas aos providers e zero scans automáticos.

## Semântica e limites das fontes

| Canal | Normalização implementada | Limite explícito |
| --- | --- | --- |
| Stripe invoices | ID, customer ID, criação, status, moeda e amount_paid; `livemode=false` obrigatório | Contexto de criação de invoice. Amount paid não é receita líquida; refunds, créditos, subscriptions e updates de invoices anteriores não são lidos |
| OpenAI completions usage | Buckets diários por project/model, input e output tokens separados | Cached input já integra input tokens; não é somado de novo. Não cobre todos os tipos de uso da OpenAI |
| OpenAI reported costs | Custo reportado diário por project; ausência de project preservada | Sem dimensão model, sem usage fabricado, sem atribuição automática a customer |

Usage e Costs são canais separados. Os artefatos não são automaticamente importados ou submetidos ao motor: revisão do ledger, identidade, cobertura e integração da granularidade ainda são gates. A comparação verificada usa **as mesmas fixtures reimportadas por CSV**, sem alegar equivalência com uma conta real.

Janelas são dias UTC fechados, até 31 dias, com lag explícito de 0–720 horas. Limites: 20 páginas por canal, 1.000 itens por página, 10.000 itens e 10.000 linhas normalizadas por canal, artefato até 8 Mi caracteres JSON e 50 registros de leitura por conexão. Moedas Stripe suportadas têm expoentes explícitos; outras são rejeitadas. Valores Costs devem ter representação decimal aceita até 12 casas; parsing decimal sem perda a partir da resposta HTTP real continua pendente.

## Segurança e ciclo de vida

API autenticada, origem validada, rate limit, campos estritos e respostas privadas sem cache. Consulta, replay e export são limitados ao workspace. FK composta impede que uma leitura referencie conexão de outro workspace.

Locks ordenam leituras e revogação. Uma leitura que completou antes da revogação permanece no histórico; após revogar não há nova leitura nem replay. Reconsentimento reinicia cobertura e incrementa geração, sem sobrescrever artefatos anteriores. Não há revogação de credencial no provider porque nenhuma credencial existe neste ensaio. Exports anteriores continuam sujeitos à retenção.

## Caminhos e ativação

- Domínio: `domain/ai-integrity/connected-sources.ts`.
- Serviço e fixtures: `services/ai-integrity/connected-sources.ts` e `source-fixtures.ts`.
- Models novos: `AiIntegritySourceConnection` e `AiIntegritySourceSync`.
- Migration aditiva: `prisma/migrations/20261001000200_ai_integrity_source_rehearsal/migration.sql`.
- UI: `/app/ai-integrity/sources`; API: `/api/ai-integrity/sources` e `/api/ai-integrity/sources/[syncId]/export`.
- Shell/nav: **adapt**, adicionando navegação condicional. Nenhuma rota histórica retirada.

Exige `REVORY_AI_SAAS_PREVIEW=true` e `REVORY_AI_SOURCE_REHEARSAL=true`, fora de produção, **em banco local preparado para as novas tabelas**. O harness cria banco descartável e aplica migrations ali. O preview comum mantém a segunda flag desligada; não aplicar esta migration automaticamente no banco principal.

Google OAuth, demais fluxos de autenticação/sessão/workspace, Resend, billing histórico e infraestrutura horizontal foram preservados. Não houve alteração de secrets, recursos externos, domínio, banco principal ou deploy.

## Verificação

| Verificação | Resultado |
| --- | --- |
| `npm run qa:ai-integrity-sprint-7` | PASS: allowlist, janelas, paginação/falhas, normalização, PII minimizada, cache e equivalência CSV dos três canais |
| `npm run qa:ai-integrity-sprint-7:db` | PASS: PostgreSQL descartável, isolamento, concorrência, replay, incremental, falha na segunda página, revogação/geração, hash, portabilidade, retenção e cascade |
| `npm run qa:ai-integrity-sprint-7:browser` | PASS: consentir, ler, estender a partir do checkpoint, exportar e revogar; auth/origin/campos estritos; desktop/mobile sem erros de console ou overflow |
| Build, TypeScript, Prisma validate e ESLint dos arquivos alterados | PASS |

Evidências: [verification.json](../qa/ai-integrity-sprint7/verification.json), [desktop](../qa/ai-integrity-sprint7/reads-desktop.png) e [mobile](../qa/ai-integrity-sprint7/consent-mobile.png). Sessão browser usa identidade sintética; não testa uma nova autenticação real no Google ou envio real no Resend.

## Gate ainda aberto

1. Fechar checkout no Stripe sandbox real (Sprint 05) e realizar os 3–5 scans pagos/consentidos (Sprint 06).
2. Verificar ambiente e autoridade de integração, oferta, compra e consentimento para dados reais.
3. Implementar transporte real e proteção de credenciais separadas do billing/runtime do REVORY; verificar escopos efetivos mínimos, rotação, revogação, timeout/retry e parsing decimal sem perda.
4. Definir tratamento de updates/refunds Stripe e cobertura dos tipos de usage antes de qualquer claim financeiro correspondente.
5. Demonstrar equivalência com CSV do mesmo período em fontes reais e validar integração explícita com o motor, sem inventar model/customer a partir de Costs agregado.

Esta entrega não conclui a Sprint 07 completa nem libera automaticamente recorrência, beta ou lançamento.

## Referências primárias consultadas

- [Stripe — List invoices](https://docs.stripe.com/api/invoices/list).
- [Stripe — Restricted API keys](https://docs.stripe.com/keys/restricted-api-keys).
- [OpenAI — Completions usage](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions).
- [OpenAI — Costs](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs).
