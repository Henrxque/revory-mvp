# Monitor — homologação remota de 20/10/2026

Este registro descreve testes técnicos do proprietário. Não representa cliente pago, renovação validada ou liberação comercial live.

## Verificado

- Preview dedicado no branch `release/monitor-hml`, banco vazio criado com `template0` no branch Neon de teste existente, separado da produção e da demo. Nenhuma cópia de linhas de produção.
- 38 migrations verificadas e conexão por role runtime sem ownership/DDL. Credenciais fora dos artefatos versionados.
- Login real na aplicação remota; conta QA apenas no banco de homologação. Sua senha é distinta da identidade de produção.
- Saúde 200, banco reachable; job rejeita Bearer ausente e aceita o segredo dedicado. Cobrança antiga bloqueada e webhook rejeita assinatura inválida. A assinatura aceita no teste de fronteira é fixture ignorada, não pagamento nativo.
- CNAME `monitor-hml.revory.app` salvo na Spaceship para o valor recomendado pelo Vercel. DNS autoritativo e API Vercel confirmaram a configuração. Nenhum registro anterior editado.
- OpenAI: uma chamada real Chat Completions, 11 tokens de entrada e 1 de saída, sem retry, sem compra de créditos ou mudança de recarga. Estimativa de custo US$0,0000015 conforme tarifa do modelo. Chave de um dia, somente Chat Completions: Request, revogada imediatamente após a chamada e removida do cofre de operação. Demais chaves existentes preservadas.

## Pendências — não contar como concluídas

- HTTPS público no novo subdomínio: DNS reconhecido, mas requisições locais deram timeout. Não ativar webhooks/agendador sem testar o alvo público.
- Cutover das URLs de autenticação/retorno do Preview e callback Google específico do novo subdomínio.
- Checkout remoto com entrega nativa do webhook Stripe; endpoint sandbox permanece desabilitado até validar acesso público.
- Primeiro sucesso manual e primeiro evento natural do scheduler remoto. PR operacional #9 preparado; ainda não ativo.
- Envio de aviso real pelo outbox Monitor/Resend e comprovação do estado de entrega.
- Usage/Costs OpenAI não vazios comparados com ledger equivalente: a geração não substitui esse teste. Janela UTC de 20/10–21/10, mais lag mínimo de 24h, só fica elegível em 22/10 às 00:00 UTC; a publicação da fonte ainda pode atrasar.
- Stripe live bloqueado: credencial anterior rejeitada; proprietário está localizando a conta correta. Não configurar a sessão “New business” como a conta comercial do REVORY sem verificação.

## Artefatos

- `deployment.json`: deploy e isolamento.
- `http-boundary.json`: fronteiras HTTP reais no Preview protegido.
- `authenticated-monitoring.png`: login e tela remota.
- `dns-monitor-hml.png`: registro adicionado na Spaceship.
- `openai-generation-receipt.json`: uso retornado pela chamada, sem prompt ou segredo.
- `openai-temporary-key-revoked.png`: revogação confirmada na Platform.

O PR [#9](https://github.com/Henrxque/revory-mvp/pull/9) contém somente o dispatcher de homologação, desabilitado por padrão. Sua agenda é uma chamada por hora; não há promessa de pontualidade. O branch completo do produto não deve ser mesclado em produção para ativar esse workflow.
