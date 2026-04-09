# Sprint 12 — Etapa 4 Review

## objetivo da etapa
Melhorar a resiliência do dashboard do REVORY Seller para que falhas parciais em camadas auxiliares não derrubem a principal tela de valor do produto.

O objetivo específico foi preservar:
- `Booked proof`
- `Revenue view`
- `Executive read`

mesmo quando blocos auxiliares como attribution, momentum, upcoming bookings ou next-move intelligence falham de forma parcial.

## diagnóstico anterior
Antes desta etapa, o dashboard ainda tinha um problema de arquitetura:
- havia hardening pontual em attribution
- mas a renderização geral ainda assumia um shape relativamente único de sucesso
- momentum, upcoming e o aside de next move ainda podiam contaminar a confiabilidade da tela inteira

Em linguagem de produto:
- a Revenue View já era boa
- mas ainda não estava suficientemente contida sob falha

## mudanças realizadas
### 1. Separação explícita entre camada essencial e camadas auxiliares
Refatorei `getDashboardOverview` para deixar mais claro o que é:
- essencial para a leitura principal
- auxiliar para defesa adicional de valor

Camada essencial:
- booked appointments
- booked revenue
- import sources
- client count
- appointment count
- canceled count

Camadas auxiliares, agora runtime-safe:
- attribution support
- recent momentum
- retention defense
- renewal read
- upcoming bookings

### 2. Contenção de falha por bloco
Implementei fetch seguro por bloco auxiliar:
- `getAttributionSupportSnapshot`
- `getRecentMomentumSnapshot`
- `getUpcomingReadSnapshot`

Cada uma dessas rotas agora:
- tenta carregar normalmente
- faz log honesto quando falha
- volta um estado degradado controlado
- não derruba a Revenue View

### 3. Estado agregado de integridade do dashboard
Adicionei `supportIntegrity` no shape do dashboard para sintetizar degradação parcial.

Isso permite uma leitura curta e honesta:
- revenue continua viva
- alguns support reads estão limitados
- sem fingir que “está tudo bem”
- sem explodir a tela com erro técnico bruto

### 4. Bloco de `Upcoming bookings` com modo limitado
Antes, o bloco só sabia operar em presença de lista.

Agora:
- se upcoming estiver saudável, renderiza normalmente
- se upcoming estiver degradado, mostra um estado `Limited`
- a tela continua útil sem fingir agenda que não foi carregada

### 5. Contenção no aside de `Next move`
O aside assíncrono de decision support agora também é contido:
- se a camada de recommendation falhar
- o componente cai para o fallback determinístico
- o bloco continua renderizando

### 6. Mensagem curta de UX sob falha
Adicionei um banner curto e premium de integridade:
- “Revenue stays live while support reads recover”

Isso melhora honestidade e reduz ansiedade do operador sem transformar o app em console de erro.

## arquivos alterados
- `C:\Users\hriqu\Documents\revory-mvp\services\dashboard\get-dashboard-overview.ts`
- `C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\dashboard\page.tsx`
- `C:\Users\hriqu\Documents\revory-mvp\services\decision-support\get-dashboard-decision-support.ts`
- `C:\Users\hriqu\Documents\revory-mvp\services\decision-support\build-dashboard-decision-support.ts`
- `C:\Users\hriqu\Documents\revory-mvp\docs\reviews\sprint12-etapa4-review.md`

## impacto em dashboard resilience
Alto.

Antes:
- uma falha parcial ainda podia degradar a percepção de confiabilidade da tela inteira
- alguns blocos auxiliares ainda estavam pouco contidos

Depois:
- revenue principal continua no ar
- booked proof continua visível
- executive read continua legível
- blocos auxiliares caem para `Limited` / `Unavailable`
- o dashboard não depende mais de sucesso perfeito para continuar útil

## impacto em UX under failure
Positivo e honesto.

O dashboard agora:
- não mascara problema real
- não mostra erro técnico bruto para o usuário
- não inventa dados
- mantém a leitura econômica principal
- sinaliza claramente quando uma camada de suporte está limitada

Isso preserva o premium feel mesmo em falha parcial.

## impacto em sale confidence
Alto.

Essa etapa melhora confiança comercial porque:
- reduz risco de demo quebrada
- evita que a principal tela de valor morra por causa de um bloco auxiliar
- protege a narrativa revenue-first em situações imperfeitas de runtime

Em outras palavras: o produto agora falha com mais disciplina.

## riscos remanescentes
- Se a camada essencial falhar de verdade, o dashboard ainda não tem como “inventar” uma Revenue View; isso continua correto e honesto.
- O hardening agora contém muito melhor as falhas auxiliares, mas não elimina a necessidade de integridade real entre schema, imports e dados.
- O banner de integridade é contido, mas ainda merece watchlist para garantir que não fique frequente em ambiente real.

## julgamento final da etapa
**Aprovada.**

O dashboard ficou mais resiliente, mais honesto sob falha e mais seguro para venda. A principal tela de valor deixou de ser vulnerável demais a blocos auxiliares e agora preserva booked proof + revenue read sempre que isso for tecnicamente possível.

## validação dos estados defensivos
### Estado saudável
Validado em browser com dashboard carregando normalmente:
- `Revenue view` visível
- sem `Limited`
- sem `PrismaClientKnownRequestError`

Evidência:
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\sprint12-dashboard-healthy-blocks.png`

### Estado degradado forçado
Validei com degradação forçada de:
- attribution
- momentum
- upcoming

Resultado:
- `Revenue view` continuou viva
- `Limited` apareceu nos blocos degradados
- `Unavailable` apareceu apenas onde a camada auxiliar realmente ficou sem leitura
- nenhum `PrismaClientKnownRequestError` foi exposto na UI

Evidência:
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\sprint12-dashboard-degraded-blocks.png`

### Validação técnica
- `npm run lint` passou
- `npm run typecheck` passou
- `npm run build` passou
