# REVORY - Sprint 6 Controlled Execution Framing Review

## Objetivo da etapa
Consolidar o framing da camada operacional para que a REVORY comunique com mais clareza o que é insight, o que é readiness, o que ainda depende do usuário e o que é apenas preparação, sem insinuar engine madura, envio vivo, inbox ou campaign tool.

## Leitura de alinhamento
Pela lente de produto, a camada operacional já era funcional, mas ainda deixava algumas leituras perigosas:
- `Actionable now` e `Prepared to use` ainda podiam soar mais próximos de execução viva do que o MVP realmente sustenta.
- A relação entre signal, preparation, readiness e blocked state ainda aparecia mais por inferência do que por framing explícito.
- O preview de templates ainda precisava reforçar melhor que ele mostra base controlada e não campanha em andamento.

## Decisões de framing adotadas

### 1. Readiness ficou mais honesto
- `Actionable now` virou `Actionable next`
- `Partially actionable` virou `Actionable, with blockers`
- `Detected` virou `Visible`

Essas trocas mantêm valor operacional, mas reduzem a sensação de execução automática já pronta.

### 2. Preparation ficou separado de readiness
Nos templates, os estados passaram a comunicar preparo de base e não “envio pronto”:
- `Prepared to use` virou `Prepared base`
- `Prepared to use, with blockers` virou `Prepared base, with blockers`
- `Prepared for later` virou `Preparation in place`
- `Recommended next` virou `Needs setup first`
- `Detected in model` virou `Visible in model`

### 3. O próximo passo ficou claramente controlado
Na surface operacional:
- `Current priority` virou `Next controlled step`
- `Suggested next action` virou `Next controlled step`

Isso reforça que a REVORY está guiando a próxima decisão do usuário, não executando uma engine madura por trás.

### 4. Preview ficou explicitamente separado de execução
Na message foundation:
- o header passou a falar em `Controlled preparation`
- o título virou `Preview and preparation stay separate.`
- a descrição agora explicita que isso é preparação, não execução de campanha
- `Foundation` virou `Preparation`
- `Status` virou `Readiness`
- `Message preview` virou `Preview`
- bloqueios aparecem como `Blocked by ...`

### 5. A camada operacional ficou mais curta sem perder contexto
- `Category readiness` virou `Signals and readiness`
- o texto do topo agora reforça signal, readiness, blockers e next guided step
- a short list continua curta, mas agora assume explicitamente que é leitura guiada, não queue de trabalho

## O que foi ajustado no produto
- labels da surface operacional
- labels de category cards
- labels de priority items
- labels e descriptions dos template previews
- microcopy explicativa do topo e da focus list
- smoke tests alinhados ao wording novo

## Arquivos alterados
- `components/dashboard/OperationalSurface.tsx`
- `components/dashboard/OperationalTemplatePreviewGrid.tsx`
- `services/operations/build-operational-surface.ts`
- `services/operations/operational-templates.ts`
- `docs/testing/sprint-5-etapa-5-execution-foundation-smoke.ts`

## O que essa etapa deixa mais claro
- `Insight`
  - o sinal existe e ficou visível
- `Readiness`
  - o estado atual da categoria ou item
- `Blocked`
  - ainda existe dependência prática do usuário ou da base
- `Preparation`
  - a base controlada já existe, mas isso não implica engine de envio ao vivo
- `Next controlled step`
  - o próximo passo é guiado e narrow, não uma operação diária pesada

## O que foi intencionalmente evitado
- Não foi criado envio real robusto.
- Não foi criada automação madura.
- Não foi criada campaign history.
- Não foi criado editor livre.
- Não foi criada operação diária pesada.
- Não houve expansão para CRM, inbox ou engine de campanha.

## Validação executada
- `npm run typecheck`
- `npx eslint "components/dashboard/OperationalSurface.tsx" "components/dashboard/OperationalTemplatePreviewGrid.tsx" "services/operations/build-operational-surface.ts" "services/operations/operational-templates.ts" --max-warnings=0`
- `npx tsx docs/testing/sprint-5-etapa-5-execution-foundation-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`
- `npm run build`

## Veredito
- O framing de controlled execution ficou mais claro.
- A camada continua útil, mas mais honesta.
- A REVORY comunica preparação e readiness sem insinuar engine madura ou envio vivo.
- A etapa está aprovada.
