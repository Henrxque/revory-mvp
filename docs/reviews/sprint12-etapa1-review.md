# Sprint 12 — Etapa 1 Review

## objetivo da etapa
Auditar e corrigir a integridade entre `schema.prisma`, histórico de migrations, banco local real e dependências da camada de dashboard/attribution, atacando a causa real do erro de runtime em vez de mascarar o sintoma.

## diagnóstico do problema encontrado
O novo teste manual encontrou um erro crítico no dashboard:

- `PrismaClientKnownRequestError`
- coluna ausente: `clients.hasLeadBaseSupport`

Esse erro aparecia no runtime da Revenue View ao carregar a camada de attribution/renewal defense, mesmo com o código e o schema já esperando esse campo.

Evidência objetiva do estado quebrado:
- screenshot anterior ao fix: `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\14-dashboard-6mo.png`
- query de `information_schema.columns` antes do fix: a tabela `clients` não tinha `hasLeadBaseSupport`
- `npx prisma migrate status` antes do fix: a migration `20260408000100_sprint_10_tracking_attribution_hardening` aparecia como não aplicada

## causa raiz
A causa raiz não estava no dashboard nem no schema.

O drift real era este:
- `prisma/schema.prisma` já continha `Client.hasLeadBaseSupport`
- a migration correspondente já existia em `prisma/migrations/20260408000100_sprint_10_tracking_attribution_hardening/migration.sql`
- o banco local ainda estava parado na Sprint 09
- por isso, o código consultava uma coluna que nunca tinha sido criada fisicamente no banco

Em outras palavras: houve drift entre `schema + migrations versionadas` e `estado efetivo do banco local`.

## correções realizadas
1. Auditei o schema atual e confirmei que `hasLeadBaseSupport` estava definido corretamente em `Client`.
2. Auditei o histórico de migrations e confirmei que a migration da Sprint 10 continha exatamente o SQL esperado:
   - `ALTER TABLE "clients" ADD COLUMN "hasLeadBaseSupport" BOOLEAN NOT NULL DEFAULT false;`
3. Consultei o estado real do banco via `information_schema.columns` e via `_prisma_migrations`.
4. Identifiquei que a migration `20260408000100_sprint_10_tracking_attribution_hardening` estava faltando no banco local.
5. Apliquei a migration real com:
   - `npx prisma migrate deploy`
6. Revalidei o banco:
   - `_prisma_migrations` passou a registrar a migration como aplicada
   - `clients.hasLeadBaseSupport` passou a existir fisicamente no banco
7. Revalidei o runtime:
   - o dashboard voltou a abrir sem o erro de Prisma
   - evidência pós-fix: `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\dashboard-after-migration.png`

## arquivos alterados
Arquivos de código do app: nenhum.

Arquivos e estados efetivamente impactados:
- migration já existente aplicada no banco:
  - `C:\Users\hriqu\Documents\revory-mvp\prisma\migrations\20260408000100_sprint_10_tracking_attribution_hardening\migration.sql`
- histórico do banco atualizado em:
  - tabela `_prisma_migrations`
- schema físico do banco atualizado em:
  - tabela `clients`
- review gerado em:
  - `C:\Users\hriqu\Documents\revory-mvp\docs\reviews\sprint12-etapa1-review.md`

## impacto em runtime reliability
Alto e direto.

Antes:
- o dashboard podia quebrar em ambiente limpo mesmo com build/lint/typecheck passando
- isso comprometia confiança operacional e reprodutibilidade

Depois:
- banco, schema e histórico de migrations voltaram a convergir
- a camada de dashboard deixou de depender de um campo “esperado só no código”
- o runtime voltou a abrir a Revenue View sem o erro crítico encontrado no teste manual

## impacto em dashboard integrity
Alto.

Essa correção reabilita a camada de attribution/renewal defense exatamente onde a Sprint 10 e a Sprint 11 reforçaram valor percebido e retenção. Sem ela, a leitura econômica do produto ficava quebrada na parte mais importante da defesa comercial. Com ela, o dashboard volta a ficar coerente com a modelagem prometida.

## riscos remanescentes
- O problema foi corrigido no banco local atual, mas o time ainda depende de disciplina para aplicar migrations sempre que houver evolução de schema.
- Como o drift era operacional, não conceitual, o risco residual maior está em ambiente novo que suba sem `prisma migrate deploy`.
- O `db pull --print` durante a auditoria não foi a melhor fonte de verdade para validar o campo; as fontes mais confiáveis foram:
  - `information_schema.columns`
  - `_prisma_migrations`
  - runtime real do dashboard

## julgamento final da etapa
**Aprovada.**

A etapa encontrou a causa real do drift, corrigiu o banco de forma reproduzível e devolveu integridade entre schema, migrations, banco e dashboard sem workaround superficial.

Validação final executada:
- `npx prisma migrate status` -> banco em dia
- `npm run db:validate` -> passou
- `npm run db:generate` -> passou
- `npm run lint` -> passou
- `npm run typecheck` -> passou
- `npm run build` -> passou
