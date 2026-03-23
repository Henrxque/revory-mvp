# REVORY - Sprint 4 Etapa 8 Review

## Objetivo da etapa
Criar a primeira superficie operacional da REVORY dentro do app, mostrando quem precisa de acao e por que, de forma premium, enxuta e util, sem transformar o produto em CRM, inbox ou dashboard enterprise inchado.

## Arquivos criados/alterados
- Criado: `types/operations.ts`
- Criado: `services/operations/build-operational-surface.ts`
- Criado: `services/operations/get-operational-surface.ts`
- Criado: `components/dashboard/OperationalSurface.tsx`
- Alterado: `src/app/(app)/app/dashboard/page.tsx`
- Criado: `docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`
- Criado: `docs/reviews/sprint-4-etapa-8-operational-surface.md`
- Criado: `docs/reviews/generate_sprint_4_etapa_8_operational_surface_pdf.py`

## Decisoes de UX
- A camada operacional foi colocada dentro do dashboard ja existente, em uma unica superficie.
- Nao foi aberta:
  - nova area de produto
  - nova inbox
  - nova fila isolada
  - nova tela de CRM
- A leitura da superficie foi organizada em tres niveis:
  - resumo de foco operacional
  - cards por categoria
  - fila curta de itens sugeridos
- Cada item da fila deixa explicitamente separado:
  - `Insight`
  - `Status`
  - `Suggested next action`
- Essa separacao foi feita para preservar clareza e evitar que a UI pareca tecnica demais ou enterprise demais.

## O que entrou na superficie operacional
- At-risk appointments
- Confirmation queue
- Reminder queue
- Recovery opportunities
- Review-ready visits

## Como a prioridade foi organizada
- A lista principal prioriza primeiro:
  - at-risk
  - reminder
  - confirmation
  - recovery
  - review request
- Appointments agendados nao aparecem duplicados em varias linhas da fila:
  - se um appointment ja foi puxado por `at-risk`, ele nao reaparece logo abaixo como reminder/confirmation
- Isso protege foco e legibilidade.
- Confirmation continua visivel como categoria mesmo quando perde a prioridade da fila curta para sinais mais urgentes.
- Buckets auxiliares, como `scheduled_later`, nao entram como prioridade principal nesta superficie.

## O que a superficie mostra com honestidade
- `Insight`
  - quando a REVORY esta apenas apontando uma oportunidade ou risco inicial
- `Status`
  - quando a REVORY esta mostrando readiness ou bloqueio de uma fila operacional simples
- `Suggested next action`
  - quando a REVORY orienta a proxima acao sem prometer automacao que ainda nao existe

## Evidencias do fluxo funcionando
- `npm run typecheck`
- `npm run build`
- `npx eslint "components/dashboard/OperationalSurface.tsx" "services/operations/build-operational-surface.ts" "services/operations/get-operational-surface.ts" "types/operations.ts" "src/app/(app)/app/dashboard/page.tsx" "docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts" --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`

Resultado observado no smoke:
- `blockedCount = 2`
- ordem dos cards:
  - `at_risk:2`
  - `confirmation:0`
  - `reminder:1`
  - `recovery:1`
  - `review_request:1`
- `needsAttentionNowCount = 1`
- headline principal:
  - `A small set of appointments needs attention now.`
- fila curta gerada com:
  - `at_risk`
  - `reminder`
  - `recovery`
  - `review_request`
- a fila curta fica limitada para evitar deriva para mini-inbox

## Blocos visuais adicionados
- Bloco hero operacional:
  - headline de foco
  - contadores curtos
  - suggested next action
- o estado de bloqueio foi mantido mais discreto para nao competir com a prioridade operacional real
- Cards de categoria:
  - diferenciam `Insight` de `Status`
  - deixam contagem e bloqueio claros
- Lista curta de prioridade:
  - deixa explicito quem precisa de acao
  - por que entrou ali
  - qual e a proxima acao sugerida

## Limitacoes conhecidas
- A superficie ainda nao executa automacao.
- A superficie ainda nao envia confirmation, reminder, recovery ou review request.
- Recovery continua insight inicial, nao fluxo completo de rebooking.
- Review request continua elegibilidade inicial, nao reputation ops completo.
- A fila ainda e uma leitura operacional guiada, nao historico completo nem inbox operacional persistida.

## Pendencias
- Refinar o encaixe da camada operacional com os blocos futuros do dashboard em um segundo passe visual, se necessario.
- Decidir depois se alguma parte dessa fila merece CTA operacional proprio quando o envio real entrar.
- Continuar protegendo a separacao entre:
  - sinal real
  - readiness
  - automacao futura

## Riscos conhecidos
- Se o cliente importar base incompleta, os sinais continuam honestos, mas podem parecer mais vazios do que a operacao real fora da base importada.
- A leitura agregada entre categorias depende da qualidade do dado importado e do caminho email-first.
- Se a camada futura crescer sem disciplina, existe risco de virar inbox ou CRM; a implementacao atual evita isso mantendo uma unica superficie curta.

## Proximos passos
- Ligar essa superficie a futuras etapas de envio real mantendo o mesmo recorte enxuto.
- Preservar a mesma identidade visual premium quando os primeiros estados operacionais de execucao entrarem no produto.
- Continuar evitando duplicacao de superficies e complexidade desnecessaria.
