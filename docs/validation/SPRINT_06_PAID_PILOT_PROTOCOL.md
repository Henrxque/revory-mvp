# Sprint 06 — Protocolo do piloto pago

Versão de preparação: 2026-10-01. **Coorte real iniciada: não. Compradores reais verificados: 0.** A ferramenta local registra apenas ensaios sintéticos; nenhuma conta de teste vira participante pago.

## Objetivo

Observar 3–5 AI SaaS independentes que comprem e consintam um scan para um período fechado. Verificar se conseguem preparar as três fontes sem call obrigatória, entender a evidência e decidir o que investigar. Documentar erros, utilidade e fricção antes de conectores ou recorrência.

O scan atual compara uso ledger/provider e atribuição de custo reportado. Stripe é contexto. Não vender margem, recuperação financeira, saldo de créditos ou correção automática. US$99 é hipótese de preço pontual, sem assinatura, sujeita à aprovação comercial antes de uma oferta real.

## Dependências antes do primeiro arquivo real

| Dependência | Evidência requerida | Estado atual |
| --- | --- | --- |
| Gate Sprint 05 | Checkout realmente hospedado no Stripe test-mode, confirmação sem assinatura, cancelamento, replay e refund; evidência redigida | Pendente; só simulação local verificada |
| Ambiente aprovado | Ambiente para piloto, isolamento, retenção/export/delete, logs redigidos, restauração e responsabilidade operacional verificadas | Não aprovado para piloto |
| Contrato de dados/comercial | Escopo, pagamento pontual, suporte assíncrono, retenção, exclusão, política de reembolso e consentimento revistos | Material de preparação; não aprovado como contrato |
| Pagamento real verificável | Compra consentida vinculada ao participante/empresa, versão da oferta e período; comprovante mínimo sem dados de cartão | 0 compras verificadas; billing AI atual é test-only |
| Participantes | 3–5 compradores independentes com ledger exportável e dados autorizados | Nenhum participante registrado |

Este protocolo não desliga `syntheticDataConfirmed` nem o bloqueio de produção. Liberação de dados reais exige decisão explícita após esses gates, seguida de implementação/teste do acesso, consentimento e pagamento correspondentes. Um simulador, um pagamento de sandbox ou o interesse de um prospect não satisfazem pagamento real.

## Qualificação assíncrona — antes de cobrar

1. Você é founder/CTO ou tem autorização da empresa para exportar e revisar estes dados?
2. Usa Stripe e qual provider de IA? Pode exportar os dois para um mesmo intervalo UTC fechado?
3. Seu ledger contém ID opaco do cliente, provider/project, model, quantidade, unidade e timestamp com timezone?
4. Pode explicar a semântica da unidade? Tokens de entrada/saída/cache, requests e créditos não são intercambiáveis.
5. Há projetos exclusivos por cliente ou apenas projetos compartilhados? Shared é elegível para revisar cobertura, não para inventar custo por cliente.
6. Quais ajustes, créditos, refunds, retries, períodos incompletos e atrasos de consolidação precisam ser considerados?
7. Qual decisão concreta você espera tomar com custo não atribuído ou diferença de uso? Se precisa de margem/receita recuperada para comprar, o escopo atual não atende.
8. Qual é seu canal assíncrono preferido? Call é opcional; não é requisito para a entrega.

Registrar resultado como **elegível**, **precisa preparar dados** ou **fora do escopo**, com motivo. Não coletar os arquivos de quem ainda não está autorizado e pago. Não usar faixas de MRR como critério automático.

## Preparação dos exports

- Três fontes no mesmo intervalo `[start, end)` UTC, com export time, complete-through e lag justificado pelo responsável.
- Stripe: IDs de objeto/customer, tipo/status, timestamp, amount em minor units e moeda/exponent. Sem cartões, e-mails ou nomes desnecessários.
- Ledger: ID de evento, ID opaco do customer, provider, project, model, quantidade/unidade e timestamp. Remover prompts, completions, chaves e conteúdo pessoal.
- Provider: provider, organization/project/model quando disponíveis, intervalo, report time, quantidade/unidade e custo **reportado** com moeda e adjustments. Ausência de custo nunca recebe preço de catálogo silenciosamente.
- IDs devem permanecer estáveis para dedupe e vínculos explícitos. Se o cliente pseudonimizar, ele mantém consistência e tabela de correspondência do seu lado; o REVORY não adivinha relações entre IDs.
- Documentar limitações no preview de Data Quality. Não “limpar” conflitos manualmente para criar um finding atraente.

Templates sintéticos em `public/samples/ai-integrity/` demonstram formato. Não são evidência de cliente nem de utilidade real.

## Registro de autorização — rascunho para revisão

Antes do piloto, o responsável deverá confirmar a autorização para fornecer os exports, finalidade limitada do scan, três fontes/período, oferta pontual e ausência de assinatura, limites das duas regras, condições de suporte, retenção/export/exclusão e política comercial aprovada. Registrar versão, data e responsável. Autorização para publicar case, nome, logo ou valores é separada e opcional.

Este parágrafo especifica o que o fluxo de consentimento precisa registrar; **não é um contrato aprovado nem consentimento concedido**. Não colocar PII, arquivos, secrets ou referências completas de pagamento no repositório.

## Execução e revisão

1. Compra explícita confirmada → autorização de dados → três exports revisados → vínculos explícitos → fechamento/lag → scan.
2. Registrar início da preparação, momento do primeiro resultado e ajuda humana necessária. Separar tempo observado no sistema, tempo relatado pelo participante e tempo de suporte do fundador.
3. Responsável revisa cada finding contra seus registros. Categorias: diferença sustentada, diferença esperada, falso positivo ou evidência insuficiente. Revisão insuficiente não pode ser promovida para resultado confirmado.
4. Registrar explicação, regra/snapshot/fingerprint e fontes verificadas. Feedback não altera o snapshot; correção do motor produz nova versão e nova análise preservando o histórico.
5. Perguntar: qual decisão foi possível, o que ficou sem resposta, onde travou e se teria comprado com o escopo explicado. Intenção de compra futura não é renovação.
6. Após correção, repetir os casos relevantes e confirmar o resultado com o comprador. Não monetizar quantidade de uso sem contrato/rate defensável.

## Denominadores e critérios de decisão

| Medida | Denominador e limite |
| --- | --- |
| Participantes pagos | Empresas independentes, pagamento real confirmado e consentimento; excluir demo/sandbox/simulação, duplicata, prospect e reembolso integral |
| Scan revisado | Scan entregue e revisado pelo responsável; relatório sem feedback permanece pendente |
| Falsos positivos | Findings classificados como falso positivo / findings conclusivamente revisados (diferença sustentada + esperada + falso positivo). Informar separadamente sem revisão e evidência insuficiente |
| Precisão de regra | Separar as duas famílias; tamanho pequeno de amostra não comprova precisão geral. Discordância exige revisão com fonte |
| Utilidade | Participantes com decisão concreta / participantes que responderam; divulgar não respondentes |
| Self-service | Scans concluídos sem ajuda obrigatória / tentativas elegíveis; registrar abandono, erro e minutos de suporte |
| Tempo até valor | Início definido até primeiro relatório e até decisão; separá-los. Tempo de preparação auto declarado não é telemetria observada |
| Finding material | Critério declarado pelo comprador e ligado a uma decisão; custo sem atribuição não é receita perdida |

Os alvos de pesquisa de <10% de falso positivo, <15 minutos até resultado e ≥30% de scans com finding material são **hipóteses revisáveis**, não números já medidos ou garantidos. Com 3–5 empresas, informar contagens e casos antes de generalizar percentuais.

**Avançar ao Sprint 07 somente quando:** 3–5 compras/consentimentos/entregas reais estiverem verificáveis; fontes/semântica e precisão estiverem revisadas; utilidade, fricção e suporte documentados; falsos positivos corrigidos ou limitados; nenhuma pendência de pagamento, dados ou operação estiver sendo ocultada. Resultado pode ser continuar validação, ajustar o wedge ou interromper uma hipótese.

## Operação solo

Uma oferta pontual, um canal assíncrono e uma janela de resposta explicitada antes da compra. Sem prometer SLA não implementado. Registrar minutos de suporte por etapa para avaliar sustentabilidade. Não fornecer scan gratuito de dados reais para preencher a coorte.

Mensagem de recrutamento somente após oferta/ambiente aprovados: explicar duas regras, três arquivos, preço pontual, prazo e limites; oferecer formulário de qualificação. **Nenhum convite ou mensagem foi enviado nesta sprint.**

## Artefatos do piloto

- [Registro da coorte](PAID_PILOT_COHORT_TEMPLATE.csv): template vazio, somente códigos opacos e referências redigidas.
- [Revisão de cada participante](PAID_PILOT_PARTICIPANT_REVIEW_TEMPLATE.md): perguntas e conclusão por caso.
- Relatórios técnicos e exports ficam no ambiente autorizado do participante, sujeitos à retenção; não em `docs/` ou `public/`.
- Resultados agregados devem indicar amostra, exclusões, não respondentes e estado dos gates. Qualquer case público exige autorização própria.
