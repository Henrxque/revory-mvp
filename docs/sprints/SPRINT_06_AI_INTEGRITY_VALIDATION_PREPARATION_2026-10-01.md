# Sprint 06 — Preparação da validação paga

Data: 2026-10-01. **Preparação técnica e ensaio sintético implementados localmente. Validação paga real não concluída; compradores reais verificados: 0.**

O gate desta sprint continua sendo 3–5 scans comprados, consentidos e revisados por AI SaaS independentes. Os testes abaixo verificam o mecanismo de coleta de feedback; não demonstram demanda, precisão no mundo real ou disposição de pagar.

## Entrega

- Revisão de cada finding: diferença sustentada, diferença esperada, falso positivo ou evidência insuficiente. Exige confirmação de consulta à evidência e explicação.
- Revisão do relatório: utilidade, necessidade de ajuda e minutos de preparação relatados pelo usuário. Esse tempo não é telemetria observada.
- Histórico de revisões por relatório, com novas versões em vez de sobrescrita. O resumo usa a conclusão mais recente de cada finding; o export preserva as anteriores.
- Resumo de cobertura da revisão, dados inconclusivos e falsos positivos, com denominador explícito.
- Export JSON das revisões, inclusão no export do workspace e exclusão pela retenção dos snapshots.
- [Protocolo do piloto pago](../validation/SPRINT_06_PAID_PILOT_PROTOCOL.md), [registro vazio da coorte](../validation/PAID_PILOT_COHORT_TEMPLATE.csv) e [formulário por participante](../validation/PAID_PILOT_PARTICIPANT_REVIEW_TEMPLATE.md).

Todas as revisões implementadas são `SYNTHETIC_REHEARSAL`, sob a flag de experiência fora de produção. O modo é definido pelo servidor e restringido no banco; o cliente não pode enviar um modo real ou escolher o autor. O número de participantes reais nestes resultados é sempre zero.

## Semântica de evidência

O feedback fica separado do snapshot e dos findings do motor. Uma conclusão humana não altera hashes, valores ou evidência exportada, nem transforma diferença sustentada em perda financeira confirmada. Correções do motor exigem nova versão e nova análise.

`Falsos positivos / (diferenças sustentadas + diferenças esperadas + falsos positivos)` considera a última revisão conclusiva de cada finding. Findings sem revisão e com evidência insuficiente são exibidos separadamente. Sem denominador conclusivo, a taxa é ausente, não 0%. A ferramenta não estima precisão de mercado a partir de exemplos sintéticos.

## Implementação e rotas

| Área | Artefato / decisão |
| --- | --- |
| Contrato e resumo determinístico | `domain/ai-integrity/validation-review.ts` |
| Persistência aditiva | Modelo `AiIntegrityReviewEvent`; migration `20261001000100_ai_integrity_validation_review` |
| Serviço | `services/ai-integrity/validation-review.ts`; lock do snapshot, revisão sequencial, idempotência por workspace/request e audit event |
| Relatório e finding detail | **adapt**: adicionar revisão e resumo à experiência AI existente; nenhuma rota histórica removida |
| APIs novas | POST `/api/ai-integrity/reviews`; GET `/api/ai-integrity/scans/[snapshotId]/reviews` |
| UI | `AiValidationReviewPanel` e `AiValidationReviewSummary`, mantendo tokens e tipografia REVORY |
| Portabilidade | Export do workspace versão 7, incluindo revisões; retenção por cascata no snapshot |

APIs autenticadas e isoladas por workspace. POST verifica origem, limita frequência e tamanho do JSON. Chave idempotente com conteúdo diferente é rejeitada. FKs compostas impedem vínculos com findings de outro workspace. Até 2.000 eventos de revisão por relatório; nenhum acesso a sistemas do cliente.

## Verificação executada

| Verificação | Resultado |
| --- | --- |
| `npm run qa:ai-integrity-sprint-6` | PASS: contrato estrito, categorias, revisão mais recente, denominador, ausência de medição e exclusão de validação real |
| `npm run qa:ai-integrity-sprint-6:db` | PASS em PostgreSQL descartável: concorrência/idempotência, cross-tenant, histórico, auditoria, portabilidade, retenção e export original inalterado |
| `npm run qa:ai-integrity-sprint-6:browser` | PASS: fluxo de compra simulada → import → mapping → scan → revisão de finding/correção → feedback do relatório → export; desktop/mobile |
| ESLint dos arquivos alterados, TypeScript e Prisma validate | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |

O navegador exercitou o SDK Stripe contra simulação loopback e webhook assinado, não contra Stripe sandbox. Verificou também rejeição de origem inválida, autenticação, relatório inexistente, três eventos de revisão, preservação dos bytes do export original e ausência de overflow horizontal/erros de console.

[Registro de navegador](../qa/ai-integrity-sprint6/verification.json): 20 capturas, nenhum erro de console, sem overflow horizontal. Exemplos: [finding desktop](../qa/ai-integrity-sprint6/review-finding-desktop.png) e [relatório mobile](../qa/ai-integrity-sprint6/review-report-mobile.png).

## Dependências abertas

1. **Sprint 05:** teste real do checkout no Stripe sandbox. As três configurações de teste necessárias não estavam presentes nesta sessão; nenhum recurso Stripe foi criado ou alterado.
2. **Piloto com dados reais:** ambiente e condições de pagamento, consentimento, dados e operação precisam ser definidos e verificados. O billing AI atual aceita apenas teste; `syntheticDataConfirmed` e o bloqueio de produção continuam ativos.
3. **Coorte:** nenhum comprador/consentimento real foi registrado. A disponibilidade de participantes foi perguntada ao fundador e ainda não confirmada nesta sessão.
4. **Gate Sprint 06:** coletar 3–5 casos reais pagos, revisar precisão por regra, utilidade, fricção e suporte; corrigir ou limitar falsos positivos antes de considerar Sprint 07.

Não houve deploy, migration no banco principal, coleta de arquivos reais, envio de convites ou nova oferta pública. O protocolo é material de preparação, não consentimento concedido nem contrato aprovado. Preços continuam hipóteses.

## Próxima etapa

Fechar o teste real de Stripe da Sprint 05 e preparar o ambiente/condições do piloto. Depois, executar a coorte conforme o protocolo, com compra explícita e revisão assíncrona. A conclusão desta preparação não libera automaticamente dados reais, conectores ou lançamento.
