# REVORY - Sprint 5 Etapa 2 Review

## Objetivo da etapa
Implementar uma foundation minima e controlada de templates operacionais para o MVP da REVORY, cobrindo confirmation, reminder, recovery e review request sem abrir editor avancado, campaign builder ou automacao livre.

## O que foi feito
- Foi criada uma estrutura tipada para templates operacionais controlados.
- Foram adicionados 4 templates base:
  - confirmation
  - reminder
  - recovery
  - review request
- Foram definidos placeholders limitados e previsiveis, sem customizacao infinita.
- Foi adicionada uma UI curta de preview dentro da surface operacional ja existente no dashboard.
- A integracao foi feita sem criar nova area de produto, sem duplicar superficies e sem transformar a REVORY em ferramenta de campanha.

## Arquivos criados
- `types/operational-template.ts`
- `services/operations/operational-templates.ts`
- `components/dashboard/OperationalTemplatePreviewGrid.tsx`
- `docs/reviews/sprint-5-etapa-2-operational-template-foundation.md`
- `docs/reviews/generate_sprint_5_etapa_2_operational_template_foundation_pdf.py`

## Arquivos alterados
- `types/operations.ts`
- `services/operations/build-operational-surface.ts`
- `components/dashboard/OperationalSurface.tsx`
- `docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`

## Estrutura minima de dados
- `RevoryOperationalTemplateKey`
  - `confirmation`
  - `reminder`
  - `recovery`
  - `review_request`
- `RevoryOperationalTemplatePlaceholderKey`
  - `client_first_name`
  - `client_full_name`
  - `service_name`
  - `scheduled_at`
  - `provider_name`
  - `google_reviews_url`
- `RevoryOperationalTemplateDefinition`
  - define categoria, descricao, body base e placeholders permitidos
- `RevoryOperationalTemplatePreview`
  - define o preview renderizado para a UI, com modo de preview e placeholders usados

## Placeholders controlados
- Os placeholders sao explicitamente permitidos por categoria.
- O render nao aceita campo arbitrario.
- Cada template so usa o subconjunto minimo necessario.
- Quando nao ha item real disponivel, o sistema usa amostras controladas para manter a visualizacao consistente e honesta.

## Templates base adicionados

### Confirmation
- Uso: appointments dentro da janela inicial de confirmation
- Placeholder permitidos:
  - `{{client_first_name}}`
  - `{{service_name}}`
  - `{{scheduled_at}}`
  - `{{provider_name}}`

### Reminder
- Uso: appointments dentro da janela inicial de reminder
- Placeholder permitidos:
  - `{{client_first_name}}`
  - `{{service_name}}`
  - `{{scheduled_at}}`
  - `{{provider_name}}`

### Recovery
- Uso: disruptions recentes que viraram insight de recovery
- Placeholder permitidos:
  - `{{client_first_name}}`
  - `{{service_name}}`

### Review request
- Uso: visits elegiveis para review request
- Placeholder permitidos:
  - `{{client_first_name}}`
  - `{{service_name}}`
  - `{{google_reviews_url}}`

## Decisoes de UX
- O preview entrou na mesma camada operacional do dashboard, sem abrir nova pagina.
- A surface continua curta:
  - cards operacionais
  - fila curta priorizada
  - bloco de previews de template
- Os templates aparecem como `base preview`, nao como editor nem como automacao ativa.
- Cada card deixa claro:
  - categoria
  - se o preview esta usando dado real atual ou amostra controlada
  - quais placeholders sao permitidos
- Isso preserva uma leitura premium, curta e previsivel.

## Evidencias do que funciona
- `npm run typecheck`
- `npx eslint "components/dashboard/OperationalSurface.tsx" "components/dashboard/OperationalTemplatePreviewGrid.tsx" "services/operations/operational-templates.ts" "services/operations/build-operational-surface.ts" "types/operational-template.ts" "types/operations.ts" "docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts" --max-warnings=0`
- `npx tsx docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`
- `npm run build`

Resultado observado no smoke:
- `templatePreviews` gerados para:
  - `confirmation`
  - `recovery`
  - `reminder`
  - `review_request`
- todos os previews do smoke sairam em `live_preview`
- placeholders renderizados continuaram controlados por categoria

## Ajuste de higiene feito junto
- O smoke da Sprint 4 Etapa 8 foi atualizado para refletir a exigencia de `operationalState` e `stateSummary`, mantendo a base atual do repo coerente.
- Esse ajuste nao expandiu a feature; apenas destravou validacao e build para a nova etapa.

## O que ficou intencionalmente fora
- editor visual de template
- customizacao livre por workspace
- workflow builder
- campanhas
- multicanal
- memoria persistida de templates customizados
- variaveis arbitrarias

## Limitacoes conhecidas
- Os templates ainda sao foundations de preview, nao mensagens sendo disparadas.
- Nao existe edicao livre nem versionamento.
- O preview usa item real quando existe; caso contrario, usa amostra controlada.
- Review request continua base de elegibilidade, nao reputation ops completo.
- Recovery continua insight operacional inicial, nao rebooking engine.

## Riscos conhecidos
- Se a copy futura crescer sem disciplina, a area pode comecar a parecer modulo de campanha.
- Se placeholders forem abertos sem controle, o MVP perde previsibilidade rapidamente.
- Se a surface ganhar mais blocos paralelos sem consolidacao, o dashboard pode ficar mais denso do que deveria.

## Proximos passos
- Ligar essa base de templates a estados futuros de preparo e execucao, sem abrir editor livre.
- Decidir depois se algum template merece pequena parametrizacao controlada, ainda sem virar builder.
- Manter a surface curta e honesta quando a camada de execucao real entrar.

## Veredito
- A foundation minima de templates ficou funcional.
- O preview curto esta visivel na UI.
- Nao houve expansao de escopo.
- Pela lente de produto, a implementacao permanece premium, self-service, MedSpa-first e honesta com o estado real do MVP.
