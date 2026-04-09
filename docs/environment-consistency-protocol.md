# Environment Consistency Protocol

Este protocolo existe para impedir reruns falsamente saudaveis no ambiente local.

## Quando usar

Rodar antes de:

- teste manual completo
- rerun limpo de import -> dashboard
- validar dashboard, attribution, renewal ou retention
- confiar em ambiente local depois de mudar schema, migrations ou import layer

## Comando unico

```bash
npm run env:check
```

## O que o protocolo valida

- envs locais minimas para o app subir com consistencia
- conectividade real com o banco
- migrations pendentes vs migrations aplicadas
- colunas criticas usadas pela camada de revenue, attribution e billing
- flags locais de degradacao forcada que podem maquiar a leitura do ambiente

## O ambiente so deve ser tratado como confiavel quando

- `Database reachable` estiver `yes`
- `Pending migrations` estiver `0`
- `protocolReady` estiver `true`
- nao houver `Missing critical columns`
- nao houver flags `REVORY_FORCE_*` ligadas sem intencao de teste degradado

## Ritual curto recomendado para founder solo

1. Se houve mudanca de schema ou migrations, rode:

```bash
npm run db:deploy
npm run db:generate
```

2. Rode o protocolo:

```bash
npm run env:check
```

3. So depois disso rode:

```bash
npm run dev
```

4. Para validar fluxo real, prefira workspace novo e rerun limpo.

```bash
npm run qa:clean-rerun
```

Esse rerun usa fixtures estaveis do repo, limpa evidencias antigas e valida o resultado final contra expectativas minimas de import, booked proof e support coverage.

## O que este protocolo nao substitui

- nao substitui smoke test manual
- nao substitui rerun limpo em workspace novo
- nao substitui revisar logs quando um bloco entra em `Limited` ou `Unavailable`

Ele apenas garante que o ambiente local nao esta parecendo saudavel quando ainda ha drift entre schema, migrations e runtime.
