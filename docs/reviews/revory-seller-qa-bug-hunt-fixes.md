# REVORY Seller — QA Bug Hunt Fixes

## 1. Problemas reproduzidos

- Open redirect de auth confirmado antes da correção: `/sign-in?redirect_url=%2F%2Fevil.example` e `/sign-up?redirect_url=%2F%2Fevil.example` retornavam `307 Location: //evil.example`.
- `npm run lint` confirmado falhando com 2 errors e 3 warnings:
  - `ExecutiveProofSummarySheet.tsx`: `setState` síncrono dentro de `useEffect`.
  - `app/layout.tsx`: `<a>` interno para `/app/setup`.
  - `dashboard/page.tsx` e `app/layout.tsx`: código não usado.
- Links legais confirmados como falsos: `Privacy` e `Terms` no footer da landing apontavam para `/`.
- Histórico de migrations confirmado incoerente localmente: `npx prisma migrate status` passava, mas `_prisma_migrations` tinha `20260411223208_sprint_12_5_auth_provider_expansion` sem diretório correspondente em `prisma/migrations`.

## 2. Correção do open redirect de auth

- Causa real: `normalizeAuthRedirectTarget` aceitava qualquer string iniciada por `/`, inclusive URL protocol-relative como `//evil.example`.
- Arquivos alterados:
  - `services/auth/redirects.ts`
- Solução aplicada:
  - Adicionada validação explícita de path interno seguro.
  - `//...` agora cai para fallback seguro.
  - Backslashes são normalizados antes da decisão.
  - Fallback também é validado para evitar propagar fallback inseguro.
  - URLs absolutas externas continuam sendo reduzidas para path interno, sem sair do domínio.
- Validação final:
  - `/sign-in?redirect_url=%2F%2Fevil.example` retorna `Location: /app`.
  - `/sign-up?redirect_url=%2F%2Fevil.example` retorna `Location: /app`.
  - `/sign-in?redirect_url=%2Fapp%2Fimports` continua retornando `/app/imports`.
  - `/sign-up?redirect_url=%2Fapp%2Fdashboard` continua retornando `/app/dashboard`.
  - `redirect_url` vazio continua caindo para `/app`.

## 3. Correção do lint

- Erros reais encontrados:
  - `components/proof/ExecutiveProofSummarySheet.tsx`: estado `canShare` era setado imediatamente dentro de `useEffect`.
  - `src/app/(app)/app/layout.tsx`: navegação interna usava `<a>` em vez de `Link`.
  - `src/app/(app)/app/layout.tsx`: helper/variável não usados.
  - `src/app/(app)/app/dashboard/page.tsx`: `SignalCard` não usado.
- Arquivos alterados:
  - `components/proof/ExecutiveProofSummarySheet.tsx`
  - `src/app/(app)/app/layout.tsx`
  - `src/app/(app)/app/dashboard/page.tsx`
- Solução aplicada:
  - Removido estado `canShare`; o suporte a `navigator.share` agora é checado no clique.
  - Botão de share mantém fallback para copiar quando o browser não suporta Web Share.
  - Trocado `<a href="/app/setup">` por `Link`.
  - Removidos helper, variável e componente não usados.
- Validação final:
  - `npm run lint` passou.
  - `npm run typecheck` passou.
  - `npm run build` passou.
  - Executive Proof Summary copy/print continuou passando no harness hands-on.

## 4. Correção dos links legais

- Decisão tomada: criar páginas legais mínimas reais em vez de remover links. Isso corrige a affordance falsa sem abrir feature operacional.
- Arquivos alterados:
  - `src/app/page.tsx`
  - `src/app/privacy/page.tsx`
  - `src/app/terms/page.tsx`
- Solução aplicada:
  - Footer agora aponta `Privacy` para `/privacy`.
  - Footer agora aponta `Terms` para `/terms`.
  - Criadas páginas estáticas mínimas, honestas e narrow:
    - Privacy explica uso de dados para operação do software, workspace, imports, billing e assistência bounded.
    - Terms explicita que Seller não é CRM, inbox, BI, automação ampla ou managed service.
- Validação final:
  - `/privacy` retorna `200` e renderiza `REVORY Privacy Notice`.
  - `/terms` retorna `200` e renderiza `REVORY Seller Terms`.
  - Landing agora expõe links `/privacy` e `/terms`.
  - `npm run build` incluiu `/privacy` e `/terms` como páginas estáticas.

## 5. Reconciliação do histórico de migrations

- Causa real encontrada: o banco local tinha uma migration histórica registrada em `_prisma_migrations` que não existia mais no repositório. O schema real não dependia dela como migration separada.
- Solução aplicada:
  - Antes da limpeza, foi validado que o banco e o datamodel estavam alinhados com `prisma migrate diff`, retornando migration vazia.
  - Removido apenas o registro local fantasma `20260411223208_sprint_12_5_auth_provider_expansion` da tabela `_prisma_migrations`.
  - Nenhuma tabela, coluna, índice ou dado de produto foi alterado.
- Impacto no ambiente:
  - O banco local agora tem 9 migrations registradas.
  - O diretório `prisma/migrations` também tem 9 migrations reais.
  - Não há migrations `db-only` nem `file-only`.
- Validação final:
  - `npx prisma migrate status` passou.
  - `npm run env:check` passou.
  - `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` retornou migration vazia.

## 6. Validação final consolidada

- Testado:
  - Auth redirect malicioso e redirects internos legítimos.
  - Lint.
  - Typecheck.
  - Build.
  - Env readiness.
  - Prisma migrate status.
  - Prisma schema diff.
  - Legal pages.
  - Clean rerun de onboarding/setup/import/dashboard.
  - Full Product QA harness com landing, pricing, app autenticado, Quick Add, blocked reason, conflito de identidade, proof copy/print e migration parity.
- Passou:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run env:check`
  - `npx prisma migrate status`
  - `npm run qa:clean-rerun`
  - `.tmp/manual-audit/full-product-qa/run-full-product-qa.mjs`
- O que ainda preocupa:
  - O harness QA em `.tmp` é útil como evidência local, mas ainda não é um teste formal versionado.
  - O ambiente local segue com worktree sujo de tarefas anteriores; isso não é regressão destas correções, mas precisa ser considerado antes de commit/release.

## 7. Veredito executivo

- Os problemas foram corrigidos de verdade.
- O produto ficou mais pronto porque removeu o risco crítico de open redirect, restaurou readiness de lint/CI, eliminou links legais falsos e alinhou o histórico local de migrations com o repo.
- Não sobrou pendência residual real dentro do escopo desta correção. O próximo passo seguro não é feature nova; é manter esses checks rodando antes de demo/release.
