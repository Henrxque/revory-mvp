# REVORY - Sprint 6 QA Operational Regression Review

## Escopo testado
- Camada operacional após os ajustes de linguagem, framing e polish da Sprint 6
- Regressão com a base da Sprint 5
- Coerência entre dashboard, readiness states, blocked states e previews
- Regressão do import assistido e da base operacional derivada

## Cenários executados
- `npm run build`
- `npm run typecheck`
- `npx eslint "components/dashboard/OperationalSurface.tsx" "components/dashboard/OperationalTemplatePreviewGrid.tsx" "services/operations/build-operational-surface.ts" "services/operations/operational-templates.ts" --max-warnings=0`
- `npx tsx docs/testing/assisted-import-edge-cases-smoke.ts`
- `npx tsx docs/testing/sprint-5-etapa-2-operational-state-foundation-smoke.ts`
- `npx tsx docs/testing/sprint-5-etapa-5-execution-foundation-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-3-confirmation-logic-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-4-reminder-logic-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`

## Bugs encontrados

### 1. Inconsistência de semântica no estado inicial de at-risk
- Severidade: média
- Arquivo: `services/operations/build-operational-surface.ts`
- Problema:
  - a Sprint 6 consolidou a linguagem para `Visible` nos estados classificados iniciais, mas o card de `at-risk` ainda cai em `Detected`
- Impacto:
  - enfraquece a consistência da taxonomia operacional
  - gera leitura diferente justamente na categoria que mais chama atenção
- Risco:
  - a camada parece menos consolidada do que realmente está

### 2. Peso visual de mixed states ainda tende a pender para bloqueio
- Severidade: média
- Arquivo: `components/dashboard/OperationalTemplatePreviewGrid.tsx`
- Problema:
  - quando um preview está em estado misto (`Prepared base, with blockers`), o badge ainda assume `future` por causa de `blockedReason`
- Impacto:
  - a leitura visual pode sugerir “quase tudo bloqueado” mesmo quando o estado é misto e parte já está preparada
- Risco:
  - conflita parcialmente com o objetivo da Sprint 6 de equilibrar preparação e bloqueio sem dramatizar

### 3. Microcopy de contagem no topo não trata singular/plural
- Severidade: baixa
- Arquivo: `components/dashboard/OperationalSurface.tsx`
- Problema:
  - o badge usa `${n} need review now`
  - com `1`, a frase fica gramaticalmente errada
- Impacto:
  - detalhe pequeno, mas perceptível em produto premium
- Risco:
  - reduz acabamento da interface

## Regressões verificadas
- Nenhuma regressão funcional encontrada no import assistido
- Nenhuma regressão estrutural encontrada na fundação operacional da Sprint 5
- Nenhuma regressão encontrada nos classifiers de confirmation e reminder
- Dashboard continua compilando e a camada operacional continua montando corretamente

## Evidências do que passou
- Import assistido edge cases: `ok`
- Fundação operacional da Sprint 5:
  - casos de `eligible but blocked`
  - `ready for action`
  - `prepared`
  - `not eligible`
  - todos representáveis e passando no smoke
- Surface operacional da Sprint 6:
  - readiness summary consistente
  - category cards presentes
  - template previews presentes
  - build final do app concluído com sucesso

## Riscos e observações
- Os problemas encontrados são de semântica e ênfase visual, não de quebra funcional
- A camada continua honesta e não deriva para CRM/inbox/campaign tool
- Ainda assim, a inconsistência de wording em `at-risk` e o peso visual de mixed state merecem correção para a Sprint 6 ficar realmente limpa

## Recomendação final
- Corrigir os 3 pontos acima em um passe curto
- Não há sinal de escopo inflado
- Não há bloqueador funcional para dashboard, import assistido ou base operacional

## Veredito
- **Aprovado com ressalvas**

Motivo:
- a base funcional está estável
- a honestidade funcional foi preservada
- mas ainda existem pequenas inconsistências de interpretação e acabamento que valem um último ajuste
