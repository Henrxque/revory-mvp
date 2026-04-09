# sprint12-etapa6-review

## objetivo da etapa

Melhorar a repeatability do rerun limpo do REVORY Seller com o menor nivel de harness necessario para repetir login, onboarding, imports e leitura final do dashboard com mais previsibilidade.

## diagnostico anterior

Antes desta etapa, o rerun dependia de um script util, mas ainda frágil em tres pontos:

- fixtures guardadas em `.tmp`, sem status claro de artefato confiavel de repo
- ausencia de verificacao final explicita contra um resultado esperado
- evidencias antigas e usuarios antigos podiam contaminar a leitura do rerun

Ou seja: o fluxo podia passar, mas ainda dependia demais de comparacao visual e de memoria do ultimo estado saudavel.

## melhorias implementadas

Foi criada uma camada minima de repeatability:

1. fixtures estaveis no repo em `scripts/fixtures/clean-rerun`
2. manifest de expectativa em `expected-results.json`
3. script oficial de rerun em `npm run qa:clean-rerun`
4. limpeza de evidencias antigas antes de cada execucao
5. limpeza de usuarios/workspaces anteriores do mesmo prefixo QA
6. precheck do app em `/sign-in` antes de iniciar o fluxo
7. verificacao explicita do resultado final contra:
   - plano e billing esperados
   - rows importadas
   - contagem de clients
   - contagem de support clients
   - booked support count
   - booked por mes na fixture de 6 meses

Tambem mantive compatibilidade com o harness anterior: `.tmp/manual-audit/replay-manual-test.mjs` agora delega para o script oficial, em vez de carregar logica paralela.

## arquivos alterados

- [run-clean-rerun.mjs](C:/Users/hriqu/Documents/revory-mvp/scripts/run-clean-rerun.mjs)
- [expected-results.json](C:/Users/hriqu/Documents/revory-mvp/scripts/fixtures/clean-rerun/expected-results.json)
- [appointments-smoke.csv](C:/Users/hriqu/Documents/revory-mvp/scripts/fixtures/clean-rerun/appointments-smoke.csv)
- [clients-smoke.csv](C:/Users/hriqu/Documents/revory-mvp/scripts/fixtures/clean-rerun/clients-smoke.csv)
- [appointments-6mo.csv](C:/Users/hriqu/Documents/revory-mvp/scripts/fixtures/clean-rerun/appointments-6mo.csv)
- [clients-6mo.csv](C:/Users/hriqu/Documents/revory-mvp/scripts/fixtures/clean-rerun/clients-6mo.csv)
- [replay-manual-test.mjs](C:/Users/hriqu/Documents/revory-mvp/.tmp/manual-audit/replay-manual-test.mjs)
- [package.json](C:/Users/hriqu/Documents/revory-mvp/package.json)
- [environment-consistency-protocol.md](C:/Users/hriqu/Documents/revory-mvp/docs/environment-consistency-protocol.md)

## impacto em repeatability

O rerun agora ficou bem mais reproduzivel porque:

- nao depende mais de fixtures temporarias fora de um lugar estavel do repo
- nao depende apenas de screenshot para concluir sucesso
- remove contaminacao basica de runs anteriores
- transforma o fim do fluxo em verificacao objetiva, nao so observacao visual

Na pratica, o estado final passou a ser comparado com uma fixture de resultado esperado, o que melhora muito a confianca no rerun limpo.

## impacto em review reliability

Esta etapa melhora a confianca das reviews porque reduz um risco importante: declarar o produto “saudavel” com base em evidencias de um estado antigo ou contaminado.

Nesta rodada, o novo rerun oficial passou ponta a ponta e gravou evidencias atualizadas em:

- [rerun-results.json](C:/Users/hriqu/Documents/revory-mvp/.tmp/manual-audit/rerun/rerun-results.json)
- [14-dashboard-6mo.png](C:/Users/hriqu/Documents/revory-mvp/.tmp/manual-audit/rerun/14-dashboard-6mo.png)

## riscos remanescentes

- o rerun ainda depende de um dev server local ativo
- ele continua sendo um fluxo happy-path guiado, nao uma matriz grande de cenarios
- se labels de UI mudarem muito, o script ainda precisara ajuste
- o `typecheck` segue sujeito ao ruido transitório de `.next/types` quando rodado antes do `build`

## julgamento final da etapa

**Aprovada.**

O REVORY Seller agora tem um rerun limpo mais repetivel, com fixtures estaveis, cleanup basico e verificacao final objetiva, sem virar harness exagerado nem suite enterprise.
