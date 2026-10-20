# Monitor — homologação remota de 20/10/2026

Este registro descreve testes técnicos do proprietário. Não representa cliente pago, renovação validada ou liberação comercial live.

## Verificado

- Preview dedicado no branch `release/monitor-hml`, banco vazio criado com `template0` no branch Neon de teste existente, separado da produção e da demo. Nenhuma cópia de linhas de produção.
- 38 migrations verificadas e conexão por role runtime sem ownership/DDL. Credenciais fora dos artefatos versionados.
- Login real na aplicação remota; conta QA apenas no banco de homologação. Sua senha é distinta da identidade de produção.
- Saúde 200, banco reachable; job rejeita Bearer ausente e aceita o segredo dedicado. Cobrança antiga bloqueada e webhook rejeita assinatura inválida. A assinatura aceita no teste de fronteira é fixture ignorada, não pagamento nativo.
- CNAME `monitor-hml.revory.app` salvo na Spaceship para o valor recomendado pelo Vercel. DNS autoritativo e API Vercel confirmaram a configuração. Nenhum registro anterior editado.
- HTTPS público e health 200/ok/reachable confirmados. A primeira chamada externa identificou HTTP 302 da proteção de Preview. A exceção foi aplicada somente ao alias `monitor-hml.revory.app`; demais Previews continuam protegidos. Login da aplicação, Bearer do cron e assinatura dos webhooks preservados.
- URLs de retorno do Preview ajustadas somente no branch aprovado. Callback Google adicionado após confirmação específica do fundador, preservando produção e callbacks Sprint 10/11. Configuração salva; login Google neste novo domínio ainda requer seu percurso próprio.
- Checkout remoto de US$399 em sandbox completado pelo navegador, invoice paga em modo test e assinatura ACTIVE no banco isolado. Webhook nativo sem relay CLI; evento `checkout.session.completed` sem entregas pendentes. Não foi semeado acesso pago no banco.
- Agendador próprio integrado por PR #9, com diagnósticos sem segredos nos PRs #10/#11. Chamada manual 39476373537 passou e evento natural `schedule` 39508129704 passou. Agenda habilitada, no máximo uma chamada programada por hora; o horário real do GitHub pode atrasar. Nenhuma leitura de fonte foi autorizada ainda.
- Botão `Send test email` publicado e usado no app remoto: Resend aceitou um e-mail para `henry@revory.app`, outbox `SENT`, uma tentativa e ID do provedor preservado. Repetição pelo navegador manteve um aviso/uma tentativa. Após login/MFA do proprietário, o painel confirmou **Delivered**, com o mesmo ID registrado no outbox. Não criou schedule, leitura ou finding. O app informa aceite pelo provedor; posicionamento na caixa de entrada não foi comprovado.
- Teste descartável específico de e-mail e regressão do Monitor passaram, além de tipos/lint e fronteiras HTTPS públicas. Login e saúde de produção permaneceram preservados; a conferência mais recente de produção retornou 200/ok/reachable.
- OpenAI: uma chamada real Chat Completions, 11 tokens de entrada e 1 de saída, sem retry, sem compra de créditos ou mudança de recarga. Estimativa de custo US$0,0000015 conforme tarifa do modelo. Chave de um dia, somente Chat Completions: Request, revogada imediatamente após a chamada e removida do cofre de operação. Demais chaves existentes preservadas.

## Pendências — não contar como concluídas

- O percurso de alerta disparado por dados reais de uma comparação continua dependente da prova de fontes abaixo. O teste de transporte/entrega pelo Resend passou; não equivale a esse percurso completo.
- Usage/Costs OpenAI não vazios comparados com ledger equivalente: a geração não substitui esse teste. Janela UTC de 20/10–21/10, mais lag mínimo de 24h, só fica elegível em 22/10 às 00:00 UTC; a publicação da fonte ainda pode atrasar.
- Stripe live bloqueado: credencial anterior rejeitada; proprietário está localizando a conta correta. Não configurar a sessão “New business” como a conta comercial do REVORY sem verificação.

## Artefatos

- `deployment.json`: deploy e isolamento.
- `http-boundary.json`: fronteiras HTTP reais no Preview protegido.
- `authenticated-monitoring.png`: login e tela remota.
- `dns-monitor-hml.png`: registro adicionado na Spaceship.
- `openai-generation-receipt.json`: uso retornado pela chamada, sem prompt ou segredo.
- `openai-temporary-key-revoked.png`: revogação confirmada na Platform.
- `native-checkout.json`: pagamento sandbox e estado canônico remoto.
- `domain-access.json`: exceção limitada ao alias de homologação.
- `scheduler.json`: eventos manual e natural do GitHub Actions.
- `email-test.json`: envio real, ID do provedor e repetição sem duplicação; estado final de entrega separado.
- `resend-delivered.png`: evento Delivered do mesmo e-mail no painel autenticado do provedor.
- `public-http-boundary.json`: saúde pública e rejeição de job sem Bearer, e-mail sem sessão, cobrança antiga e assinatura de webhook inválida.

Com lag de 24h, a janela OpenAI fica elegível em **21/10 às 21h de Brasília** (22/10 00:00 UTC), sujeita ao atraso de publicação da fonte. Criar a próxima chave temporária de leitura apenas quando a janela estiver elegível; a chave de geração já foi revogada. Não declarar exclusividade do projeto padrão ou completude do ledger sem revisar os dados efetivamente retornados.

Os PRs [#9](https://github.com/Henrxque/revory-mvp/pull/9), [#10](https://github.com/Henrxque/revory-mvp/pull/10) e [#11](https://github.com/Henrxque/revory-mvp/pull/11) alteram somente o dispatcher de homologação e seus diagnósticos. O branch completo do produto não foi integrado à produção. A agenda usa segredo e flag próprios, distintos de produção. `SENT` no outbox significa aceite pelo provedor de e-mail; entrega ao destinatário exige evidência adicional.
