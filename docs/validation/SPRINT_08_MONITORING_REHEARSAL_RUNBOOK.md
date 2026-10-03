# Sprint 08 — Runbook e política de dados do ensaio

Estado: preparação local sintética, 2026-10-01. Referência: [entrega e limitações](../sprints/SPRINT_08_AI_INTEGRITY_MONITORING_PREPARATION_2026-10-01.md).

## Operação local

1. Executar `npm run qa:ai-integrity-sprint-8:db` ou `:browser`; o harness exige PostgreSQL local, cria um banco com nome aleatório e o remove ao terminar.
2. O teste usa imports e scans sintéticos reais do motor, em períodos diários adjacentes. Não simula compradores nem bypass de compra para um usuário: a preparação é helper de QA interno, fora da API do cliente.
3. Na UI de teste, selecionar baseline/período posterior, confirmar dados sintéticos e comparar. Repetição do par reutiliza comparação e alertas.
4. Revisar diferença por unidade e moeda, elegibilidade e fontes nos relatórios. Reconhecer alerta significa registrar leitura/revisão, não confirmar um leak, corrigir motor ou recuperar dinheiro.
5. Exportar JSON da comparação para preservar resultado e fingerprints. Reconhecimento fica no export de workspace separado da evidência imutável.
6. Se houver limitação, conferir duração/adjacência, buckets, unidades, fonte, lag e fechamento. Não remover supressão para fazer o painel parecer saudável.

Não ativar a flag `REVORY_AI_MONITOR_REHEARSAL` no preview comum sem um banco local separado preparado. Não aplicar migrations no banco principal por consequência de rodar testes. Para rollback da experiência, desligar a flag; preservar artefatos até retenção/exclusão autorizada.

## Dados e retenção implementados

| Registro | Conteúdo | Ciclo de vida |
| --- | --- | --- |
| Comparação | Referências aos dois snapshots, ator, versão, chave/hash, movimentos e candidatos a alerta | Imutável; export verificável; cutoff do workspace e dependência de ambos os snapshots |
| Alerta local | Comparação, signal key, kind, estado e reconhecimento com ator/data | Dedupe por comparação/signal; apagado com a comparação |
| Evidência original | Inputs, closure, mapping, coverage, findings e limitações dos scans | Preservada pelo monitor; política de snapshot/import existente |
| Auditoria | IDs da comparação/alerta e ação do ator | Política existente de auditoria; não contém credenciais/prompts |

Nenhuma API key, prompt, completion ou novo dado de cliente é coletado pelo monitor. O ensaio usa somente dados sintéticos e autenticação/workspace existentes. Portabilidade v9 inclui comparações e alertas isolados por workspace. Retenção da comparação não restaura uma compra consumida.

## Falhas e suporte self-service

- Chave original com conteúdo diferente: rejeitar; não sobrescrever artefato.
- Evidência/hash inválido: suspender exibição/export da comparação; investigar integridade dos dados antes de nova execução.
- Fonte ausente/incompleta ou escopo distinto: mostrar limitação; conferir dados e período em vez de interpretar ausência como resolução.
- Rate/history/size limit: reduzir o escopo e respeitar retenção; não contornar com novos workspaces.
- Alerta reconhecido: manter evento; alterações de finding exigem fluxo de revisão separado.

Não existe scheduler, e-mail, assinatura ou conexão real nesta operação. Resend preservado não equivale a entrega de alertas de monitoramento implementada.

## Critérios antes de beta real

- Consentimento e revogação reais para cada fonte, acesso mínimo e credenciais isoladas/protegidas.
- Primeiro e segundo reads úteis, cobertura explicada, replay/falha/atraso/retenção verificados com dados consentidos.
- Falsos positivos revisados e claims limitados; relação entre feedback e repetição de alertas definida.
- Job com orçamento, cancelamento, recuperação e auditoria; nenhum efeito em runtime/billing do cliente.
- Canal de alerta, preferências, opt-out e limites explícitos; teste de entrega se e-mail for escolhido.
- Política de dados e contratos do novo domínio revisados; não assumir que páginas legais históricas aprovam acesso às fontes AI.
- Stripe e compra/entitlements/cancelamento fechados antes da oferta. Valor recorrente e preço ainda precisam ser observados, sem scan gratuito real.

Este documento especifica preparação operacional; não é consentimento concedido, promessa de SLA ou contrato comercial aprovado.
