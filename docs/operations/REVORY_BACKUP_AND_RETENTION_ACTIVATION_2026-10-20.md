# REVORY — Backup recorrente e primeira retenção

## Estado verificado em 20/10/2026

- Produção Neon na branch ativa main, PostgreSQL 17, plano Free; janela de recuperação real: 21600 segundos (6h).
- Agenda de snapshots vazia. O único snapshot manual é anterior ao patch e tem expiração; não comprova backup recorrente.
- Vercel aponta para o patch operacional publicado, crons habilitados e retenção diária em 05:15 UTC. No Hobby, a execução pode ocorrer durante a hora 05 UTC (02h de Brasília).
- A tabela operational_job_states ainda não tem linha RETENTION. A primeira janela posterior ao deploy é 21/10/2026. Não foi executada exclusão de produção para antecipar o teste.

## Configuração preparada para aprovação de custo

- Provedor: o Neon já utilizado pelo REVORY, sem mover dados para outro serviço.
- Alvo: a branch de produção ativa, reconfirmada antes da alteração. O snapshot de branch abrange os bancos contidos nela; não afirmar isolamento físico dos Previews.
- Frequência: diária, 04:00 UTC (01h de Brasília), anterior à janela de retenção do aplicativo.
- Retenção: 604800 segundos (7 dias).
- Payload da agenda: [{"frequency":"daily","hour":4,"retention_seconds":604800}].
- RPO pretendido para os snapshots: 24h. Janela existente de PITR: 6h. São controles distintos. RTO operacional pretendido: até 60 minutos, a validar no ensaio; não é SLA.
- Alertar se o último snapshot automático tiver mais de 26h, estiver expirado, a agenda mudar, ou a coleta de metadados falhar.
- O provedor confirma que a agenda requer plano pago. A ativação e qualquer upgrade aguardam limite de gasto autorizado. A configuração acima ainda NÃO foi aplicada.

## Evidência necessária para encerrar backup recorrente

1. Plano e faturamento reais da integração conferidos; custo aprovado antes de contratar.
2. Leitura da agenda confirma daily, hour 4 e retenção de pelo menos 7 dias na branch correta.
3. Provedor criou ao menos um snapshot automático válido; registrar data e expiração sem segredos.
4. Recuperação conferida em alvo isolado, sempre com finalize:false, sem target de produção e sem promover/finalizar. Verificar vínculo dos computes e branch default antes/depois. O incidente anterior torna esses parâmetros obrigatórios.
5. Guardar prova redigida; não guardar URLs autenticadas ou chaves no repositório. Backup no mesmo provedor não é uma cópia independente contra perda da conta/provedor.

## Primeira retenção — observação

Consulta somente leitura no banco de produção:

```sql
SELECT key, status, "lastSucceededAt", "completedAt", "resultJson"
FROM public.operational_job_states
WHERE key = 'RETENTION';
```

Aceite: status SUCCEEDED, resultJson.complete=true, resultJson.failed=0 e lastSucceededAt na janela posterior ao deploy. Nenhum registro, erro, PARTIAL, BUSY ou FAILED não é sucesso. Zero exclusões pode ser sucesso; deve haver checkpoint real criado pelo job. Conferir também saúde pública e ausência de erros do endpoint quando os logs ainda estiverem disponíveis.

A conferência única está agendada neste chat para 21/10/2026 às 03:10 de Brasília, após a janela de execução. Automação: conferir-primeira-reten-o-do-revory. Ela deverá registrar evidência ou apontar falha concreta, sem disparar uma execução destrutiva nem fabricar checkpoint. Esta preparação não fecha os controles e não altera o gate comercial.

## Fontes oficiais consultadas

- [Neon: agenda requer plano pago](https://api-docs.neon.tech/reference/setsnapshotschedule)
- [Neon: preços e limites](https://neon.com/pricing)
- [Vercel: precisão do cron no Hobby](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

## Escopo de faturamento confirmado

A integração atual informa plano Free com scope=installation. Essa instalação contém REVORY, VIDENCE e outro projeto. Qualquer upgrade deve considerar todos esses recursos, não apenas o preço isolado do snapshot do REVORY. A pergunta de orçamento foi enviada ao fundador; nenhuma contratação foi feita. A estimativa pública de aproximadamente US$20/mês para um compute contínuo de 0,25 CU do REVORY não inclui uso adicional dos outros projetos, armazenamento, snapshots, tributos ou câmbio. O valor US$25 proposto é orçamento estimado, não um limite automático garantido do provedor. Antes de ativar, conferir o preço da instalação e interromper se a cobrança ou o escopo não corresponderem à autorização.
