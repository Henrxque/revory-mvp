# Sprint 08 — Preparação local de monitoramento

Data: 2026-10-01. **Ensaio local implementado; gate de beta recorrente aberto.**

Direção do fundador: avançar a Sprint 08 e resolver Stripe por último. A entrada conectada planejada é API Stripe + API OpenAI; CSV/XLSX permanece como entrada inicial do ledger interno. A conexão OpenAI real da Sprint 07 ainda não existe. Esta entrega usa dois scans sintéticos existentes, sem alegar leitura agendada, acesso real, validação paga ou assinatura.

## Entrega e percurso

`dois relatórios imutáveis → replay dos inputs → elegibilidade temporal/escopo → movimentos → artefato e alertas locais → reconhecimento/export`

- Nova tela `/app/ai-integrity/monitoring`, adicionada condicionalmente ao shell premium.
- Seleção explícita de baseline e período posterior, confirmação de dados sintéticos e execução manual.
- Identidade temporal independente do fingerprint da evidência. Fingerprints originais continuam referenciados; não se confundem novos IDs de dados com novos problemas.
- Estados: `NEW`, `PERSISTENT`, `RESOLVED` e `SUPPRESSED`. A UI traduz `RESOLVED` como **No longer observed**, sem inferir correção ou dinheiro recuperado.
- Deltas decimais exatos de custo reportado e de quantidade em canais separados. Sem monetizar tokens ou somar um total genérico de perda.
- Alertas locais para diferença nova, aumento da magnitude da diferença e limitação da comparação. Reconhecimento idempotente e auditado; não altera a classificação do finding.
- Histórico, links aos dois relatórios e export JSON com hash. Sem consultas ao provider ou execução automática de novos scans.

## Elegibilidade e limites

Os dois inputs precisam pertencer ao mesmo workspace e à versão de regras atual. Só períodos **adjacentes e de duração idêntica**, com mesmo lag, fontes/sourceSystem/timezone e estrutura de buckets, recebem movimento comparável. Estrutura inclui provider, organization, project, model, moeda, unidade, base de custo, ajuste e posições temporais relativas.

Exclusões de linhas e fechamento incompleto limitam a comparação. Diminuição do denominador elegível de custo não vira resolução. Ausência de uma comparação de usage elegível não vira zero; mudança de customer, unit ou scope pode suprimir o movimento. Meses de calendário com durações diferentes ficam limitados nesta versão; não existe normalização diária implícita.

Uma resolução exige valor zero em uma comparação posterior elegível. Ainda assim, períodos diferentes não provam correção causal. Feedback da Sprint 06 permanece separado: não reescreve cálculos nem aplica automaticamente correção de falso positivo ao motor.

Limites implementados: 100 comparações retidas por workspace, artefato até 4 MiB UTF-8, 19 alertas de mudança por comparação e até um alerta adicional de qualidade. Alertas de mudança excedentes são contados explicitamente. UI mostra últimos 40 relatórios, 10 comparações, 80 alertas e 20 movimentos por comparação; export contém todos os movimentos.

## Persistência e segurança

Models aditivos `AiIntegrityMonitorComparison` e `AiIntegrityMonitorAlert`; migration `20261001000300_ai_integrity_monitor_rehearsal`. FKs compostas vinculam baseline, período posterior e alertas ao mesmo workspace. Retirada de qualquer snapshot remove comparação/alertas dependentes. Comparações antigas também seguem cutoff de retenção; portabilidade passa à versão 9.

Transação com lock de workspace serializa criação e dedupe. Repetir a chave original exige o mesmo conteúdo/ator; repetir o mesmo par retorna o artefato canônico sem novos alertas. Chaves alternativas do mesmo par não são armazenadas como aliases. Reconhecer alerta guarda ator/data uma vez, preservando o hash original da comparação.

Manifestos devem confirmar dados sintéticos, pertencer ao workspace e reproduzir o hash do input/resultado. API autenticada, origem verificada, corpo até 8 KiB, campos estritos, rate limit de 30 ações/10 minutos por workspace e respostas privadas sem cache. Export de artefato corrompido é recusado.

Ativação exige `REVORY_AI_SAAS_PREVIEW=true` e `REVORY_AI_MONITOR_REHEARSAL=true`, fora de produção, em **banco local preparado**. Harness aplica migrations somente em PostgreSQL descartável. Preview comum mantém a segunda flag desligada; nenhum banco principal foi migrado. Contratos anteriores de snapshot-input usam RESTRICT: exclusão completa de workspace precisa retirar snapshots antes dos imports; o teste respeita essa ordem, sem mudar FKs históricas.

Google OAuth/NextAuth e demais fluxos de auth, Resend, billing e rotas históricas foram preservados. Shell/nav: **adapt**, sem retirada de rota. Sem deploy, mudanças de secrets, domínio, Stripe/Vercel ou integrações externas.

## Verificação

| Verificação | Resultado |
| --- | --- |
| `npm run qa:ai-integrity-sprint-8` | PASS: identidade temporal, movimentos, deltas assinados exatos, falta de evidência, closure/lag/unit/currency/scope e limite de alertas |
| `npm run qa:ai-integrity-sprint-8:db` | PASS: banco descartável, isolamento/FKs, concorrência, replay/conflito, dedupe de par, reconhecimento/audit, imutabilidade, corrupção de hash, export v9, retenção e cascade |
| `npm run qa:ai-integrity-sprint-8:browser` | PASS: comparação, alerta, reconhecimento, replay/export, no-longer-observed e limitação; auth/origin/campos estritos; desktop/mobile |
| TypeScript, ESLint dos arquivos alterados, Prisma validate, build | PASS |

Evidência: [verification.json](../qa/ai-integrity-sprint8/verification.json), [desktop](../qa/ai-integrity-sprint8/movement-desktop.png), [mobile](../qa/ai-integrity-sprint8/no-longer-observed-mobile.png). O browser usa sessão Google sintética, sem autenticar no provider. Zero erros de console/overflow, conexões reais, scans automáticos, e-mails enviados ou subscriptions criadas.

### Revisão Alice / React

Produto revisado: REVORY AI SaaS, com fontes de autoridade atuais; sem linguagem contractor/MedSpa no monitor. Claims descrevem comparação manual sintética e alertas locais. Sem price mensal publicado, fake activity, ROI, dinheiro recuperado ou customer-level margin. Tokens/logo/fontes do shell preservados; desktop/mobile revisados visualmente.

React: dados independentes consultados em paralelo; cliente recebe apenas IDs/labels, sem manifestos. Inputs nativos com labels, disabled/busy e mensagens de status; request key mantida durante falha; ausência de effects para estado derivado. SDKs/Prisma permanecem no servidor.

## Pendências para concluir a Sprint 08 completa

1. Concluir conexão OpenAI real na Sprint 07: transporte, credenciais protegidas, permissões/revogação, limites/falhas e equivalência com export do mesmo período.
2. Integrar explicitamente fontes conectadas ao intake/mapping/motor; implementar execução recorrente com consentimento, desligamento, recuperação de falha, dedupe e orçamento por workspace.
3. Verificar primeiro/segundo reads reais e valor recorrente com compradores, incluindo falsos positivos e fricção self-service.
4. Validar política de dados, privacy/legal/ops e suporte; especificar entrega/opt-out dos alertas externos antes de usar Resend para monitoramento.
5. Resolver Stripe por último conforme direção do fundador: sandbox pontual, conexão de dados Stripe e assinatura/entitlements/cancelamento de monitoramento. Nenhum desses contratos foi concluído pelo ensaio.

O [runbook local](../validation/SPRINT_08_MONITORING_REHEARSAL_RUNBOOK.md) registra dados, operação e critérios de beta. Não constitui contrato legal aprovado ou autorização de análise gratuita real. Sprint 09 continua sendo gate de lançamento.
