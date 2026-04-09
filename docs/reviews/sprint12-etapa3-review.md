# Sprint 12 — Etapa 3 Review

## objetivo da etapa
Garantir que a jornada limpa `import -> dashboard` do REVORY Seller funcione de ponta a ponta de forma reproduzível, sem depender de estado contaminado, timing acidental de UI ou acoplamentos invisíveis no rerun.

O alvo explícito desta etapa foi validar, em workspace novo:
- import de `Booked proof`
- import de `Lead base`
- leitura do dashboard
- `Renewal read`
- `Retention defense`

## diagnóstico anterior
Antes desta etapa, a jornada limpa parecia inconsistente mesmo depois da correção de schema:
- o rerun anterior terminava com `appointments-6mo.csv` importado
- a lane de `Lead base` ficava parada em `clients-smoke.csv`
- o resultado final sugeria que o fluxo ainda não era confiável de ponta a ponta

O problema é que essa inconsistência misturava duas coisas:
- uma falha real anterior de integridade de banco já corrigida na Etapa 1
- um acoplamento invisível no próprio harness de rerun, que avançava antes do import certo terminar e clicava ações na lane errada

## quebras encontradas
### 1. Espera genérica demais no rerun
O helper de upload esperava apenas o texto `Rows reviewed`.

Isso era frágil porque:
- esse texto continuava visível na tela depois do upload anterior
- o script podia considerar um novo import “concluído” sem ter esperado o arquivo atual realmente finalizar

### 2. Clique não escopado por lane
O helper clicava o primeiro botão `Open review` / `Continue review` da página inteira.

Em `Booking Inputs`, isso criava um acoplamento invisível:
- após importar `Booked proof`, o script ainda via o botão da lane principal
- ao tentar confirmar `Lead base`, ele acabava acionando a lane errada

### 3. Navegação frágil em `next dev`
O rerun usava `networkidle` em dev server.

Com `Next.js + Turbopack`, isso é mais frágil do que parece e pode gerar falso negativo no início do fluxo, sem ser defeito real do produto.

## mudanças realizadas
### 1. Hardening do rerun de ponta a ponta
Atualizei o script de rerun em:
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\replay-manual-test.mjs`

Mudanças:
- troquei navegação crítica para um helper `gotoStable()` com `domcontentloaded + load`
- aumentei timeouts da espera de URL
- removi dependência de `networkidle` no fluxo central

### 2. Espera específica por arquivo atual
O helper de upload agora espera pelo nome do arquivo atual dentro da lane antes de seguir.

Isso elimina o falso positivo causado por texto residual de upload anterior.

### 3. Escopo por lane
O helper agora resolve o container da lane correta a partir do próprio `input[type="file"]` e executa:
- `Open review`
- `Confirm and make visible`
- validações de resultado

sempre dentro da lane certa.

Isso removeu o acoplamento invisível entre:
- lane principal (`Booked proof`)
- lane secundária (`Lead base`)

### 4. Rerun limpo reexecutado com workspace novo
Rodei novamente o fluxo completo do zero com usuário/workspace novos e billing ativo em `Growth`.

## arquivos alterados
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\replay-manual-test.mjs`
- `C:\Users\hriqu\Documents\revory-mvp\docs\reviews\sprint12-etapa3-review.md`

## impacto em rerun reliability
Alto.

Antes:
- o rerun parecia falhar parcialmente
- parte do erro era causada pelo próprio harness
- a evidência final não era confiável o suficiente para julgamento duro de produto

Depois:
- o rerun limpa um workspace novo
- executa onboarding
- importa `Booked proof`
- importa `Lead base`
- abre dashboard final
- persiste estado coerente no banco

## impacto em proof reproducibility
Alto.

Estado final validado em workspace novo:
- `appointments-csv-upload`
  - `status: IMPORTED`
  - `lastImportFileName: appointments-6mo.csv`
  - `successRows: 72`
- `clients-csv-upload`
  - `status: IMPORTED`
  - `lastImportFileName: clients-6mo.csv`
  - `successRows: 196`
- `clientsCount: 200`
- `supportClients (hasLeadBaseSupport): 200`
- `supportedBooked: 62`

Isso prova que a jornada limpa agora sustenta:
- booked proof
- lead-base support
- dashboard revenue read
- renewal layer
- retention layer

sem depender de estado anterior contaminado.

## riscos remanescentes
- O fluxo limpo agora é reproduzível, mas ainda depende de ambiente local corretamente migrado e com auth/billing mínimos coerentes.
- O harness de rerun fica em `.tmp/manual-audit`, então ele é prova operacional local, não infraestrutura formal de CI.
- A existência de `primary-source` pendente no banco continua sendo um detalhe do modelo atual de `DataSource`, não um bloqueio do fluxo validado.

## julgamento final da etapa
**Aprovada.**

A inconsistência restante da jornada limpa não vinha mais do produto central, e sim de acoplamentos invisíveis no próprio rerun. Após corrigir esse ponto, o fluxo `Booked proof -> Lead base -> Dashboard` voltou a fechar de forma reproduzível em workspace novo.

## validação executada
### Rerun limpo completo
Script executado:
- `node C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\replay-manual-test.mjs`

Evidências geradas:
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\00-start-auth.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\07-imports-empty.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\12-imports-appointments-6mo.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\13-imports-clients-6mo.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\14-dashboard-6mo.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\rerun-results.json`

### Validação técnica
- `npm run lint` passou
- `npm run typecheck` passou
- `npm run build` passou
