# Conexões por workspace — entrega técnica local

Data: 2026-10-19. Parte A do [plano comercial self-service](REVORY_SELF_SERVICE_COMMERCIAL_2026-10-19.md). Implementação local, com feature gate; não é ativação comercial nem conclusão das Sprints 11/12.

## Implementado

- Página `/app/ai-integrity/connections`, navegação condicional e endpoints autenticados de cadastro, substituição, leitura, export e revogação. Identidade visual preservada; sem setas decorativas. Período sugerido de sete dias fechados, sujeito a revisão e consentimento explícito.
- Chaves separadas por workspace, conexão, provider e geração. Envelope AES-256-GCM com IV aleatório, tag de autenticação, versão da chave e contexto autenticado. Material criptográfico fica em tabela própria, com FK composta que impede associar a credencial à conexão de outro workspace.
- Chave de criptografia fora do banco, configurada apenas no servidor. Keyring suporta até quatro versões: novas gravações usam a versão ativa; leitura de versões antigas exige manter sua chave. A operação de recriptografar registros em massa ainda não foi implementada.
- Apenas o proprietário do workspace pode gerenciar conexões. Origem obrigatória, validação de corpo JSON até 8 KiB, rate limit persistente, aceite legal para cadastro/leitura e campos permitidos explícitos. Dados retornados não incluem envelopes ou segredos. O campo de senha é limpo ao enviar.
- Compra de teste confirmada, com grant ativo e não consumido, é exigida antes de guardar credencial ou ler fontes. Grants sintéticos e compras simuladas não qualificam. Os testes de banco criam estado de compra fictício para exercitar o gate; isso não comprova pagamento real.
- Stripe: transporte HTTP GET real, limitado a `/v1/invoices`, chave restrita `rk_test_`, sem redirects e sem escrita. Conta `acct_` é **declarada pelo usuário**, não verificada por uma chamada de identidade. Invoices criadas no período são contexto de cobrança; não provam receita líquida coletada. Chaves live e irrestritas são rejeitadas pelo cadastro nesta entrega.
- OpenAI: transporte existente usa a credencial específica da conexão e o header da organização autorizada. Apenas completions Usage e Costs; nenhuma chamada de geração. Salvar a chave não confirma suas permissões: uma leitura completa é necessária. Ausência de registros não significa gasto total zero.
- Leituras limitadas por período de até 31 dias, lag de 24 horas, 20 páginas por canal, 10 mil linhas, resposta HTTP de até 2 MiB, artefato de até 8 MiB e até 50 leituras por conexão. Três tentativas HTTP limitadas, timeout de oito segundos por tentativa e backoff de até dois segundos. Verificação de prazo global de 45 segundos entre páginas e antes de concluir.
- Idempotência por chave de pedido e consentimento; uma leitura em andamento por conexão; lease de tentativa validado no commit e na falha. Uma resposta atrasada não pode sobrescrever uma tentativa substituta.
- Revogação remove o envelope, incrementa a geração e impede o commit de leituras antigas. Funciona sem a chave de descriptografia disponível e sem compra ativa. Histórico de evidência permanece auditável conforme a retenção existente.
- Artefatos completos têm hash verificado no export e cobertura só avança após commit válido. Alteração de proprietário, revogação, reconsentimento, perda de grant e falhas não produzem conclusão falsa. Export de workspace e auditoria não contêm as credenciais ou seus envelopes. Exclusão do workspace remove credenciais por cascade.

## Gate de ambiente

Disponível apenas quando todas as condições valem:

1. `NODE_ENV` diferente de `production` e `VERCEL_ENV` ausente/vazio;
2. experiência AI habilitada por `REVORY_AI_SAAS_PREVIEW=true`;
3. `REVORY_AI_SAAS_SYNTHETIC_ONLY` diferente de `true`;
4. `REVORY_AI_CUSTOMER_SOURCES=true`.

Cadastro e leitura também exigem `REVORY_AI_CONNECTION_ACTIVE_KEY` e `REVORY_AI_CONNECTION_KEYRING` válidos. O segundo é JSON com versões e chaves aleatórias de 32 bytes em base64 canônico. Nunca registrar valores reais em código, chat, logs, documentação ou arquivos versionados. Não compartilhar a chave com o banco ou reutilizar credenciais da cobrança/geração de IA. As variáveis estão documentadas vazias em `.env.example`.

Migration aditiva: `20261019000100_ai_customer_source_credentials`. Aplicada apenas em bancos locais descartáveis durante esta entrega. Nenhuma alteração de produção, Neon, Vercel, OAuth, Resend ou Stripe externo.

## Evidência de verificação

| Verificação | Resultado |
| --- | --- |
| `npm run qa:ai-customer-source-security` | PASS: criptografia, contexto, adulteração, rotação, GET-only, host/path permitidos, 429, 403, timeout/retries, tamanho e erros sem segredo |
| `npm run qa:ai-customer-sources:db` com PostgreSQL local descartável | PASS: todas as 35 migrations, gate pago, proprietário, isolamento, FK, export/auditoria, evidência não vazia Stripe/OpenAI, replay, concorrência, revogação em andamento, substituição de lease, grant revogado, integridade e cascade |
| Sprint 07 contracts | PASS: limites, paginação, falhas, revogação, datas/unidades, separação de custos/uso e equivalência CSV com fixtures |
| Sprint 11 controlled source | PASS: vazio, proveniência, 403/429, cursor e sem dupla contagem de cached tokens |
| Prisma generate/validate | PASS, schema válido |
| TypeScript e ESLint dos arquivos alterados | PASS |
| `npm run build` | PASS: compilação otimizada, TypeScript e geração de todas as 63 páginas estáticas; rotas novas reconhecidas |
| Navegador → endpoint → banco local | PASS: login normal por senha de conta fictícia verificada; cadastro de chave fictícia; campo limpo; estado “Saved · access not checked”; desconexão e estado “Disconnected” |
| Mobile 390 × 844 | PASS: sem overflow horizontal, menu compacto e formulário legível |

As requisições dos testes HTTP usam transportes simulados; não houve conexão com uma conta externa real nesta entrega. O teste do navegador não acionou leitura com a chave fictícia. Evidências visuais em [`docs/qa/customer-sources/`](../qa/customer-sources/). O banco e o servidor usados no teste são isolados dos ambientes remotos.

## O que ainda falta para o percurso comercial

1. **Parte B:** promover artefatos completos a lotes de intake, manter proveniência/dedupe, unificar Stripe/OpenAI com o arquivo interno, revisão e scan. Hoje a leitura salva evidência de fonte separada; não cria lotes de importação, relatório, consumo de grant ou cálculo de margem.
2. **Parte C:** oferecer e validar compra real em sandbox; generalizar configuração de test/live; ambiente comercial protegido; operação do cofre e rotação; revisão legal; preço/moeda; webhook e gates para ativação. A exposição anterior da credencial owner Neon continua pendente de encerramento coordenado antes de armazenar segredos reais de clientes.
3. Prova de equivalência com janela autorizada não vazia nas fontes reais e teste de conta nova até relatório/export. Fixtures, grants criados em teste e respostas vazias não comprovam essa equivalência, cliente pago ou valor comercial.
4. Verificar identidade da conta Stripe e suportar dados live explicitamente; melhorar estados de permissão/atividade e progresso na experiência unificada. Instalação Stripe App/OAuth continua opção posterior, não capacidade presente.

O Preview remoto continua sintético. Esta entrega não está publicada nem disponível em `revory.app`.
