# Activation Setup Layout Fix

## Causa do bug

O layout de `/app/setup` estava usando uma divisão de grid muito próxima de 50/50 sem proteção suficiente contra conteúdo longo. Quando um valor extenso, especialmente a URL de `Reviews destination`, entrava na coluna principal, ele aumentava a largura mínima efetiva do card e pressionava a coluna de `Pending items`, deixando a lateral espremida e visualmente quebrada.

## Correção aplicada

- Rebalanceado o grid principal da página para dar mais estabilidade entre coluna principal e coluna lateral.
- Adicionado `min-w-0` e `overflow-hidden` nos blocos críticos para impedir que conteúdo interno force expansão indevida.
- Ajustados os headers e cards internos para aceitarem encolhimento sem quebrar a hierarquia visual.
- Aplicada contenção específica para textos longos.
  - URLs agora usam um container próprio com `overflow-wrap:anywhere`.
  - conteúdos textuais usam `break-words` e `title` para preservar leitura e informação.
- Mantido o visual premium e escuro sem redesign desnecessário.

## Arquivo alterado

- `src/app/(app)/app/setup/page.tsx`

## Validação executada

- `npx eslint "src/app/(app)/app/setup/page.tsx" --max-warnings=0`
- `npm run build`
- `npm run typecheck`

## Veredito final

A página de Activation Setup ficou estruturalmente estável com conteúdo real e longo, sem esmagar a coluna lateral e sem estourar os cards. A correção foi contida, funcional e coerente com o padrão visual premium da REVORY.
