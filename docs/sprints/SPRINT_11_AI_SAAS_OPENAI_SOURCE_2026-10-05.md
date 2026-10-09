# Sprint 11 — Fonte OpenAI Usage/Costs real

Estado em 2026-10-05: **PLANEJADA; gate aberto**. A [Sprint 07](SPRINT_07_AI_INTEGRITY_SOURCE_PREPARATION_2026-10-01.md) implementou paginação, consentimento e checkpoints apenas com fixtures. Esta sprint substitui o transporte fictício por uma leitura real e limitada da conta autorizada, após a [Sprint 10](SPRINT_10_AI_SAAS_REMOTE_HOMOLOGATION_2026-10-05.md). Stripe continua para a Sprint 12, conforme direção do fundador.

## Resultado executável

Um workspace autorizado consegue conectar sua fonte OpenAI, ler Usage/Costs de um período fechado, inspecionar cobertura/limites, revogar a conexão e comparar o resultado com um export do **mesmo período**. O ledger interno continua por CSV/XLSX. A leitura não cria atribuição por customer sem vínculo confiável.

## Trabalho

1. Conferir a documentação vigente da OpenAI no momento da implementação: disponibilidade de Usage e Costs, permissões mínimas realmente suportadas, granularidade, paginação, limites, latência e semântica de créditos/ajustes. Registrar o contrato escolhido e a conta de teste autorizada; não presumir que a chave de geração `OPENAI_API_KEY` concede acesso financeiro adequado.
2. Definir consentimento por workspace, organização/projeto, fontes, finalidade, período e versão. Guardar a credencial em armazenamento protegido com acesso mínimo; nunca registrar chave em banco em claro, evento, URL, resposta, screenshot ou repositório. Isolar essa credencial da usada para IA opcional do app.
3. Implementar transporte HTTP com timeout, paginação, rate limit/backoff, checkpoint, reexecução idempotente, revogação efetiva e falha segura. Persistir artefato de fonte e proveniência separados do snapshot imutável do scan.
4. Normalizar janelas UTC, `as of`, `complete through`, unidade, moeda, custo reportado, uso e dimensão de projeto/modelo conforme disponibilidade real. Mostrar cobertura incompleta, atraso e custo não atribuído; não estimar custo ausente silenciosamente.
5. Comparar a leitura API com export independente do mesmo intervalo, com tolerâncias e divergências documentadas. Reconciliar diferenças de arredondamento, atualização tardia e ajustes antes de marcar equivalência. Uma fixture não satisfaz este aceite.
6. Exercitar conta autorizada primeiro com dados controlados. Só permitir dados de um piloto após aprovação de ambiente, privacidade, retenção e consentimento da Sprint 13. Manter a interface pública sem promessa de conexão disponível enquanto o gate estiver aberto.

## Aceite verificável

- Uma leitura real autorizada produz artefato com IDs, janela, unidade, moeda, origem, tempo de coleta e limites de cobertura; nenhuma chave aparece nos logs ou exports.
- Segunda execução da mesma janela não duplica registros; paginação, 429/5xx, retomada e revogação são testadas.
- Conta/workspace A não lê, lista ou exporta dados de B; conexão revogada não inicia nova coleta.
- Diferenças API ↔ export do mesmo período são explicadas ou deixam o gate `FAIL`. Falta de vínculo interno mantém o custo como agregado/não atribuído.
- Evidências redigidas e decisão `PASS/FAIL` são registradas. `PASS` técnico não autoriza automaticamente análise real de cliente ou preço publicado.

## Fora desta sprint

Stripe, cálculo de margem por customer, promessa de economia/receita recuperada, compra e monitoramento agendado. A [Sprint 12](SPRINT_12_AI_SAAS_STRIPE_DATA_AND_PURCHASE_2026-10-05.md) fecha Stripe de dados e pagamento por último.
