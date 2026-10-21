# REVORY AI SaaS — runbook de liberação controlada

Estado em 2026-10-02: **rascunho operacional, NO_GO**. Aplica-se ao novo produto AI SaaS; o runbook existente de Quote Recovery não é evidência de liberação dele. O fundador é o responsável final por produto, dados, cobrança, suporte e incidente até delegação explícita. Este texto não autoriza deploy nem muda integrações.

## Pacote de decisão

Antes de marcar `GO`, reunir no mesmo registro: versão/commit e ambiente alvo; responsáveis; evidências datadas para cada gate da [Sprint 09](../sprints/SPRINT_09_AI_SAAS_LAUNCH_PREPARATION_2026-10-02.md); preço/escopo aceitos; resultados de testes; riscos remanescentes; decisão assinada e plano de reversão. Rodar `npm run qa:ai-integrity-sprint-9` novamente após atualizar o produto. Enquanto o script indicar o estado local atual ou faltar evidência externa, manter `NO_GO`. O JSON gerado é um snapshot local; não deve ser editado para declarar produção pronta.

## Sequência de liberação

1. **Dados e segurança:** validar fonte, permissão read-only, armazenamento/revogação de credenciais, isolamento por workspace, idempotência, retenção/export e supressão de claims quando cobertura insuficiente. Aprovar privacy, security, termos, consentimento e subprocessadores para dados AI SaaS.
2. **Cobrança e oferta:** verificar checkout pontual no sandbox real, webhook/refund/entitlement e piloto pago. Só depois testar oferta recorrente, renovação/cancelamento e Price IDs próprios. Confirmar que scan pontual não inicia assinatura e que dados do cliente não recebem análise gratuita.
3. **Experiência pública:** trocar home/start/demo e metadados apenas quando o fluxo completo estiver pronto; revisar limitações e documentos públicos. Testar desktop/mobile, marca premium, acessibilidade básica, links, robots e ausência de linguagem contractor no percurso novo. Preservar dados/rotas antigas até substituição aprovada.
4. **Operação no alvo:** confirmar migrations e backup/restore; testar login Google, e-mail/senha, verificação/reset, sessão, workspace, Resend, health, logs e alertas de erro. Anotar proprietário e canal de suporte. Fazer smoke test completo com compra, import/conexão, mapping, scan, finding, export, histórico e cancelamento quando aplicável.
5. **Lançamento restrito:** liberar primeiro a um grupo explicitamente definido e acompanhar falhas, cobertura, tempo até valor, tickets e refunds. Expandir só com evidência de uso independente e sem incidentes materiais.

## Suporte self-service

Documentar antes da liberação: quais dados/escopos são necessários; como exportar o ledger interno; como revisar IDs, período, unidade e moeda; o que significam `Unattributed` e dados insuficientes; como corrigir mapping; como revogar acesso, excluir/exportar dados, pedir refund e cancelar monitoramento. Respostas assíncronas e incidentes têm dono e tempo de resposta declarados no ambiente comercial. Nenhuma call obrigatória deve ser pré-requisito para comprar ou obter o primeiro resultado. Medir quando a pessoa precisou de ajuda em vez de mascarar a intervenção como self-service.

## Métricas com denominadores

Definir eventos e retenção mínima com revisão de privacidade antes de instrumentar. Evitar payloads financeiros, chaves, PII ou conteúdo de findings em telemetria. Contar uma única vez por workspace elegível, com período e exclusões explícitos:

| Medida | Numerador / denominador | Decisão que informa |
| --- | --- | --- |
| Conversão da oferta | Workspaces que concluíram compra / workspaces que iniciaram checkout | Clareza de oferta e fricção de pagamento; excluir testes/sandbox. |
| Ativação independente | Workspaces pagos que exportaram ou revisaram primeiro finding sem intervenção obrigatória / workspaces pagos elegíveis | Se o percurso realmente funciona sem call. |
| Tempo até valor | Distribuição do tempo compra → primeiro resultado elegível, incluindo falhas e abandonos separadamente | Fricção de upload, conexão, mapping e scan. |
| Qualidade de dados | Workspaces com scan elegível / workspaces que começaram intake, com motivos de bloqueio | Cobertura e onboarding, sem inflar precisão. |
| Utilidade e precisão | Findings materiais aceitos, rejeitados ou limitados / findings materiais revisados; registrar revisores e não-respostas | Correção do motor e comunicação. |
| Recorrência | Workspaces com dois reads reais úteis / workspaces inscritos e elegíveis ao segundo read | Justificativa para assinatura; não contar ensaio sintético. |
| Suporte/segurança | Tickets, incidentes, revogações e refunds por coorte paga, com motivo e tempo de resolução | Decidir pausar, corrigir ou expandir. |

Analytics/SpeedInsights existentes são infraestrutura genérica. Nenhuma das medidas acima está validada hoje como funil AI SaaS real. Registrar fonte de evento, consentimento, janela, dedupe e exclusões no momento da implementação.

## Incidente e reversão

Pausar novas compras/conexões e expansão se houver acesso entre workspaces, leitura além do escopo consentido, credencial exposta, cobrança errada, duplicação financeira, finding material sem evidência, perda/corrupção de dados ou falha de revogação. Preservar logs/evidência com acesso restrito, identificar workspaces afetados, comunicar pelo canal acordado e corrigir causa antes de retomar. Reverter o deploy pela versão anterior validada; não executar rollback destrutivo de schema/dados sem plano testado. Desligar tarefas recorrentes e revogar tokens quando o incidente exigir. Verificar novamente auth, cobrança, isolamento e exports após reversão. O procedimento concreto e tempos de resposta dependem do ambiente alvo e precisam de ensaio antes do `GO`.
