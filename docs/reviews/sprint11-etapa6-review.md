# Sprint 11 - Etapa 6 Review

## Objetivo da etapa
Melhorar o in-app plan value signaling para que a hierarquia de planos fique mais clara dentro do proprio produto, sem criar tres produtos Frankenstein, sem exagerar no gating e sem transformar o app em brochure de pricing.

## Diagnostico anterior
Antes desta etapa, o app ja tinha uma boa hierarquia de planos em `/start`, mas o sinal de valor ainda era concentrado demais no momento da compra. Faltavam dois elementos:

- uma leitura curta do valor do plano ja dentro do shell
- um signal mais explicito do "why this plan" nas cards de billing

Na pratica, isso deixava o `Growth` bem defendido na narrativa geral, mas ainda pouco sinalizado de forma nativa dentro do produto.

## Mudancas realizadas
- Adicionei `inAppSignal` e `valueSignal` ao catalogo oficial de planos.
- Passei a usar esses sinais no shell autenticado para mostrar o plano atual como parte da leitura de conta, sem criar bloco novo nem chrome excessivo.
- Reforcei o card `Current billing` em `/start` com a leitura curta do plano atual.
- Adicionei um signal de valor visivel em cada card de plano em `/start`, logo abaixo do framing principal.
- Mantive `Growth` como plano que melhor emerge naturalmente, sem bloquear nem rebaixar `Basic` e sem inflar `Premium`.

## Arquivos alterados
- [billing.ts](/C:/Users/hriqu/Documents/revory-mvp/types/billing.ts)
- [workspace-billing.ts](/C:/Users/hriqu/Documents/revory-mvp/services/billing/workspace-billing.ts)
- [layout.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/layout.tsx)
- [page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/start/page.tsx)

## Impacto em plan signaling
O produto agora deixa mais claro o que cada plano representa sem precisar abrir uma tela nova ou explicar pricing em excesso.

O efeito mais importante foi este:
- `Basic` passa a soar como entrada premium enxuta
- `Growth` passa a soar como melhor equilibrio entre valor, defesa e renovacao
- `Premium` passa a soar como opcao para quem ja provou fit, nao como promessa inflada

Isso melhora o signaling sem quebrar a coesao do Seller.

## Impacto em Growth defense
O `Growth` ficou mais blindado porque:

- ganhou um `valueSignal` mais claro
- segue destacado visualmente em `/start`
- agora tambem carrega uma leitura curta mais facil de sustentar no proprio produto

Na pratica, ele emerge mais naturalmente como plano principal, em vez de depender tanto de explicacao externa.

## Impacto em pricing hierarchy
A hierarquia ficou mais legivel e mais crivel:

- `Basic` continua premium, mas claramente mais contido
- `Growth` fica mais forte como plano default real
- `Premium` continua disponivel, mas com mais cautela e honestidade

Isso melhora a defesa de preco porque reduz a ambiguidade entre os tres niveis sem transformar o app em pagina de venda permanente.

## Riscos remanescentes
- O shell ainda nao transforma plano em prova economica por si so; ele apenas sinaliza melhor a leitura de valor.
- A diferenca funcional entre `Growth` e `Premium` continua relativamente estreita; o ganho aqui foi de framing e signaling, nao de escopo.
- Se o pricing mudar muito nas proximas sprints, os signals vao precisar ser recalibrados junto com a hierarquia comercial.

## Julgamento final da etapa
Etapa aprovada.

O produto agora sinaliza melhor o valor por plano dentro da experiencia real, com um ganho claro para a defesa de `Growth` e uma hierarquia mais legivel entre entrada, default e topo. O Seller continua coeso, premium e narrow, sem virar brochure de pricing nem UX quebrada por gating.
