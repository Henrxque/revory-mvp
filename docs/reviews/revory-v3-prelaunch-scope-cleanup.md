# REVORY V3 — Prelaunch Scope Cleanup

## 1. Objetivo

Limpar o repositório antes da migração para o REVORY V3 Revenue Leak Detector, removendo código operacional antigo que não está no caminho roteado atual e que poderia reabrir escopo de CRM, reminder engine, recovery workflow ou review automation por acidente.

## 2. O que foi removido agora

- Removida a camada antiga de `confirmation`, `reminder`, `at-risk`, `recovery` e `review-request` classification.
- Removida a antiga camada agregadora `services/operations`, incluindo operational surface, templates e assist de template.
- Removidos componentes antigos `OperationalSurface` e `OperationalTemplatePreviewGrid`, que estavam fora da rota ativa.
- Removidos tipos compartilhados exclusivos dessas camadas antigas.
- Removidos smoke tests executáveis antigos que importavam essas camadas e deixariam o `typecheck` preso a código que não faz parte do V3 Launch V1.

## 3. O que ficou de propósito

- Auth, billing, onboarding, imports, dashboard, booking assistance, proof, Daily Brief, Manual Quick Add, LLM bounded suggested message e Executive Proof Summary ficaram preservados.
- O schema Prisma não foi reduzido nesta limpeza, porque remover modelos/tabelas agora exigiria migration destrutiva e não melhora a prontidão do V3.
- Reviews Markdown antigos ficaram como histórico, mas não devem ser usados como fonte de verdade de produto.

## 4. Racional de escopo

O corte remove código que sugeria execução operacional ampla: confirmation queue, reminder readiness, recovery opportunity e review request automation. Essas ideias podem ser úteis em uma tese futura, mas agora competem com o foco certo do V3 Launch V1: detectar vazamento de receita, explicar risco operacional e mostrar valor executivo sem virar CRM, inbox, BI ou automação ampla.

## 5. Guardrail para próximas sprints

O visual premium atual deve ser reaproveitado nas próximas sprints. A migração para Revenue Leak Detector deve reaproveitar shell, cards, density, dark premium feel e surfaces fortes, evitando redesign geral e evitando ressuscitar a operational surface antiga.

## 6. Veredito executivo

A limpeza foi aprovada como corte seguro de ruído legado. O core atual ficou preservado, enquanto a base antiga que puxava o produto para workflow operacional amplo saiu do caminho de build e de manutenção.

## 7. Validação

- `npm run lint` passou.
- `npm run typecheck` passou.
- `npm run env:check` passou.
- `npm run build` passou.
