# sprint12-etapa5-review

## objetivo da etapa

Criar um protocolo minimo de consistencia de ambiente para impedir que o REVORY Seller pareca saudavel quando ainda existe drift real entre env, schema, migrations, banco e runtime.

## diagnostico anterior

Antes desta etapa, o ambiente local podia passar uma falsa sensacao de saude por tres motivos:

- migrations podiam existir no repo sem estarem aplicadas no banco local
- colunas criticas para dashboard, attribution e renewal podiam faltar fisicamente mesmo com schema e codigo atualizados
- flags de degradacao forcada e envs incompletas podiam distorcer o resultado de reruns e testes manuais

O caso que motivou a etapa foi claro: o dashboard caiu por falta de `clients.hasLeadBaseSupport`, mesmo com o produto parecendo funcional no restante do fluxo.

## protocolo criado

Foi criado um protocolo curto, executavel e orientado a founder solo:

1. Se houve mudanca de schema, rodar `npm run db:deploy` e `npm run db:generate`
2. Rodar `npm run env:check`
3. So confiar no ambiente quando:
   - `Database reachable` estiver `yes`
   - `Pending migrations` estiver `0`
   - `protocolReady` estiver `true`
   - nao houver colunas criticas ausentes
   - nao houver flags `REVORY_FORCE_*` ligadas sem intencao de teste degradado
4. So depois disso subir `npm run dev` e fazer rerun limpo em workspace novo quando a validacao exigir confianca operacional real

O comando novo valida:

- envs locais minimas para runtime consistente
- conectividade real com o banco
- migrations pendentes vs aplicadas
- colunas criticas usadas por revenue, attribution, renewal e billing
- flags locais que podem mascarar um ambiente degradado

## arquivos alterados

- [scripts/check-environment-consistency.mjs](C:/Users/hriqu/Documents/revory-mvp/scripts/check-environment-consistency.mjs)
- [package.json](C:/Users/hriqu/Documents/revory-mvp/package.json)
- [environment-consistency-protocol.md](C:/Users/hriqu/Documents/revory-mvp/docs/environment-consistency-protocol.md)
- [.env.local](C:/Users/hriqu/Documents/revory-mvp/.env.local)

## impacto em environment reliability

O ambiente local agora tem uma verificacao unica e objetiva antes de qualquer rerun confiavel. Isso reduz o risco de:

- confiar em banco fora de sync
- esquecer migration pendente
- validar dashboard em schema incompleto
- interpretar teste degradado como teste saudavel

Tambem reduz o risco de erro silencioso em superfices comerciais centrais, porque a checagem cobre explicitamente colunas usadas pelo dashboard e pelo gating de billing.

## impacto em test readiness

O protocolo melhora a prontidao de teste porque troca “aparencia de normalidade” por evidencias simples e verificaveis. Nesta rodada, ele ja encontrou um gap real no proprio ambiente local: `NEXT_PUBLIC_APP_URL` ausente. O gap foi corrigido em `.env.local`, e o rerun do protocolo passou com:

- banco acessivel
- zero migrations pendentes
- colunas criticas presentes
- zero flags de degradacao
- `protocolReady: true`

## impacto em founder operations

O ganho principal para operacao solo e simplicidade:

- um comando unico
- um criterio claro de “pode confiar / nao pode confiar”
- sem DevOps pesado
- sem observabilidade complexa

Isso torna mais facil fazer manutencao local, validar demos e evitar perder tempo investigando bugs que na verdade sao drift de ambiente.

## riscos remanescentes

- o protocolo nao substitui smoke test manual
- ele nao impede drift futuro se alguem esquecer de rodar `db:deploy`
- ele ainda depende de disciplina minima para ser usado antes de reruns criticos
- ele cobre o nucleo atual do produto, mas novas colunas criticas precisam ser adicionadas ao check quando a camada comercial/runtime crescer

## julgamento final da etapa

**Aprovada.**

Esta etapa corrigiu um ponto operacional real do projeto: antes, era possivel confiar cedo demais no ambiente local. Agora existe um protocolo simples, reprodutivel e suficiente para reduzir reruns falsamente saudaveis sem inflar o produto com processo ou infraestrutura excessiva.
