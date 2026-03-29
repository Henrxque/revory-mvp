# REVORY - Sprint 6 Operational Surface Guardrails Review

## Objetivo da etapa
Reforçar guardrails visuais e de escopo na surface operacional para que a REVORY pareça mais madura, sem ficar mais pesada, mais técnica ou mais próxima de CRM, inbox ou campaign tool.

## Leitura do problema antes do ajuste
- A camada operacional já tinha valor real, mas ainda concentrava badges demais em pontos de alta frequência visual.
- Os cards de categoria e os previews de template ainda se aproximavam de uma leitura de "painel de operação" em vez de extensão natural do dashboard.
- `Readiness`, `message foundation` e `next action` estavam corretos funcionalmente, mas ainda pouco separados visualmente.
- A fila curta seguia controlada, porém a interface ainda pedia um passe para parecer mais calma e mais madura.

## O que foi ajustado

### Hierarquia da camada operacional
- A descrição da section principal foi simplificada para reforçar leitura curta de readiness, blockers e next step.
- O bloco de `Current priority` ganhou suporte textual curto para orientar leitura sem parecer comando operacional.
- Foi adicionada uma separação visual mais clara para `Category readiness`, mantendo a surface dentro do dashboard e não como módulo paralelo.

### Cards de categoria
- Os cards perderam badges secundários que competiam demais com o estado principal.
- `blocked count` e `empty state` passaram para meta discreta em texto, em vez de badge concorrente.
- O bloco inferior foi simplificado em duas colunas:
  - `Status`
  - `Suggested next action`
- `blocked reason` continua visível quando existe, mas com peso mais contido e sem dominar o card.

### Message foundation
- O preview de template perdeu badges redundantes.
- `preview mode` e `live item count` foram movidos para metadata discreta em texto.
- A leitura foi reorganizada em:
  - `Foundation`
  - `Status`
  - `Message preview`
  - `Allowed placeholders`
- O conjunto ficou mais próximo de foundation controlada e menos próximo de ferramenta de campanha.

### Short focus list
- A microcopy acima da lista curta foi simplificada.
- O texto de ordem de leitura foi ajustado para reforçar que a surface não vira queue.
- `blocked reason` segue visível por item, mas agora como suporte ao estado e não como badge principal.

## Por que isso melhora a UX
- Diminui a sensação de densidade sem remover sinal funcional.
- Separa melhor o que é:
  - overview executivo
  - readiness por categoria
  - foundation de mensagem
  - foco curto de leitura
- Mantém a REVORY com cara de produto premium e guiado, não de central operacional pesada.

## O que foi preservado
- Nenhum valor funcional importante foi removido.
- A surface continua mostrando:
  - next action
  - readiness state
  - blocked reason
  - categoria operacional
  - foundation de templates
- O dashboard continua sendo a única superfície principal para essa leitura.

## O que foi intencionalmente evitado
- Não houve redesign do dashboard inteiro.
- Não foi criada nova navegação.
- Não foi criada inbox.
- Não foi criada fila operacional pesada.
- Não foi criado campaign builder.
- Não foi aberta nova feature de ownership ou execução ao vivo.

## Arquivos alterados
- `components/dashboard/OperationalSurface.tsx`
- `components/dashboard/OperationalTemplatePreviewGrid.tsx`

## Validação executada
- `npm run typecheck`
- `npx eslint "components/dashboard/OperationalSurface.tsx" "components/dashboard/OperationalTemplatePreviewGrid.tsx" --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`
- `npm run build`

## Veredito
- Guardrails visuais aplicados com ganho real de clareza.
- A surface parece mais madura, mas não mais pesada.
- O dashboard continua premium, curto e honesto.
- A etapa está aprovada.
