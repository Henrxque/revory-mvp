# REVORY Seller — Manual Lead Quick Add UX Compression

## Problemas encontrados

O quick add já estava funcional, mas ainda carregava alguns sinais de “cadastro” e de fluxo mais pesado do que o necessário.

Os principais problemas eram:

- o botão `Quick add lead` já entrava com uma leitura mais “feature” do que “quick action”
- o modal tinha copy demais no topo
- `main offer` e `booking path` estavam em cards separados, o que pesava visualmente a abertura
- havia um bloco explicativo extra no meio do modal
- o footer ainda tinha texto redundante
- o CTA `Create booking read` soava mais processual e menos imediato

Nada disso transformava a feature em CRM sozinho, mas somado começava a aproximar a percepção de:

- formulário de cadastro
- mini workflow novo
- camada que se explica demais

## Ajustes aplicados

- o trigger virou `Quick add`
  - menos literal
  - mais rápido
  - mais alinhado a ação curta
- o topo do modal foi comprimido:
  - `Manual lead quick add` virou `Quick add`
  - o título ficou mais curto
  - a supporting copy virou uma linha só
- `main offer` e `booking path` saíram de cards próprios
  - passaram a aparecer como badges curtas de contexto
  - isso preserva herança do workspace sem abrir peso de estrutura
- o campo `Source label` virou `Source`
  - placeholder mais curto
- o bloco explicativo intermediário foi removido
- o footer foi comprimido:
  - texto menor e mais direto
  - CTA `Create booking read` virou `Add lead`
  - estado pendente `Creating...` virou `Adding...`
- o feedback de sucesso visível no trigger ficou mais curto:
  - `Lead added`

## O que foi removido

- badge `Bounded entry`
- paragraph longa explicando a feature no header
- os dois cards de contexto:
  - `Main offer`
  - `Booking path`
- o bloco explicativo separado no meio do modal
- parte da verbosidade do CTA e do footer

Esses cortes foram intencionais para reduzir parsing visual e evitar cara de “surface que virou pequeno formulário de gestão”.

## Como a feature ficou mais narrow

Ela agora lê mais claramente como:

- quick action
- entrada curta
- criação pontual de leitura

E menos como:

- cadastro
- onboarding dentro do app
- módulo de lead capture
- começo de CRM

O ponto central é este:

o usuário continua vendo só o mínimo necessário para agir:

- quem é o lead
- por onde contatar
- contexto herdado do workspace

Sem affordances de gestão contínua, sem campos extras e sem blocos que sugiram profundidade operacional maior do que a real.

## Veredito executivo

O pass funcionou.

O `Manual Lead Quick Add` ficou:

- mais curto
- mais rápido de entender
- mais premium
- menos parecido com cadastro
- menos sujeito a leitura de CRM-by-accident

A feature continua funcional e clara, mas agora com melhor disciplina anti-CRM. O principal acerto foi trocar peso estrutural por contexto leve. Isso deixa o quick add mais alinhado ao REVORY como produto narrow premium e mais coerente com a fase `LIKE WATER`.
