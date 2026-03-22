# REVORY QA Funcional Autenticado - 2026-03-21

## Resumo executivo

- Status final da rodada: aprovado no escopo funcional autenticado solicitado.
- Ambiente validado: `http://localhost:3000` com sessão Clerk real.
- Evidência principal: `.tmp/qa-functional-final/2026-03-21T22-28-30-195Z/results.json`.
- Resultado da última execução: todos os cenários do runner passaram.

## Escopo e metodologia

- Fluxos autenticados validados em browser real com Playwright:
  - sign up
  - sign in
  - onboarding wizard completo
  - ativação final
  - acesso a dashboard
  - acesso a imports
  - refresh
  - novo login e retorno a dashboard/imports
- Import UI validado em browser até seleção do arquivo e preview/mapeamento assistido.
- Persistência de import, CSV inválido, rejeição parcial e reimportação foram validadas no mesmo workspace autenticado usando o stack real de importação da aplicação:
  - `validateCsvStructure`
  - `parseCsvByTemplate`
  - `registerCsvUploadMetadata`
  - `persistCsvImport`
- Verificação complementar executada durante a rodada:
  - `npm run typecheck`

## O que passou

- Sign up renderizou corretamente e criou conta real.
- O usuário autenticado foi sincronizado localmente com `workspace` em estado `DRAFT`.
- O onboarding completo persistiu template `MEDSPA`, source path, canal primário, Google Reviews URL e `MODE_B`.
- A ativação final concluiu corretamente e levou ao dashboard.
- O dashboard autenticado abriu após ativação com `workspace.status = ACTIVE`.
- A área de imports abriu autenticada após a ativação.
- A UI de imports reconheceu o CSV de appointments, exibiu nome do arquivo e preview de mapping assistido.
- O import válido de appointments persistiu 3 appointments, 3 clients, 1 canceled e receita base de `670` ao final da rodada combinada.
- O import válido de clients elevou a base para 6 clients antes da rodada parcial.
- O CSV inválido foi rejeitado sem alterar contagens persistidas.
- O cenário de rejeição parcial importou 1 linha válida e isolou 1 linha inválida.
- A reimportação do mesmo CSV não duplicou appointments nem clients.
- O dashboard passou a refletir dados reais persistidos: 4 appointments, 7 clients, 2 upcoming, 1 canceled e receita monitorada de `$670.00`.
- O refresh preservou o estado autenticado.
- Um novo login em novo contexto restaurou acesso ao dashboard e à página de imports com os dados persistidos visíveis.

## O que falhou durante a campanha

- Nenhum cenário ficou falhando na execução final.
- Durante a campanha, antes das correções, falharam:
  - submit de import por erro de runtime em arquivo `"use server"`
  - CTA final do onboarding divergente do contrato esperado
  - tela de imports exibindo a source errada de appointments após importações reais
  - dashboard exibindo source interna `primary-source` como se fosse import pendente
  - runner de re-login sem tratamento robusto do segundo fator do Clerk

## Bugs encontrados

- `C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/actions.ts`: arquivo `"use server"` estava exposto a um export não assíncrono durante o fluxo de import, quebrando o submit.
- `C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/[step]/page.tsx#L201`: o último passo do onboarding ignorava `step.ctaLabel` e forçava `"Continue to dashboard"`.
- `C:/Users/hriqu/Documents/revory-mvp/services/imports/get-csv-upload-sources.ts#L12`: a busca de sources por tipo podia escolher `primary-source` em vez do upload real.
- `C:/Users/hriqu/Documents/revory-mvp/services/dashboard/get-dashboard-overview.ts#L104`: o bloco de import readiness do dashboard também incluía source interna do onboarding, gerando ruído visual e status inconsistente.

## Bugs corrigidos

- Corrigido o estado inicial do upload para não sair de um arquivo `"use server"`:
  - `C:/Users/hriqu/Documents/revory-mvp/types/imports.ts#L131`
  - `C:/Users/hriqu/Documents/revory-mvp/components/imports/CsvUploadCard.tsx#L22`
- Corrigido o CTA final do onboarding para respeitar o label configurado:
  - `C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/[step]/page.tsx#L201`
- Centralizada a definição das sources reais de upload:
  - `C:/Users/hriqu/Documents/revory-mvp/services/imports/csv-upload-source-config.ts#L1`
- Corrigida a tela de imports para priorizar somente as sources reais de upload:
  - `C:/Users/hriqu/Documents/revory-mvp/services/imports/get-csv-upload-sources.ts#L12`
- Corrigido o dashboard para não exibir `primary-source` como import pendente:
  - `C:/Users/hriqu/Documents/revory-mvp/services/dashboard/get-dashboard-overview.ts#L104`

## Riscos restantes

- A rodada final validou o fluxo autenticado real no browser e a camada real de importação no mesmo workspace, mas não executou todos os cenários de import edge-case via clique completo de UI até o submit final. O contrato de back-end ficou validado; a cobertura full browser desses edge cases ainda é desejável.
- `primary-source` continua existindo no banco como metadata de onboarding. A UI foi corrigida por filtragem nominal das upload sources. Se outra tela futura consultar apenas por `DataSourceType`, a inconsistência pode reaparecer.
- Esta validação funcional foi feita em ambiente local `next dev` em `localhost:3000`. Ela não substitui um smoke final em ambiente de build/start equivalente ao deploy.

## Conclusão sobre Sprint 1 e Sprint 2

- Sprint 1: funcionalmente validada.
- Sprint 2: funcionalmente validada no escopo desta rodada.
- Ressalva objetiva: a validação de imports complexos foi concluída sobre o stack real da aplicação no mesmo workspace autenticado, mas não como automação 100% click-by-click para todos os edge cases de UI.
