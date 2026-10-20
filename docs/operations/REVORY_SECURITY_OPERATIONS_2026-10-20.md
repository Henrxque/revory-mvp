# REVORY — Segurança e operação, 20/10/2026

## Decisão atual

**Não encerrado para produção comercial.** Auditoria remota realizada, recuperação conferida e reforços implementados/testados localmente. A troca coordenada das credenciais e a publicação da correção de retenção ainda precisam ser executadas. Nenhum upgrade pago foi contratado.

## Evidência atual, sem segredos

| Controle | Estado observado |
| --- | --- |
| Banco usado em produção | `neondb`, PostgreSQL 17, região AWS us-east-1, Neon Free |
| Conexão do aplicativo | TLS exigido (`sslmode=require`); usuário `neondb_owner` com privilégios administrativos amplos |
| Preview 11 | Banco próprio; usuário `revory_preview11` também é membro de `neon_superuser`, com acesso de leitura confirmado ao banco de produção. Separação por nome de banco não prova isolamento de credenciais |
| Migrações | Produção: 25; Preview 11: 34. Pacote local: 38. Nenhuma migration nova aplicada remotamente nesta tarefa |
| Recuperação temporal | Configuração real: 21600 segundos (6h). Snapshot manual funciona, mas a conta limitou a quantidade a um snapshot |
| Backups agendados | Agenda consultada vazia. Snapshot manual com expiração não é uma estratégia recorrente de backup |
| Proteção de branch | Ativação recusada pelo limite do plano. Não afirmar proteção ativa |
| Logs Vercel | Consulta 24h recusada pela retenção do Hobby; consulta recente sem marcador. Isso não prova sucesso nem falha do cron diário |
| Variáveis | MCP negou acesso (403), porém CLI autenticada permitiu inventário. Conexões gerenciadas estão como Config; URLs específicas dos Previews estão como Secret |
| Saúde após recuperação | HTTP 200, `status=ok`, `database=reachable` |

Sem cópia de senhas, URLs autenticadas, payloads de clientes ou material de recuperação neste documento.

## Incidente durante o exercício de recuperação

- Às 03:08:35 UTC (00:08:35 de Brasília), `restore_snapshot` sem `finalize:false` promoveu a cópia e moveu o endpoint de produção. A intenção era um exercício isolado. A descrição do conector não impediu o efeito; o parâmetro omitido não era seguro.
- O original foi preservado. A tentativa de devolver o endpoint diretamente foi recusada por ser uma conexão gerenciada pelo Vercel.
- Foi criado um snapshot do conteúdo original preservado e restaurado sobre a cópia promovida, desta vez com alvo explícito. O conteúdo original voltou ao endpoint às 03:11:47 UTC. A identidade da branch de produção mudou; o hostname da aplicação foi preservado.
- A branch ativa/default agora é `main`; o ID alterado está no registro privado de operação. Original e cópia intermediária foram mantidos; seus computes de verificação foram desabilitados após a comparação, sem apagar dados.
- Contagens e hashes SHA-256 de conteúdo foram comparados nas 117 tabelas dos quatro bancos (29 + 44 + 0 + 44). Original, conteúdo recuperado e cópia intermediária coincidiram em todas as tabelas. Não foi detectada divergência de dados; não se afirma que isso mede disponibilidade durante o intervalo.
- Saúde pública posteriormente verificada com HTTP 200. [Prova redigida](../qa/security-operations/recovery-2026-10-20.json).

**Regra operacional obrigatória:** todo ensaio deve explicitar `finalize:false`, não fornecer um alvo de produção, conferir branch default e vínculo dos computes antes/depois, e testar apenas pelo endpoint isolado. Nunca finalizar/promover uma recuperação em um exercício. Proteção do provedor, quando disponível, complementa esses controles.

## Reforços locais implementados

1. **Retenção observável:** checkpoint global pequeno, lease contra concorrência, retomada em lotes, sucesso registrado mesmo com zero exclusões e último sucesso separado da tentativa atual. Falha/execução incompleta não retorna HTTP 200. Cron autenticado, respostas sem cache e códigos de erro sem payload ou credenciais.
2. **Retenção consistente:** investigação editada recentemente não mantém um link para evidência expirada; estados e drafts removidos entram na contagem auditada. Períodos inválidos de retenção falham sem exclusão. Tokens ativos, permissões e assinatura não são apagados por essa regra de análise.
3. **Logs:** logging bruto do Prisma desabilitado; erros do banco podem conter linhas enviadas, nomes ou detalhes de conexão. Serviços devem registrar códigos sanitizados.
4. **Cofre:** serviço de recriptografia de envelopes, dry-run por padrão, atualização condicional para não sobrescrever reconexões concorrentes, preservação de escopo/segredo e confirmação de chaves antigas antes de escrever. Nunca remover uma versão antiga enquanto houver envelopes dependentes, inclusive em backups que se pretenda restaurar.
5. **Recuperação:** verificador usa transações read-only, compara colunas/constraints, contagens e hashes; falha em divergência. Alias pooled/direct não passa como alvo isolado. Datas fornecidas pelo operador medem idade do snapshot/duração, não um SLA nem perda real medida.
6. **Privilégios:** política SQL para um papel de runtime novo, inicialmente NOLOGIN, CRUD e sequências sem DDL/administração; histórico de migrations somente para leitura. Validação em Postgres descartável rejeitou CREATE TABLE, ROLE, DATABASE, SET ROLE e escrita no histórico.
7. **Migrations:** `REVORY_MIGRATION_DATABASE_URL` opcional permite credencial separada de migração. Mesmo banco/endpoint direto e TLS são exigidos; drift de destino é rejeitado antes de migrar. O fallback existente permanece até o rollout coordenado.
8. **Diagnóstico:** `ops:data-security` consulta somente metadados e sinaliza runtime administrativo, capacidade de alterar schema, migrations pendentes e ausência de sucesso recente da retenção. Não equivale a auditoria completa do provedor.

## Rollout concreto das credenciais — pendente

A necessidade foi verificada: runtime usa owner; o Preview administrativo pode ler produção; há pendência histórica de exposição de credencial owner. Tentativa em cópia isolada de reduzir os atributos do papel gerenciado foi recusada pelo Neon. Não houve redução parcial nessa transação. Criar papéis via SQL com privilégios mínimos é a alternativa correta; papéis criados pela API/Console ganham `neon_superuser` por padrão.

1. Inventariar consumidores: produção e aliases gerenciados, URLs específicas do Preview 10, Preview 11, Preview genérico/legado, ambientes locais e scripts operacionais. Confirmar quais credenciais antigas permanecem em uso. Não imprimir valores.
2. Preparar novo runtime SQL por banco e papel separado de migrations; os nomes não conferem isolamento por si. Validar permissões reais e impedir leitura das tabelas de outros bancos. Manter papéis sem LOGIN até configurar senha gerada e destino privado.
3. Guardar novas credenciais diretamente no gerenciador/variáveis apropriadas. Produção deve usar Secret; não transmitir senhas em chat, arquivo versionado, argumento de shell ou URL pública. Preservar os callbacks e credenciais de Google/Resend/Stripe.
4. Publicar a alteração de seleção da credencial de migrations e checkpoint de retenção com a configuração correspondente. Revisar a diferença com a versão atualmente publicada antes do deploy; o pacote de monitoramento comercial não fica autorizado por este runbook.
5. Migrar os consumidores para as novas conexões, redeploy coordenado, verificar saúde/login/export e acesso de Preview. Testar permissões de runtime com consulta read-only autenticada. Só após o cutover verificado, rotacionar/retirar o acesso antigo e verificar que ele falha. A proteção do banco não está concluída antes disso.
6. Conferir aliases derivados e consumidores locais. Registrar versão/data da rotação sem guardar o valor. Desabilitar acessos antigos em cópias de recuperação; um restore futuro exige revisão/rotação de credenciais antes de conectar aplicações.
7. Observar checkpoint de retenção real e ensaiar recuperação **isolada** com o novo schema. Não disparar exclusão de produção como se fosse teste. Definir retenção de backups/RPO/RTO aceitáveis e eventual ajuste de plano com orçamento aprovado.

## Comandos verificáveis

- `npm run qa:security-operations:db`: somente Postgres local descartável.
- `npm run ops:data-security`: DATABASE_URL explícita, somente leitura, saída de metadados; exit 2 significa NOT_READY.
- `npm run ops:rewrap-source-credentials`: DATABASE_URL/keyring explícitos, dry-run.
- `npm run ops:rewrap-source-credentials -- --apply`: exige `REVORY_CREDENTIAL_ROTATION_ACK=REWRAP_EXISTING_SOURCE_CREDENTIALS`. Isso recriptografa envelopes; não troca a chave de API do cliente na OpenAI/Stripe.
- `npm run ops:verify-restore`: exige URLs de origem/alvo e datas explícitas; apenas verificação read-only, sem executar restore.

## Limite de conclusão

O código local e a prova de recuperação não encerram a credencial owner exposta, não comprovam retenção em produção, não criam backup recorrente e não autorizam afirmar certificação de segurança. O ponto só pode ser marcado concluído após cutover/rotação, publicação operacional e prova remota correspondente.


## Verificações do pacote local

- `qa:security-operations:db`: PASS em banco descartável, 38 migrations; leases, retomada, falha HTTP, retenção de referência expirada, recriptografia e privilégios SQL. [Prova](../qa/security-operations/local-proof.json).
- `qa:ai-monitor:db`: PASS; quatro períodos e regressões de consentimento, token, isolamento, replay e cobrança simulada.
- `qa:ai-connected-report:db`: PASS; ligação API/ledger, scan e retenção preservados.
- TypeScript, ESLint dos módulos afetados e `npm run build`: PASS. Não houve deploy deste pacote.

A revisão de produção deve separar o patch operacional da liberação do novo monitor: o `vercel.json` local inclui um cron de cinco minutos, e o projeto remoto está em Hobby. O plano Hobby permite cron diário, e uma expressão mais frequente falha no deploy ([documentação oficial](https://vercel.com/docs/cron-jobs/usage-and-pricing)). O patch operacional deve preservar o cron diário existente e separar a ativação do cron do monitor; conferir compatibilidade antes de qualquer publicação. A retenção diária já existente não exige essa frequência. A política de runtime SQL só foi aplicada em teste local descartável, não aos bancos remotos.

Referências do provedor e manifests completos de recuperação ficam no registro privado ignorado `.tmp/security-operations/recovery-private.json`; o artefato versionado contém somente o resumo redigido.
