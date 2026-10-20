# REVORY — Segurança e operação, 20/10/2026

## Decisão atual

**Rotação e patch operacional publicados. Segurança operacional ainda tem duas pendências:** primeiro sucesso do cron de retenção observado em produção e definição/ativação de backup recorrente. Produção e Previews 10/11 usam novos acessos SQL limitados; senhas administrativas anteriores foram retiradas do runtime e rotacionadas. Nenhum upgrade pago foi contratado. Este resultado não fecha o gate comercial.

## Evidência anterior ao cutover, sem segredos

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

## Procedimento do rollout das credenciais (executado; evidência abaixo)

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

O cutover/rotação e a publicação operacional foram concluídos com prova remota abaixo. Ainda não há sucesso natural do novo checkpoint de retenção nem backup recorrente confirmado. Essas pendências impedem encerrar segurança e recuperação para operação comercial; não se afirma certificação.


## Verificações do pacote local

- `qa:security-operations:db`: PASS em banco descartável, 38 migrations; leases, retomada, falha HTTP, retenção de referência expirada, recriptografia e privilégios SQL. [Prova](../qa/security-operations/local-proof.json).
- `qa:ai-monitor:db`: PASS; quatro períodos e regressões de consentimento, token, isolamento, replay e cobrança simulada.
- `qa:ai-connected-report:db`: PASS; ligação API/ledger, scan e retenção preservados.
- TypeScript, ESLint dos módulos afetados e `npm run build`: PASS. Não houve deploy deste pacote.

A revisão de produção deve separar o patch operacional da liberação do novo monitor: o `vercel.json` local inclui um cron de cinco minutos, e o projeto remoto está em Hobby. O plano Hobby permite cron diário, e uma expressão mais frequente falha no deploy ([documentação oficial](https://vercel.com/docs/cron-jobs/usage-and-pricing)). O patch operacional deve preservar o cron diário existente e separar a ativação do cron do monitor; conferir compatibilidade antes de qualquer publicação. A retenção diária já existente não exige essa frequência. A política de runtime SQL só foi aplicada em teste local descartável, não aos bancos remotos.

Referências do provedor e manifests completos de recuperação ficam no registro privado ignorado `.tmp/security-operations/recovery-private.json`; o artefato versionado contém somente o resumo redigido.

## Cutover autorizado e executado em 20/10/2026

A autorização explícita do fundador cobriu troca coordenada de credenciais de produção/Previews e publicação do patch operacional. A versão de produção foi derivada do commit realmente publicado, sem incluir os conectores comerciais ou o novo cron de cinco minutos. [PR #7](https://github.com/Henrxque/revory-mvp/pull/7) foi integrado; a correção de compatibilidade de checksums Windows/Linux também foi publicada. O histórico de migrações não foi reescrito para acomodar o verificador.

### Acessos e secrets

- Novos papéis SQL distintos para produção, Preview 10 e Preview 11: sem superuser, CREATEDB, CREATEROLE, BYPASSRLS, replicação ou memberships administrativas; zero tabelas pertencem ao runtime, e o schema não pode ser alterado por ele.
- CRUD de tabelas e sequências apenas no banco pretendido; histórico Prisma somente leitura. Leituras das tabelas dos outros bancos foram rejeitadas. Isso é isolamento de permissões dentro da mesma branch, não isolamento físico de provedor.
- URLs e aliases de senha no Vercel passaram a Secret. Aliases de produção ficaram restritos a produção, e o Preview genérico que guardava conexão antiga foi retirado. Novos Previews precisam de configuração explícita; não herdam banco de produção. Caches locais de env antigos deixam de funcionar e não devem ser usados como fallback.
- A credencial administrativa de migração não foi adicionada ao Vercel. Com REVORY_DATABASE_MIGRATIONS_EXTERNAL=true, o build só confere versões/checksums pelo acesso de leitura do runtime. Migrações futuras devem ser executadas separadamente pelo operador autorizado, no banco correto, antes da publicação; conferir o manifest e os grants depois.
- A senha de neondb_owner foi rotacionada; psql confirmou a senha atual e rejeitou a anterior em conexões direta e pooled. Sessões anteriores do owner foram encerradas. O antigo papel administrativo do Preview 11 teve a senha redefinida pelo Neon; a nova senha não foi impressa ou enviada ao Vercel. O deployment antigo perdeu acesso ao banco.
- Material privado de recuperação do rollout foi protegido com Windows DPAPI/CurrentUser em arquivo ignorado. Não é backup independente, nem deve ser anexado ao repositório. Os papéis administrativos continuam reservados ao operador no provedor; não foram transformados em usuários de runtime.

### Publicação e verificação

- Tabela operacional adicionada remotamente. Produção: 30 tabelas públicas; Previews: 45 em cada banco. Não houve migration destrutiva nem restore neste cutover.
- Builds locais dos três recortes passaram. Teste descartável de retenção passou para lease, retomada, zero exclusões, autenticação, falha 503 e recuperação. Manifest de migrations passou também com arquivos normalizados como no checkout Linux.
- Produção e os dois aliases dos Previews passaram em saúde, Google/senha e callback correspondente. Endpoints de jobs ficaram protegidos; a barreira de Preview sintético continua bloqueando execução de jobs.
- A sessão existente de henry@revory.app abriu dashboard e relatório salvo no Preview 11; após a rotação o relatório foi recarregado com sucesso. Não foi necessário criar um usuário, trocar OAuth ou refazer login.
- Google/NextAuth, Resend e Stripe não tiveram suas credenciais, callbacks ou recursos alterados. O domínio continua revory.app. O patch manteve o cron diário existente e não ativou o monitor comercial.
- As duas cópias preservadas no incidente continuam com computes disabled=true. Um restore conserva credenciais históricas; precisa de revisão/rotação antes de qualquer reativação. Não conectar aplicação a cópia antiga para contornar a revogação.

### Pendências objetivas

1. **Retenção observada:** ainda não existe checkpoint real de sucesso. O cron diário permanece 05:15 UTC; não foi antecipada uma exclusão de produção como teste. Conferir status SUCCEEDED e lastSucceededAt após a execução natural. Previews sintéticos não executam esse job.
2. **Backup recorrente:** a janela real continua 6h, a agenda consultada estava vazia e o plano tem limite de um snapshot manual. Snapshot temporário e DPAPI local não encerram recuperação operacional. Definir destino, frequência, retenção, responsáveis, RPO/RTO e orçamento antes de mudar plano ou contratar armazenamento. Nenhum upgrade foi feito.

[Prova redigida do rollout](../qa/security-operations/rotation-2026-10-20.json). A prova não contém senhas, URLs autenticadas, conteúdo de clientes ou tokens.
