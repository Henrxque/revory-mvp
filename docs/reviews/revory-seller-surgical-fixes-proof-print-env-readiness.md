# REVORY Seller — Surgical Fixes for Proof Print and Env Readiness

## 1. Problemas reproduzidos

Executive Proof Summary print flow:

- Reproduzido no browser via Playwright.
- `Copy summary` funcionava.
- `Print or save PDF` abria uma janela `about:blank` vazia.
- A UI exibia `Copy failed`, mesmo o erro não sendo de copy.
- A causa reproduzida foi o uso de `window.open("", "_blank", "noopener,noreferrer,...")` seguido de `popup.document.write(...)`. Com `noopener`, o browser pode abrir a janela sem permitir uma referência utilizável para escrita do documento.

Env readiness:

- Reproduzido com `npm run env:check`.
- O comando falhava com 2 migrations pendentes:
  - `20260415000100_sprint_13_lead_intake_routing`
  - `20260415000200_sprint_13_handoff_opened_alignment`
- O banco local já tinha a estrutura dessas migrations:
  - tabela `lead_booking_opportunities` presente
  - enum `LeadBookingOpportunityStatus` presente
  - coluna `handoffOpenedAt` presente
  - coluna antiga `handoffPreparedAt` ausente
- O problema real era histórico de migrations não registrado, não ausência estrutural de schema.

## 2. Correção do Executive Proof Summary print flow

Causa real encontrada:

- O fluxo tentava abrir `about:blank` com `noopener/noreferrer` e depois escrever HTML no popup.
- Esse padrão é frágil porque a referência retornada por `window.open` pode vir nula ou inutilizável quando `noopener` está ativo.
- A UI reaproveitava o mesmo estado de erro de copy para erro de print, gerando mensagem falsa de `Copy failed`.

Arquivos alterados:

- `components/proof/ExecutiveProofSummarySheet.tsx`

Solução aplicada:

- O HTML printável continua sendo gerado no client, mas agora vira um `Blob`.
- O botão abre uma `blob:` URL diretamente, em vez de abrir `about:blank` e tentar escrever no documento.
- O popup usa features simples de janela (`width=1180,height=860`) para manter referência confiável.
- O object URL é revogado depois de 60 segundos.
- O estado visual separa erro de copy de erro de print:
  - `copied`
  - `copy-error`
  - `print-error`
- `Print or save PDF` não dispara mais `Copy failed`.

Como o fluxo ficou funcionando:

- `Copy summary` copia o resumo e mostra `Summary copied`.
- `Print or save PDF` abre uma versão printável em URL `blob:http://localhost...`.
- A versão printável contém a Executive Proof Summary curta, limpa e com toolbar de print.
- Não abre `about:blank` vazio.
- Não aparece erro falso de `Copy failed`.

## 3. Correção do env:check / migrations

Causa real encontrada:

- As duas migrations da Sprint 13 estavam presentes no repositório e já refletidas no banco local.
- A tabela `_prisma_migrations` não tinha registros para essas duas migrations.
- Isso fazia o protocolo reportar `Pending migrations: 2`, apesar de o schema funcional já existir.

Migrations envolvidas:

- `20260415000100_sprint_13_lead_intake_routing`
- `20260415000200_sprint_13_handoff_opened_alignment`

Solução aplicada:

- Antes de resolver, foi verificado que a estrutura já existia no banco.
- As duas migrations foram marcadas como aplicadas com Prisma:
  - `npx prisma migrate resolve --applied 20260415000100_sprint_13_lead_intake_routing`
  - `npx prisma migrate resolve --applied 20260415000200_sprint_13_handoff_opened_alignment`
- Nenhum dado foi apagado.
- Nenhuma migration nova foi inventada.
- Nenhum schema foi alterado para mascarar o problema.

Como o ambiente ficou coerente:

- `npm run env:check` passou com `Pending migrations: 0`.
- `npx prisma migrate status` retornou `Database schema is up to date!`.
- `npm run db:validate` confirmou schema Prisma válido.

## 4. Validação final

Testes executados:

- `npm run typecheck`
- `npm run build`
- `npm run env:check`
- `npx prisma migrate status`
- `npm run db:validate`
- `npm run qa:clean-rerun`
- Browser test da Executive Proof Summary:
  - abriu dashboard autenticado
  - abriu `Share proof`
  - executou `Copy summary`
  - executou `Print or save PDF`
  - validou conteúdo da print view
  - validou ausência de `Copy failed`
  - validou ausência de `Print unavailable`

O que passou:

- `Copy summary` funciona.
- `Print or save PDF` funciona.
- Print view abre em `blob:http://localhost...`, não em `about:blank` vazio.
- A versão printável contém `Executive proof` e botão `Print or save PDF`.
- Não aparece erro falso de `Copy failed`.
- `env:check` passa.
- Migrations estão alinhadas para o protocolo local.
- Build passa.
- Rerun completo do produto passa.

O que ainda preocupa:

- Nenhuma pendência funcional residual foi encontrada nesses dois pontos.
- A correção de migrations foi aplicada no banco local por `migrate resolve`; em outro ambiente que ainda não tenha a estrutura aplicada, o caminho correto continua sendo aplicar as migrations normalmente, não marcar como aplicadas sem verificação.

## 5. Veredito executivo

Os 2 problemas foram corrigidos de verdade.

O produto ficou mais pronto porque:

- A camada shareable de proof agora tem print/save PDF funcional.
- A UI não mostra mais erro falso de copy.
- O ambiente local voltou ao estado `protocolReady: true`.
- O rerun completo continuou passando depois da correção.

Pendência residual real:

- Nenhuma pendência funcional residual foi identificada nos itens corrigidos.
