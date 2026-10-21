# Monitor: publicação comercial preparada em 21/10/2026

## Diagnóstico verificado

- `revory.app` resolve para `dpl_Gvah4URRaYimVfoyDc8a6isfNdtp`, READY, GitHub `main` em `698d92c51bea5c6dbaa9a3e5969319892b9e59fd`. A aplicação autenticada desse código ainda é a histórica. O Monitor está em `release/monitor-hml`, não em produção.
- Banco de produção aprovado existente: `neondb`, branch Neon `br-holy-dew-adl98j5m`, projeto `summer-tooth-23847904`. Consulta somente leitura: 26 migrations concluídas, 30 tabelas públicas, 10 usuários e 9 workspaces. Nenhuma migration incompleta.
- Faltam as 12 migrations AI de `20260929000100` a `20261019000300`. A migration operacional `20261020000100` já existe. Os scripts adicionam entidades AI; não reinterpretam nem removem campos de usuários, workspaces ou domínio histórico. `DROP CONSTRAINT` na migration de 13/10 substitui checks das tabelas AI recém-criadas nesta sequência; não elimina dados.
- Runtime limitado `revory_runtime_prod_20261020`; defaults de privilégios para esse runtime e para o backup somente leitura já existem. O build exige comprovação das 38 migrations e não recebe credencial de DDL.
- Catálogo Stripe live próprio preparado, mas Product/Price/portal inativos e webhook desabilitado. A chave temporária de configuração foi revogada. As sete variáveis de billing já estão em Vercel production, com `REVORY_AI_COMMERCIAL_ENABLED=false`.

## Correções locais preparadas

- Integração das correções atuais de `main`, incluindo backup e dispatcher, com o código completo do Monitor.
- Landing comercial específica de US$399 mensais, uma empresa/workspace, limites e fluxo self-service. A apresentação pública sintética continua sendo fallback quando o gate comercial está fechado.
- `/start` comercial encaminha à configuração da assinatura. Conta sem assinatura abre Settings; links antigos de app encaminham ao dashboard AI quando o runtime comercial está integralmente configurado. APIs/webhooks históricos ficam preservados.
- Termos e privacidade identificam o escopo Monitor e o tratamento de fontes/credenciais, com versões novas para reaceite. Nenhuma aceitação foi feita em nome do proprietário ou dos clientes. Textos não representam certificação ou revisão jurídica independente.

## Sequência exata de publicação — ainda não executada

1. Registrar a decisão comercial: a aprovação anterior abrangia staging live **inativo**. Ativar acesso antecipado antes da prova OpenAI não vazia exige ciência explícita dessa pendência, ou concluir a prova antes.
2. Obter backup criptografado atual pelo papel somente leitura e guardar o manifesto. Confirmar que a versão anterior permanece disponível para rollback.
3. Aplicar apenas as 12 migrations faltantes em `neondb` com operador separado. Verificar checksums, tabelas, contagens anteriores e acesso CRUD do runtime; manter owner/DDL fora do Vercel.
4. Criar keyring exclusivo de produção, guardar cópia protegida fora do banco e configurar `REVORY_AI_CONNECTION_ACTIVE_KEY`/`REVORY_AI_CONNECTION_KEYRING` no servidor como Secret. Não reutilizar o keyring de homologação.
5. Configurar o alvo comercial como `neondb`, release `monitor-399/v1`, security reviewed após conferência, fontes/relatórios/Monitor habilitados, synthetic-only false, customer Stripe mode live e billing mode live. Preservar URLs, OAuth, Resend, usuários e histórico.
6. Publicar o código reconciliado no fluxo de `main`, com checkout inicialmente fechado. Conferir build, saúde, autenticação e novos endpoints.
7. Ativar somente os quatro objetos Monitor preparados no Stripe. A chave runtime não tem escrita em Products, Prices ou Webhook Endpoints: usar o Dashboard ou chave temporária restrita com confirmação específica, nunca ampliar a chave runtime. Preservar todos os objetos históricos.
8. Habilitar a configuração comercial e publicar o build correspondente. Conferir entrada pública, login, reaceite, assinatura, criação/expiração de Checkout live **sem pagamento**, retorno e assinatura inválida de webhook. Não fabricar uma compra, um evento pago ou um cliente.
9. Configurar o dispatcher de produção com URL exata `https://revory.app/api/jobs/ai-integrity-monitor`, segredo próprio e flag inicialmente false. Observar execução manual autenticada antes de habilitar o agendamento. O cron HML e seu segredo ficam separados.

## Pendência conhecida e horários

A única chamada controlada OpenAI ocorreu em 20/10 às 18:21:54 UTC: 11 tokens de entrada e 1 de saída. Sua janela termina em 21/10 às 00:00 UTC; o atraso mínimo implementado de 24 horas só permite usá-la na prova do app em **22/10 às 00:00 UTC / 21/10 às 21h de Brasília**. Não há ainda prova API→ledger→relatório com esses dados não vazios. Fixtures, sandbox e recibo da geração são evidências diferentes. Não alterar relógio, timestamps ou cobertura para encerrar esse teste.

Receber pagamentos no Stripe é tecnicamente distinto de terminar essa validação do produto. Um lançamento antecipado deve ser descrito como acesso antecipado, com limites claros, e não como benefício ou renovação já comprovados. Zero clientes pagos reais e zero renovações verificados.

## Rollback

Desabilitar novas compras e dispatcher, preservar portal/cancelamento de assinaturas existentes, interromper novas leituras e retornar ao deploy anterior se necessário. Não remover tabelas nem apagar evidências para voltar o código. Desligar o gate comercial não cancela cobranças existentes; qualquer assinatura criada deve continuar sendo tratada operacionalmente. Nenhum preço histórico é reutilizado.

## Verificações locais desta preparação

- TypeScript passou.
- Build de produção passou com configuração comercial e credenciais somente fictícias, sem banco ou fontes de produção.
- Teste da implementação real do proxy passou: gates fechados/inconsistentes não ativam redirecionamento; gate completo adapta rotas antigas; auth e webhooks históricos são preservados.
- Validações de dispatcher, manifesto de migrations e estrutura legal passaram.
- Suite de banco do Monitor passou em Postgres local descartável com as 38 migrations: quatro períodos imutáveis, diferenças novas/persistentes/não observadas, deduplicação, consentimento, rotação do token, isolamento, falhas, investigação, avisos, webhook assinado e export.
- Landing comercial conferida no navegador local em desktop; captura `docs/qa/monitor-remote/monitor-commercial-landing-desktop.png`. O override de viewport do navegador não se aplicou nessa sessão: não registrar QA mobile como concluído.
- A preparação local não altera o diagnóstico externo acima nem significa checkout ativo.
