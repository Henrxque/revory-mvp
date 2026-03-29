# REVORY - Sprint 6 QA Fix Pass

## Objetivo
Aplicar o passe curto final de correção da Sprint 6 com base no QA operacional, sem abrir escopo e sem redesenhar a surface.

## Problemas e correções

### 1. Estado inicial de at-risk fora da taxonomia consolidada
- Causa:
  - o card de `at-risk` ainda usava `Detected` enquanto a taxonomia consolidada da Sprint 6 já havia migrado o estado inicial para `Visible`
- Correção aplicada:
  - o estado inicial de `at-risk` foi alinhado para `Visible`
- Arquivo:
  - `services/operations/build-operational-surface.ts`

### 2. Mixed state do template pendendo demais para bloqueio
- Causa:
  - o badge visual do preview usava `future` sempre que existia `blockedReason`, mesmo em estado misto como `Prepared base, with blockers`
- Correção aplicada:
  - o tom do badge deixou de pender automaticamente para bloqueio nesse estado misto
  - `Prepared base, with blockers` agora permanece visualmente mais equilibrado
- Arquivo:
  - `components/dashboard/OperationalTemplatePreviewGrid.tsx`

### 3. Microcopy de singular/plural no topo
- Causa:
  - o topo usava sempre `${n} need review now`, o que quebrava com `1`
- Correção aplicada:
  - foi introduzida uma pequena normalização para singular/plural
- Arquivo:
  - `components/dashboard/OperationalSurface.tsx`

## Validação executada
- `npm run build`
- `npm run typecheck`
- `npx eslint "services/operations/build-operational-surface.ts" "components/dashboard/OperationalTemplatePreviewGrid.tsx" "components/dashboard/OperationalSurface.tsx" --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`
- `npx tsx docs/testing/sprint-5-etapa-5-execution-foundation-smoke.ts`

## Veredito final
- Correções aplicadas com sucesso.
- Sem expansão de escopo.
- A Sprint 6 fica mais consistente e mais polida.
