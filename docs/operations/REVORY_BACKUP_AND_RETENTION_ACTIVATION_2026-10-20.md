# REVORY — Backup recorrente e primeira retenção

## Estado verificado em 20/10/2026

- Produção Neon na branch ativa main, PostgreSQL 17, plano Free; janela de recuperação real: 21600 segundos (6h).
- Agenda de snapshots vazia. O único snapshot manual é anterior ao patch e tem expiração; não comprova backup recorrente.
- Vercel aponta para o patch operacional publicado, crons habilitados e retenção diária em 05:15 UTC. No Hobby, a execução pode ocorrer durante a hora 05 UTC (02h de Brasília).
- A tabela operational_job_states ainda não tem linha RETENTION. A primeira janela posterior ao deploy é 21/10/2026. Não foi executada exclusão de produção para antecipar o teste.

## Decisão: backup sem upgrade do Neon

O fundador recusou o upgrade da instalação compartilhada. Nenhuma alteração de plano, faturamento, VIDENCE ou outro projeto foi realizada.

Foi implementada a rotina GitHub Actions `REVORY encrypted production backup`: diária às 04:23 UTC (01:23 de Brasília), arquivo pg_dump do schema público de produção criptografado com age antes de sair do runner, retenção de sete dias, limite de 20 MiB por arquivo e guard de 200 MiB no repositório. Role SQL dedicada somente leitura; identidade privada fora do GitHub e do Git. O diretório local tem ACL apenas do usuário e existe cópia DPAPI. Ainda é necessária uma cópia da identidade fora deste computador, sob custódia do fundador.

Primeiro ensaio real passou: 30 tabelas e 132 registros restaurados exclusivamente em PostgreSQL local descartável, com igualdade de estrutura e hashes de conteúdo no mesmo snapshot READ ONLY exportado. As leituras dos dois bancos de Preview foram negadas. Prova em `docs/qa/security-operations/free-backup-2026-10-20.json`. A rotina foi publicada em main e o run 39440890191 terminou com sucesso. O próprio artefato remoto foi baixado, teve SHA-256 conferido, foi descriptografado e restaurado somente em PostgreSQL local descartável; 30 tabelas e 132 registros conferiram, com manifestos da origem inalterados antes/depois. Prova: `docs/qa/security-operations/github-backup-recovery-2026-10-20.json`. A primeira tentativa falhou antes de acessar o banco porque o runner só tinha cliente PostgreSQL 16; instalação explícita do cliente 17 corrigiu a falha. Nenhum artefato parcial foi publicado.

A janela PITR Neon continua em 6h. RPO alvo do backup diário: 24h quando a rotina executa. Não é um SLA nem um teste de failover completo do serviço. O backup não inclui Previews sintéticos, schema neon_auth não utilizado pela aplicação, roles/senhas ou configuração/secrets externos. Detalhes e recuperação: `docs/operations/REVORY_ENCRYPTED_BACKUPS.md` na branch operacional publicada.

O uso cabe na franquia atual do GitHub: auditoria encontrou zero artefatos em 26 repositórios do proprietário antes da ativação. A franquia é compartilhada com outros artefatos e Packages; não prometer gratuidade ilimitada. Nenhum produto pago foi contratado ou limite de gastos alterado. Falha, arquivo mais antigo que 26h ou limite de capacidade exige revisão.

## Primeira retenção — observação

Consulta somente leitura no banco de produção:

```sql
SELECT key, status, "lastSucceededAt", "completedAt", "resultJson"
FROM public.operational_job_states
WHERE key = 'RETENTION';
```

Aceite: status SUCCEEDED, resultJson.complete=true, resultJson.failed=0 e lastSucceededAt na janela posterior ao deploy. Nenhum registro, erro, PARTIAL, BUSY ou FAILED não é sucesso. Zero exclusões pode ser sucesso; deve haver checkpoint real criado pelo job. Conferir também saúde pública e ausência de erros do endpoint quando os logs ainda estiverem disponíveis.

A conferência única está agendada neste chat para 21/10/2026 às 03:10 de Brasília, após a janela de execução. Automação: conferir-primeira-reten-o-do-revory. Ela deverá registrar evidência ou apontar falha concreta, sem disparar uma execução destrutiva nem fabricar checkpoint. A automação também conferirá o primeiro backup criado pelo evento schedule, após 04:23 UTC; a execução manual bem-sucedida de hoje não comprova a agenda. A retenção natural ainda está pendente e o gate comercial não muda.

## Fontes oficiais consultadas

- [Neon: agenda requer plano pago](https://api-docs.neon.tech/reference/setsnapshotschedule)
- [Neon: preços e limites](https://neon.com/pricing)
- [Vercel: precisão do cron no Hobby](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

## Histórico da alternativa paga

A agenda nativa de snapshots Neon exigia plano pago com scope=installation, incluindo REVORY, VIDENCE e outro projeto. Essa proposta não foi aplicada e foi substituída pela alternativa criptografada acima, conforme escolha explícita do fundador.
