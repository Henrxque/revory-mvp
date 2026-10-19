# REVORY — implementação comercial self-service

Data: 2026-10-19. Direção do fundador: implementar o percurso conectado completo antes de recrutar o primeiro cliente comercial. A validação de utilidade com empresas reais vem depois da preparação e verificação técnica. Este documento define trabalho necessário; não declara capacidade implementada nem autoriza cobrança ou conexão live automática.

## Resultado que precisa existir

Uma empresa compatível cria conta, entende os requisitos de dados, compra um scan pontual, autoriza suas fontes Stripe e OpenAI, envia o ledger interno por CSV/XLSX, revisa IDs e período e recebe um relatório reproduzível. Nenhum administrador do REVORY precisa editar variáveis de ambiente para cadastrar cada cliente. A pessoa consegue revogar conexões, exportar dados e pedir suporte/reembolso.

Compatível significa ter autorização sobre as contas das fontes, permissões exigidas e um ledger interno exportável. A disponibilidade de leitura não garante atividade, completude ou atribuição por cliente. Respostas vazias e dados insuficientes têm saídas próprias. A primeira versão continua limitada a completions usage e Costs da OpenAI, ao escopo Stripe explicitamente suportado e às regras atuais de gasto sem atribuição e diferença de uso comparável.

## Evidência atual no código

| Parte | O que existe | Lacuna concreta |
| --- | --- | --- |
| Conta, sessão e workspace | Google/NextAuth, e-mail/senha, reset e isolamento | Preservar e testar no ambiente comercial |
| OpenAI | HTTP GET limitado, consentimento, revogação, artefatos e checkpoints | Configuração local única; falta onboarding por workspace, cofre e ligação com intake/scan |
| Stripe do cliente | Contratos paginados e ensaio com fixtures | Falta transporte real e conexão revogável por empresa |
| Cobrança do novo scan | Checkout, webhook, replay, refund e grant | Chaves/contrato somente test-mode e origem local; Preview sintético bloqueia checkout |
| Intake | CSV/XLSX, revisão, persistência e qualidade | Preview aceita só amostras; separar modo real e permitir ledger autorizado com compra |
| Scan | Regras determinísticas, evidência imutável e export | Exige dados sintéticos; precisa aceitar fontes conectadas elegíveis sem enfraquecer verificações |
| UX | Navegação simplificada, exemplos e relatório explicado | Unificar conexões e arquivo interno na mesma preparação; progresso persistente |

## Entrega A — conexões por empresa

1. Criar armazenamento protegido de credenciais por workspace e conexão. Preferir cofre gerenciado; qualquer envelope criptográfico precisa de chave mestra fora do banco, versionamento, integridade ligada ao workspace/provider/connection, rotação e política operacional definida. Banco, logs, exports e respostas nunca contêm credenciais em claro.
2. Separar chaves das fontes do cliente, credencial da cobrança do REVORY e credenciais usadas para geração de IA. Usar migração aditiva, sem reaproveitar campos contractor.
3. Implementar endpoints autenticados para cadastrar, verificar, substituir e desconectar fontes. Validar origem/CSRF, limites de corpo, rate limit, papel do membro, escopo, ambiente e workspace. Verificação de conexão não pode iniciar um scan gratuito.
4. OpenAI: adaptar o transporte existente para credencial de cada conexão. Orientar o cliente a fornecer credencial administrativa com permissão mínima suportada para Usage/Costs. Mostrar organização, canais e período consentidos. Não prometer login OAuth de OpenAI sem mecanismo oficialmente verificado. Nunca pedir uma chave de geração como equivalente.
5. Stripe: primeiro caminho implementável por chave restrita `rk_`, criada pelo cliente com permissões de leitura necessárias. Não aceitar chave irrestrita `sk_` como credencial de fonte. Uma instalação Stripe App/OAuth pode reduzir fricção, mas exige configurar distribuição, consentimento e callbacks próprios; não é pré-requisito para um onboarding self-service por chave restrita.
6. Implementar leitura Stripe real, paginada e limitada, com escopo de objetos/datas explícito, dedupe, retries, checkpoint, revogação e estados de falha. Não tratar invoice amount_paid como receita líquida universal nem misturar datas de criação, pagamento e serviço.
7. Antes de qualquer coleta financeira, conferir compra válida e consentimento. Revogação impede novos jobs e o commit de resultados de jobs antigos. Nenhum conector pode efetuar escrita em sistemas do cliente.

Aceite: duas contas de teste em workspaces diferentes conectam/revogam independentemente, sem alterações de ambiente por cliente. Falha, 403, chave inválida, vazio, 429, paginação incompleta e revogação em andamento não geram leitura falsamente completa. Nenhum segredo aparece em HTML, telemetria, erros ou export.

## Entrega B — conectar fontes ao relatório

1. Converter artefatos completos das APIs em lotes normalizados próprios do intake, com origem API, IDs externos, versão, hash, período, unidade, moeda, canal, coleta e limites. Preservar artefato original e proveniência. Não exigir upload CSV duplicado de Stripe/OpenAI conectados.
2. Manter custos e uso OpenAI em canais separados quando suas dimensões diferirem. Custo por projeto não herda modelo/customer sem evidência. Evitar fan-out ou união que duplique custo; dados agregados não provam margem por cliente.
3. Aceitar CSV/XLSX do ledger interno no modo real com compra e consentimento aprovados; manter o Preview sintético existente com sua política de amostras. Não converter grants sintéticos em autorização para dados reais.
4. Preservar período, dados selecionados e progresso da preparação por workspace. Não presumir export time/complete through a partir do upload. Só preencher metadados suportados pelas fontes, apresentando limites e pedindo confirmação quando necessária.
5. Criar uma página de fontes com Stripe, OpenAI e Uso do seu produto. Mostrar estados acionáveis: não conectado, permissão insuficiente, conectado, leitura em andamento, sem registros reportados, parcial, pronto para revisão e revogado.
6. Revisar vínculos, escopo e qualidade antes do scan. Exibir ausência de dados como limitação, nunca como gasto zero, reconciliação total ou dinheiro recuperado.

Aceite: dados controlados passam das duas APIs e do arquivo interno ao mesmo motor, relatório e export. Replay não duplica registros nem consome nova capacidade. Testes cobrem diferenças conhecidas, falta de atribuição, unidades/períodos incompatíveis e isolamento entre workspaces. Teste sandbox/fixture prova engenharia; comparação com uma janela real não vazia permanece evidência distinta.

## Entrega C — compra, produção e operação

1. Generalizar o checkout do novo scan para test e live com configuração separada, validação server-side de produto/preço/moeda/mode, origem autorizada e contrato de oferta versionado. Preservar contratos antigos e não iniciar assinatura.
2. Webhook assinado, verificação de session/payment/workspace, idempotência, reordenação de eventos, reembolso e liberação de exatamente uma capacidade por compra. Retorno do navegador sozinho não comprova pagamento.
3. Realizar compra em sandbox Stripe de ponta a ponta antes de qualquer cobrança live: sucesso, falha, cancelamento, replay e refund; incluir percurso até relatório/export com dados controlados.
4. Implementar liberação comercial explícita por ambiente, separada do Preview sintético e do teste local. Configurar banco/migrations, segredo do cofre, cobrança e webhook no servidor; preparar health, logs redigidos, jobs limitados, backup/restore, retenção, exclusão e reversão.
5. Resolver a pendência conhecida de exposição da credencial owner Neon antes de guardar credenciais ou dados reais de clientes. Rotação precisa ser coordenada com os consumidores existentes; registrar encerramento sem revelar segredos.
6. Publicar requisitos, escopo suportado, termos, privacidade, retenção, suporte e refund da oferta nova. Medir compra, ativação, ajuda e falhas sem registrar conteúdo financeiro ou credenciais em analytics.

Aceite técnico: uma conta nova, sem privilégios internos, completa compra sandbox, conexão, leitura, ledger, revisão, scan e export no ambiente preparado. Implementação pode estar pronta para ativação; operação live exige a configuração final da oferta e smoke test no alvo. Não marcar teste sintético como cliente comercial, utilidade comprovada ou lançamento validado.

## Dependências do fundador

- Preço e moeda efetivos do scan pontual. US$99 permanece hipótese até confirmação; configuração live deve falhar fechada se faltar decisão/Price ID válido.
- Conta Stripe do REVORY apta a receber pagamentos e recursos próprios da oferta AI SaaS. Credenciais e webhook entram em armazenamento protegido, nunca no chat.
- Configuração do cofre/chave mestra e dos ambientes, com acesso para salvar segredos no servidor quando chegar essa etapa.
- Identidade comercial, contato de suporte e política de refund/retencão para os documentos públicos.
- Uma conta OpenAI com atividade autorizada para provar equivalência não vazia quando disponível. Não bloqueia a implementação técnica nem autoriza gerar consumo pago artificialmente.

Cada cliente fornece suas próprias credenciais de fonte e o ledger pelo aplicativo. A conta pessoal do fundador não é a fonte dos clientes.

## Sequência e critérios de comunicação

Executar A, B e C como entregas do mesmo percurso. As Sprints 11 e 12 passam a ser medidas por essas saídas; a Sprint 13 mede os primeiros clientes pagos e a Sprint 14 decide expansão. Implementação técnica não deve esperar uma coorte comercial prévia. Validar engenharia antes de cobrar; validar valor real com os primeiros clientes após liberar a oferta de modo controlado.

Em cada fechamento, declarar separadamente: código implementado, testes locais, prova em sandbox real, versão implantada, configuração comercial ativa e cliente real validado. A palavra "pronto" precisa dizer qual dessas condições foi demonstrada.

Manter a identidade premium, as integrações de login/Resend e a preferência visual sem setas decorativas.

## Referências verificadas

- OpenAI Costs: https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs
- OpenAI Administration: https://developers.openai.com/api/reference/administration/overview
- Stripe restricted keys: https://docs.stripe.com/keys/restricted-api-keys
- Stripe Apps authentication options: https://docs.stripe.com/stripe-apps/api-authentication
- Estado atual: `services/ai-integrity/openai-source.ts`, `openai-http.ts`, `source-fixtures.ts`, `purchase.ts`, `scan.ts` e `domain/ai-integrity/scan-offer.ts`.
