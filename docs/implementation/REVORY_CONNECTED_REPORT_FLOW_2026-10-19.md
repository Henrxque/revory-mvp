# APIs e ledger no mesmo relatório — entrega local B

Data: 2026-10-19. Continuação da [base de conexões por empresa](REVORY_CUSTOMER_CONNECTIONS_FOUNDATION_2026-10-19.md), conforme a parte B do [plano comercial](REVORY_SELF_SERVICE_COMMERCIAL_2026-10-19.md). Não ativa produção, compra live ou oferta comercial.

## Fluxo implementado

1. O proprietário salva conexões e autoriza Stripe/OpenAI para um período fechado. A leitura continua limitada às permissões e aos canais da entrega A.
2. Em cada leitura completa, **Use this read in my report** prepara a entrada de análise. Stripe/OpenAI não exigem upload CSV duplicado.
3. A página **Add your data** mostra as duas fontes de API e o arquivo de uso interno. Neste modo, upload aceita apenas ledger CSV/XLSX autorizado. Colunas, linhas excluídas e qualidade passam pela revisão existente antes da persistência.
4. O usuário revisa IDs e exclusividade dos projetos no fluxo de vínculos existente. Não há matching silencioso. Sem vínculo suficiente, o custo permanece sem atribuição e comparações podem ser suprimidas.
5. Em **Create a report**, escolhe as três fontes do mesmo período, confirma completude, lag e autorização. Datas de coleta das APIs vêm da evidência e são impostas pelo servidor; não são substituídas por datas declaradas no formulário. Paginação completa não prova completude total da conta.
6. **Save setup for later** persiste seleção, datas e lag no workspace. Revisões impedem sobrescrever uma mudança feita em outra aba. Consentimento e confirmação de fechamento não são salvos como autorização permanente; precisam ser revistos antes de criar o relatório.
7. O mesmo motor produz snapshot, findings e exports JSON/CSV. O grant é consumido somente após persistência bem-sucedida. Repetir os mesmos inputs retorna o mesmo relatório, sem consumir outro grant.

## Separação das fontes e proveniência

- Uma leitura OpenAI mantém dois canais: completions Usage e Costs. A entrada de provider reúne **linhas independentes**, sem join que distribua custo de projeto por modelo/token/customer. Custo observado e quantidades continuam separados.
- Cada linha mantém canal, external ID, payload minimizado, versão do conector, leitura e hash de artefato. O lote mantém período, conta, geração, coleta e limites. A conta Stripe ainda é declarada, não verificada por uma chamada de identidade.
- Relação composta por workspace liga lote e leitura de origem. O snapshot guarda também os artefatos de API e seus hashes. O export de workspace inclui promoções e rascunho, sem credenciais.
- Leituras com conteúdo idêntico na mesma conexão/geração reutilizam o primeiro lote. Sua data de coleta original permanece; uma releitura igual não fabrica frescor. Novos valores preservam revisões/conflitos conforme o contrato existente.
- Fonte inteiramente vazia não vira lote com zero inventado. A UI distingue ausência de linhas e permite revisar escopo/período. Custos vazios e usage presente não se transformam em custo zero.
- Revogar ou substituir conexão bloqueia nova promoção e novo scan com aquela geração. Relatórios já emitidos continuam reproduzíveis e imutáveis.
- Retenção preserva leitura de origem enquanto existir lote dependente. Lotes expirados removem seus snapshots dependentes antes da limpeza de origem; isso nunca restitui um grant consumido. Exclusão do workspace continua funcionando com fontes preparadas.

## Correção versionada do motor

O teste conectado revelou que `ai-integrity/4.1.0` tratava buckets de input e output no mesmo projeto/modelo como sobrepostos, e incluía unidades distintas na mesma seleção de ledger. Essa versão continua intacta para reproduzir relatórios históricos.

Relatórios conectados usam **`ai-integrity/4.2.0`**: separação exata por unidade na seleção e na verificação de sobreposição. Input e output podem ser comparados independentemente; sobreposição dentro da mesma unidade continua suprimida. Não converte tokens em dinheiro. Relatórios sintéticos anteriores e demo continuam com a versão 4.1; histórico e leitura aceitam ambas. Monitoramento sintético não foi ampliado para combinar versões.

## Ambiente e acesso

Exige `REVORY_AI_CONNECTED_REPORTS=true` **e** o gate local de conexões da entrega A. Indisponível em Vercel, produção e Preview sintético. Variáveis novas têm padrão `false` no exemplo de ambiente.

Uma compra de teste confirmada pelo driver `stripe-test`, com grant ativo não consumido, é necessária para preparar novas fontes, ledger e rascunho. O scan exige grant correspondente no workspace e autorização explícita. Compras sintéticas e simuladas não concedem esse acesso. Os testes criam estado fictício de compra para exercitar a aplicação; não comprovam transação Stripe real.

Migration aditiva: `20261019000200_ai_connected_report_sources`. Nenhuma migration foi aplicada em ambiente remoto nesta entrega. Configuração, secrets e integridade dos ambientes precisam ser preparados antes de publicar o código que usa as tabelas novas.

## Prova técnica

`npm run qa:ai-connected-report:db`, em banco PostgreSQL local descartável:

- Todas as 36 migrations aplicadas.
- Duas leituras API simuladas, promoção concorrente/idempotente e releitura com conteúdo igual.
- CSV real no parser: 80 input tokens e 20 output tokens, com IDs e janela explícitos.
- Provider: 100 input tokens, 20 output tokens e custo de projeto reportado de USD 1,25.
- Mapping de projeto exclusivo confirmado com evidência; resultado: **20 input tokens de diferença**, duas comparações, sem valor monetário inventado. Uma única linha de custo permanece em USD 1,25, com modelo ausente.
- Ausência de linhas não cria lote; consentimento faltante, tipo de arquivo-fonte errado, usuário errado e modo incorreto são rejeitados.
- Rascunho com revisão; campos inesperados e aba desatualizada rejeitados.
- Replay retorna um snapshot, consome um grant; JSON preserva modo e artefatos, CSV preserva finding de quantidade.
- Reexecução 4.1 mantém a supressão histórica; 4.2 continua rejeitando sobreposição na mesma unidade.
- Retenção protege a evidência referenciada, remove dependências na ordem correta e preserva consumo do grant; exclusão de workspace com fontes preparadas passa.
- Regressão do Sprint 04 em banco descartável: PASS, incluindo concorrência, evidência, export, isolamento e retenção.

Não houve chamada nova a contas externas reais. As fixtures não são comprador, validação de utilidade ou equivalência com uma janela real não vazia.

## Verificação na interface

Uma conta local fictícia, com login normal por senha, completou pela interface:

- Promoção das duas leituras de API previamente preparadas com transportes de fixture.
- Upload do CSV interno, revisão das oito colunas, validação de duas linhas sem exclusões e persistência.
- Seleção do projeto observado e confirmação explícita de exclusividade para o customer interno.
- Retomada de um rascunho de QA previamente salvo, seguida de salvamento pela interface; datas de coleta API aparecem bloqueadas e consentimentos permanecem desmarcados até revisão.
- Confirmação final e geração do relatório pelo endpoint normal: duas comparações, um finding de 20 input tokens, USD 1,25 de custo observado separado e nenhum valor monetário para o mismatch.
- Download do JSON pelo app: versão 4.2, dois artefatos de API, delta de 20 e valor monetário `null` conferidos no arquivo baixado.
- Layout a 390 × 844 sem overflow horizontal. A conta e todos os registros são fictícios.

Evidências: [desktop](../qa/connected-report/report-desktop.png), [mobile](../qa/connected-report/report-mobile.png) e [JSON exportado](../qa/connected-report/report-proof.json). O teste comprova o percurso da aplicação em ambiente local com fixtures. Não comprova transporte novo contra conta real, pagamento no Stripe ou publicação.

Verificações finais: TypeScript e ESLint dos arquivos alterados passaram. `npm run build` passou, incluindo compilação otimizada e geração das 64 páginas estáticas. Regressões em bancos descartáveis da entrega A e do Sprint 04 passaram após as alterações, incluindo criptografia, isolamento, concorrência, replay, retenção e integridade do manifesto completo. Os serviços locais de QA foram encerrados após a prova; screenshots e JSON registram o resultado.

## Próxima entrega

Parte C: compra Stripe sandbox real de ponta a ponta, configuração de ambiente comercial, suporte explícito a fontes live, identidade Stripe verificada, oferta/preço/moeda, operação de credenciais/rotação e gate de ativação. A pendência conhecida da credencial owner Neon continua exigindo encerramento coordenado antes de armazenar dados ou chaves de clientes em ambiente remoto. `revory.app` e o Preview remoto não foram alterados.
