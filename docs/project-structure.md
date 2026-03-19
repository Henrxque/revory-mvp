# Project Structure - REVORY

Este documento define a estrutura obrigatoria do projeto REVORY para o MVP. O objetivo e manter o repositorio limpo, previsivel e facil de evoluir durante as primeiras sprints.

## Estrutura Obrigatoria

```text
app/
components/
lib/
services/
db/
schemas/
types/
docs/
prisma/
```

## Papel de Cada Pasta

### `app/`

Camada de rotas, layouts, paginas, loading, error states e composicao inicial das telas. Deve concentrar estrutura de navegacao e montagem da interface por pagina.

### `components/`

Componentes de UI reutilizaveis e blocos visuais de tela. Deve conter componentes puros de apresentacao e pequenas composicoes de interface.

### `lib/`

Utilitarios compartilhados, helpers, formatadores, wrappers pequenos e funcoes genericas sem dependencia de dominio forte.

### `services/`

Regras de negocio e orquestracao de casos de uso. Aqui ficam fluxos como onboarding, recovery, reviews, metricas e execucao de jobs simples.

Diretriz de evolucao futura: conforme o projeto crescer, `services/` pode ser organizado por dominio funcional, por exemplo `services/onboarding`, `services/recovery`, `services/reviews` e `services/metrics`. Isso e apenas uma diretriz futura, nao uma obrigacao imediata do MVP.

### `db/`

Camada de acesso a dados da aplicacao. Deve concentrar client do Prisma, helpers de persistencia e adaptadores simples para leitura e escrita no banco.

### `schemas/`

Schemas de validacao com Zod para formularios, payloads de API, input de jobs e contratos internos importantes.

### `types/`

Tipos compartilhados da aplicacao que nao pertencem diretamente a um schema Zod ou ao client do Prisma. Deve ser usado com moderacao.

### `docs/`

Documentacao operacional e tecnica do projeto. Deve concentrar ADRs, domain model, jornada do usuario, wireframes e convencoes de desenvolvimento.

### `prisma/`

Schema do banco, migrations e arquivos relacionados ao Prisma.

## Convencoes de Naming

- pastas: `kebab-case`
- arquivos de componentes React: `PascalCase.tsx`
- arquivos utilitarios, services, db e schemas: `kebab-case.ts`
- tipos e interfaces compartilhadas: `PascalCase`
- funcoes: `camelCase`
- constantes de dominio: `SCREAMING_SNAKE_CASE` apenas quando forem constantes reais
- nomes devem ser explicitos e orientados ao dominio, evitando abreviacoes desnecessarias

## Convencoes de Separacao

### UI

- `app/` organiza paginas e rotas
- `components/` concentra blocos reutilizaveis de interface
- componente de UI nao deve carregar regra de negocio densa

### Regras de Negocio

- `services/` concentra fluxos e decisoes operacionais
- regras de onboarding, appointments, recovery, reviews e metricas devem nascer aqui
- componentes nao devem implementar logica central de negocio

### Validacao

- `schemas/` centraliza validacao de entrada e saida com Zod
- validacoes reutilizaveis nao devem ficar espalhadas em paginas ou componentes
- formularios e handlers devem consumir schemas compartilhados sempre que fizer sentido

### Tipos

- priorizar tipos derivados de Prisma e Zod quando possivel
- `types/` deve ficar restrito a tipos realmente compartilhados e sem dono melhor
- evitar duplicar tipos que ja existem no schema de banco ou no schema de validacao

### Persistencia

- `db/` concentra o acesso ao banco
- queries nao devem ficar espalhadas por componentes
- `services/` pode orquestrar operacoes, mas o acesso cru ao Prisma deve permanecer organizado em `db/`

## Regras Praticas

- pagina monta tela
- componente renderiza UI
- service executa regra de negocio
- schema valida entrada e saida
- db acessa persistencia
- type complementa contratos compartilhados quando necessario

## Checklist Para Repo Pronto Para Sprint 1

- estrutura base criada e versionada
- `prisma/schema.prisma` presente e coerente com o MVP
- pasta `docs/` com documentacao inicial do produto e do dominio
- app inicial funcionando com layout e pagina base
- convencoes de naming definidas
- separacao entre UI, services, db, schemas e types documentada
- validacao inicial de lint, typecheck e build funcionando
- `.env.example` presente com variaveis minimas
- README inicial explicando setup local
- repositorio em `main` com primeiro commit publicado

## Observacao

Esta estrutura deve permanecer enxuta no MVP. Novas pastas so devem ser adicionadas quando houver necessidade concreta e recorrente.
