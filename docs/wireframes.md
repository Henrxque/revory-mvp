# Wireframes - REVORY MVP

Este documento define wireframes textuais de baixa fidelidade para o MVP da REVORY. O objetivo e orientar implementacao de layout, hierarquia e fluxo sem fechar design visual final.

## Landing

### Objetivo da Tela

Apresentar valor do produto com clareza e levar o usuario para criacao de conta, com enfase em revenue protected, revenue recovered e empty slots recovered.

### Blocos Principais

```text
+--------------------------------------------------------------+
| Topbar: logo | Product | Why REVORY | Login | CTA            |
+--------------------------------------------------------------+
| Hero                                                 CTA     |
| Headline premium + subheadline + prova de valor              |
| Highlights: revenue protected | revenue recovered            |
|             empty slots recovered | reviews                  |
+--------------------------------------------------------------+
| How it works: 3 passos                                       |
+--------------------------------------------------------------+
| ROI strip: protected / recovered / slots recovered           |
+--------------------------------------------------------------+
| Footer                                                       |
+--------------------------------------------------------------+
```

- topbar enxuta
- hero com headline, subheadline e CTA
- bloco de beneficios principais
- bloco de ROI com revenue protected / recovered
- bloco "como funciona"
- prova de valor ou sinais de confianca

### CTA Principal

`Criar conta`

### CTA Secundario Se Existir

`Entrar`

### Estado Vazio Sugerido

Nao se aplica como tela de operacao. Se algum bloco dinamico nao carregar, manter versao estatica da pagina.

### Observacoes de UX

- headline deve deixar claro que o produto e MedSpa-first
- hierarquia visual deve ser limpa, com poucos blocos e muito respiro
- evitar excesso de texto tecnico acima da dobra

## Login

### Objetivo da Tela

Permitir acesso rapido para usuarios existentes.

### Blocos Principais

```text
+-------------------------------------------+
| Logo                                      |
| Titulo: Entrar na REVORY                  |
| Campo email                               |
| Campo senha ou metodo do provedor         |
| CTA principal                             |
| Link para signup                          |
| Link esqueci minha senha                  |
+-------------------------------------------+
```

- logo e contexto minimo da marca
- formulario de login
- links de suporte basicos

### CTA Principal

`Entrar`

### CTA Secundario Se Existir

`Criar conta`

### Estado Vazio Sugerido

Nao se aplica. Em caso de erro, mostrar mensagem curta e acionavel acima do formulario.

### Observacoes de UX

- manter foco em uma unica acao
- reduzir distracoes laterais
- feedback de erro deve ser direto e sem linguagem tecnica

## Signup

### Objetivo da Tela

Criar conta com baixa friccao e iniciar o onboarding.

### Blocos Principais

```text
+-------------------------------------------+
| Logo                                      |
| Titulo: Criar conta                        |
| Campo nome                                |
| Campo email                               |
| Campo senha ou metodo do provedor         |
| CTA principal                             |
| Link para login                           |
| Nota curta sobre trial/onboarding         |
+-------------------------------------------+
```

- cabecalho simples
- formulario curto
- link para login

### CTA Principal

`Criar conta`

### CTA Secundario Se Existir

`Ja tenho conta`

### Estado Vazio Sugerido

Nao se aplica. Em caso de bloqueio, mostrar explicacao curta e manter campos preenchidos.

### Observacoes de UX

- reduzir campos ao minimo necessario
- reforcar progresso natural para criar workspace depois do signup
- nao misturar signup com detalhes do produto

## Onboarding Wizard

### Objetivo da Tela

Guiar o usuario pela ativacao inicial do workspace sem onboarding humano, depois de login/signup concluidos.

### Blocos Principais

```text
+----------------------------------------------------------------+
| Topbar: logo | nome do workspace | sair                         |
+----------------------------------------------------------------+
| Stepper lateral ou superior                                     |
| Inicio do wizard: setup do workspace                            |
| 1 Workspace | 2 Template MedSpa | 3 Fonte | 4 Canal            |
| 5 Google Reviews | 6 Modo recomendado | 7 Ativacao             |
+----------------------------------------------------------------+
| Area principal da etapa atual                                   |
| Titulo da etapa                                                  |
| Campos e explicacao curta                                        |
| Feedback de validacao                                            |
| CTA principal | CTA secundario                                   |
+----------------------------------------------------------------+
```

- stepper do onboarding
- cabecalho do workspace
- conteudo da etapa atual
- area de ajuda curta

### CTA Principal

`Continuar`

### CTA Secundario Se Existir

`Voltar`

### Estado Vazio Sugerido

Quando a etapa depender de dado ainda nao fornecido, mostrar orientacao clara do que falta e o proximo passo recomendado.

Quando conexao de fonte ou importacao de CSV for concluida, mostrar estado de sucesso curto com confirmacao visual e CTA para avancar para a proxima etapa recomendada.

### Observacoes de UX

- o wizard deve refletir exatamente `ActivationSetup.currentStep`
- login e signup acontecem antes do wizard; aqui o usuario ja esta autenticado
- o wizard comeca no setup do workspace
- manter uma pergunta principal por etapa quando possivel
- reforcar que email e o canal padrao do MVP
- o modo recomendado deve preparar o modo ativo aplicado na ativacao

## Dashboard

### Objetivo da Tela

Entregar visao inicial de saude operacional, valor protegido e valor recuperado.

### Blocos Principais

```text
+----------------------------------------------------------------+
| Topbar: workspace switcher | search opcional | user menu        |
+----------------------------------------------------------------+
| Header: titulo + periodo + refresh                              |
+----------------------------------------------------------------+
| KPI row above the fold                                          |
| Revenue protected | Revenue recovered | Confirmation rate       |
| No-shows prevented | Empty slots recovered | Reviews requested  |
+----------------------------------------------------------------+
| At-risk appointments preview                                    |
+----------------------------------------------------------------+
| Recovery queue preview                                          |
+----------------------------------------------------------------+
| Reviews preview                                                 |
+----------------------------------------------------------------+
```

- header com contexto do workspace
- linha principal de KPIs
- previews operacionais
- links para paginas detalhadas

### CTA Principal

`Ver riscos`

### CTA Secundario Se Existir

`Atualizar dados`

### Estado Vazio Sugerido

Mostrar estado vazio guiado com mensagem curta, explicando que o dashboard sera preenchido assim que houver fonte conectada ou CSV importado.

### Observacoes de UX

- priorizar acima da dobra: Revenue Protected, Revenue Recovered e Confirmation Rate
- linguagem deve ser operacional, nao analitica demais
- estado vazio nao pode parecer erro; deve parecer etapa normal de ativacao

## At-Risk Appointments

### Objetivo da Tela

Listar appointments com maior risco operacional para acao rapida.

### Blocos Principais

```text
+----------------------------------------------------------------+
| Header: titulo + filtros + periodo                              |
+----------------------------------------------------------------+
| Summary chips: total at-risk | high risk | today                |
+----------------------------------------------------------------+
| Tabela ou lista                                                  |
| Client | Appointment time | Risk reason | Status | Action       |
+----------------------------------------------------------------+
| Detalhe simples do item selecionado                              |
+----------------------------------------------------------------+
```

- header com filtros
- resumo rapido
- lista priorizada por risco
- detalhe simples do item selecionado

### CTA Principal

`Abrir recovery`

### CTA Secundario Se Existir

`Ver appointment`

### Estado Vazio Sugerido

Mostrar mensagem de operacao saudavel: nenhum appointment em risco relevante no periodo selecionado.

### Observacoes de UX

- ordenar por urgencia antes de ordenar por data
- risco deve ser explicado em texto curto e claro
- evitar tabela pesada demais no MVP

## Recovery Queue

### Objetivo da Tela

Exibir oportunidades de recovery e o progresso de recuperacao de horarios vazios.

### Blocos Principais

```text
+----------------------------------------------------------------+
| Header: titulo + filtros de status + periodo                    |
+----------------------------------------------------------------+
| KPI strip: open | contacted | recovered | revenue recovered     |
+----------------------------------------------------------------+
| Lista principal                                                  |
| Client | Reason | Estimated value | Mode | Status | Next action |
+----------------------------------------------------------------+
| Detalhe simples da oportunidade selecionada                      |
+----------------------------------------------------------------+
```

- resumo de fila
- lista de oportunidades
- detalhe simples da oportunidade e contexto

### CTA Principal

`Ver oportunidade`

### CTA Secundario Se Existir

`Filtrar abertas`

### Estado Vazio Sugerido

Mostrar fila limpa com orientacao de que novas oportunidades aparecerao quando o sistema detectar horarios em risco ou espacos recuperaveis.

### Observacoes de UX

- revenue recovered deve ser facil de localizar
- status precisa ser simples e escaneavel
- a lista deve privilegiar clareza sobre densidade de informacao

## Reviews Setup

### Objetivo da Tela

Permitir revisar configuracao de reviews e acompanhar readiness do canal de solicitacao.

### Blocos Principais

```text
+----------------------------------------------------------------+
| Header: titulo + status do setup                                |
+----------------------------------------------------------------+
| Readiness: configured | incomplete | ready                      |
+----------------------------------------------------------------+
| Card de configuracao                                            |
| Google Reviews URL                                              |
| Canal principal                                                 |
| Modo ativo                                                      |
+----------------------------------------------------------------+
| Preview de request                                              |
+----------------------------------------------------------------+
| Lista curta de requests recentes ou metricas basicas            |
+----------------------------------------------------------------+
```

- status do setup
- indicador de readiness
- configuracao principal
- preview simples da solicitacao
- historico ou metricas basicas

### CTA Principal

`Salvar configuracao`

### CTA Secundario Se Existir

`Testar link`

### Estado Vazio Sugerido

Se o link do Google Reviews ainda nao existir, mostrar orientacao curta para completar a configuracao antes de disparar review requests.

### Observacoes de UX

- manter foco no Google Reviews, sem expandir canais fora do escopo
- email deve aparecer como canal padrao do MVP
- tela deve parecer configuracao premium e simples, nao painel tecnico

## Observacoes Gerais

- usar layouts com muito respiro e poucos blocos por tela
- CTAs primarios devem ser obvios e unicos por contexto principal
- estados vazios devem orientar o usuario para a proxima acao
- o produto deve parecer premium pela hierarquia e clareza, nao por excesso visual
