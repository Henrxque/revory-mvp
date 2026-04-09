# REVORY Seller 2.0 — Manual Test Report

## 1. Objetivo do teste
Executar um teste manual completo do REVORY Seller 2.0 como se o produto estivesse prestes a ser vendido para MedSpas reais, validando não só funcionamento técnico, mas coerência de produto, clareza de proposta, força de onboarding, sustentação de valor, defensibilidade de preço e prontidão comercial.

O foco desta rodada foi responder uma pergunta de founder, não de QA superficial: o produto hoje sustenta venda real com segurança ou ainda depende demais de interpretação, setup invisível ou boa vontade do operador?

## 2. Ambiente e contexto
- Repositório testado: `C:\Users\hriqu\Documents\revory-mvp`
- Data do teste: `2026-04-08`
- Ambiente: local, `Next.js` em `http://localhost:3000`, `PostgreSQL` local, autenticação `NextAuth`, billing local marcado como ativo para permitir acesso ao shell.
- Execução combinou:
- teste manual/browser real com sessão autenticada controlada
- leitura estática de código para confirmar regras e limites do produto
- simulação de dados em CSV para `Booked proof` e `Lead base`
- Evidências principais:
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\00-start-auth.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\06-activation.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\07-imports-empty.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\10-imports-clients-smoke.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\14-dashboard-6mo.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\rerun-results.json`
- Evidência comparativa do mesmo dia, mostrando um estado saudável anterior:
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\09-dashboard-6mo-sim.png`
- `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\runtime-results.json`

### Premissas
- O produto foi avaliado contra o escopo narrow oficial: premium, self-service, MedSpa-first, booking-first, revenue-first, uma oferta principal, IA mínima e invisível.
- O plano analisado no fluxo in-app foi `Growth`, por ser o plano mais explicitamente defendido no produto.
- Para a análise de valor por plano, usei os preços informados no pedido: `Basic = US$370`, `Growth = US$570`, `Business = camada superior atual`.

### Limitações
- O teste manual foi real no browser, mas a autenticação foi instrumentada localmente por cookie de sessão assinado para destravar um fluxo repetível.
- A simulação de seis meses foi limitada pelo estado atual do produto: o app não tem modelagem nativa de objeções como entidade operacional. Essas objeções foram avaliadas como capacidade implícita de guidance e não como feature primária.
- O rerun limpo encontrou um problema real de banco/runtime: o dashboard que hoje depende de `clients.hasLeadBaseSupport` quebrou em ambiente local com `PrismaClientKnownRequestError` por coluna ausente. Isso impacta diretamente a nota final de vendabilidade.

## 3. Cenário fictício utilizado
### Clínica simulada
- Nome: `LUMINA AESTHETICS`
- Tipo: `MedSpa premium / semi-premium`
- Cidade: `Miami, FL`
- Main offer: `Lip Filler`
- Deal value médio: `US$650`
- Origem principal dos leads: `Meta Ads`
- Tom: `Premium, claro, confiante, não artificial`
- Fluxo esperado: lead entra por campanha da oferta principal e deve ser conduzido rapidamente para booking

### Simulação de 6 meses
| Mês | Leads | Booked | No-show | Mornos | Perdidos | Receita atribuída estimada |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 22 | 6 | 2 | 5 | 9 | US$3,900 |
| 2 | 28 | 8 | 2 | 6 | 12 | US$5,200 |
| 3 | 34 | 10 | 1 | 8 | 15 | US$6,500 |
| 4 | 31 | 9 | 3 | 7 | 12 | US$5,850 |
| 5 | 39 | 13 | 2 | 8 | 16 | US$8,450 |
| 6 | 42 | 14 | 2 | 10 | 16 | US$9,100 |

- Receita total estimada: `US$39,000`
- Ajuste usado no produto: revenue read ancorado em `booked appointments * US$650`, porque esse é exatamente o contrato que o próprio Seller promete quando `estimatedRevenue` não existe no CSV.

### Objeções simuladas
- preço
- “quero pensar”
- timing
- dúvida sobre procedimento
- dúvida sobre disponibilidade
- lead responde pouco
- lead some
- lead com alta intenção e urgência de agendar

Observação honesta: essas objeções não são modeladas como fluxo operacional explícito no produto. Hoje elas aparecem mais como pano de fundo da guidance layer do que como trilha operacional mensurável.

## 4. Fluxo testado ponta a ponta
### Login e entrada
- Abri `/start` autenticado, com billing ativo para `Growth`.
- O shell inicial é forte visualmente e já comunica um produto estreito.
- A página pública e a auth continuam premium e focadas.

### Onboarding
- Completei o setup em ordem:
- `Clinic name + Main offer`
- `Lead entry source`
- `Booking path`
- `Value per booking`
- `Seller mode`
- `Activation`
- O onboarding ficou mais concreto do que em rodadas antigas. Agora parece mais “estou configurando minha clínica” e menos “estou preenchendo um framework”.

### Ativação
- A surface de activation comunica melhor readiness e próxima ação.
- A CTA pós-setup empurra para a action correta sem abrir uma etapa longa.
- A sensação é de sistema pronto para começar a provar valor, não de projeto pela metade.

### Uso operacional
- Entrei em `Booking Inputs`.
- Testei estado vazio, import de `Booked proof` e import de `Lead base`.
- O empty state está melhor hierarquizado do que antes.
- A lane primária de proof e a lane secundária de support ficaram mais claras.

### Dashboard / leitura de valor
- Em evidências anteriores do mesmo dia, o dashboard aparecia corretamente revenue-first e com narrativa longitudinal curta, mas convincente.
- No rerun limpo do zero, o dashboard falhou ao tentar ler a nova camada de atribuição por causa de um schema/runtime mismatch.
- Resultado prático: a parte mais importante da defesa de renovação não se mostrou totalmente confiável em ambiente limpo.

## 5. Achados por etapa
### 5.1 Login e entrada
#### O que funcionou
- O produto parece premium logo na entrada.
- A proposta não parece genérica; continua narrow e focada.
- A landing e a auth não passam cheiro de CRM, inbox ou chatbot aberto.

#### O que falhou
- A entrada autenticada ainda depende de um runtime que precisa estar muito alinhado. Para venda real, isso não pode depender de ambiente “já arrumado”.

#### O que ficou confuso
- O produto não erra em mensagem na primeira entrada, mas a transição de `start -> app` ainda depende demais de consistência operacional de billing, auth e DB.

#### Bugs
- Nenhum bug visual relevante de primeira entrada.
- Risco maior está no que acontece depois, não na home/auth.

#### Fricções
- Baixas na superfície.
- Médias no bastidor: o fluxo real exige que o runtime esteja íntegro; isso não ficou invisível o suficiente durante o teste.

#### Risco de churn
- Baixo na entrada.

#### Risco de venda
- Baixo na primeira impressão.

#### Impacto em UX
- Positivo. A entrada ainda transmite produto premium.

#### Impacto em negócio
- Positivo para aquisição.
- Neutro para retenção, porque a defesa econômica ainda não é provada aqui.

### 5.2 Onboarding
#### O que funcionou
- O onboarding está mais concreto.
- A escolha da main offer e do clinic context agora parece mais real.
- O fluxo continua curto.
- Dá para imaginar founder vendendo sem call com mais segurança do que antes.

#### O que falhou
- Ainda existem defaults visuais que aliviam demais a decisão do usuário. Isso ajuda velocidade, mas reduz um pouco a percepção de “eu configurei isso conscientemente”.

#### O que ficou confuso
- `Mode` e partes da lógica de template ainda não são autoevidentes do ponto de vista de uma MedSpa que nunca viu o produto antes.

#### Bugs
- Nenhum blocker visual no onboarding apareceu no rerun.

#### Fricções
- Baixas.
- O setup continua curto de verdade.

#### Risco de churn
- Baixo. O onboarding já não parece um mini projeto.

#### Risco de venda
- Baixo a moderado. Melhorou bem, mas ainda não é perfeito na autoexplicação do porquê de cada decisão.

#### Impacto em UX
- Positivo. O setup está mais vendável.

#### Impacto em negócio
- Positivo. Reduz o risco de call obrigatória e preserva solo fit.

### 5.3 Ativação
#### O que funcionou
- A activation surface está mais confiante.
- A próxima ação fica clara.
- O produto comunica melhor “agora você está pronto para avançar”.

#### O que falhou
- A activation ainda depende de o restante do runtime sustentar a promessa. Sozinha, ela está boa. Em cadeia com imports + dashboard, a confiança sofre quando o backend não acompanha.

#### O que ficou confuso
- Pouco.
- A ativação não está barulhenta; isso é bom.

#### Bugs
- Nenhum bug visual relevante na surface.

#### Fricções
- Baixas.

#### Risco de churn
- Baixo isoladamente.

#### Risco de venda
- Baixo isoladamente.

#### Impacto em UX
- Positivo. A ativação hoje parece premium e curta.

#### Impacto em negócio
- Positivo. Ajuda bastante na sensação de prontidão.

### 5.4 Uso operacional
#### O que funcionou
- `Booking Inputs` está mais claro: `Booked proof` é a lane principal; `Lead base` virou support lane de verdade.
- CTAs e hierarchy reduziram o risco de importar na lane errada.
- A leitura de `proof first` ficou boa.

#### O que falhou
- O fluxo de seis meses não se sustentou de ponta a ponta no rerun limpo.
- Depois dos imports, o dashboard que deveria consolidar valor longitudinal quebrou por dependência de schema não refletida no banco local.

#### O que ficou confuso
- O produto sabe o que quer ser, mas ainda não mostra essa força com consistência operacional suficiente.
- Objeções e evolução comercial continuam mais implícitas do que operáveis.

#### Bugs
- Bug crítico de runtime no dashboard:
- `PrismaClientKnownRequestError`
- coluna ausente: `clients.hasLeadBaseSupport`
- evidência: `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun\14-dashboard-6mo.png`

#### Fricções
- Alta quando o usuário tenta consolidar valor após uso mais profundo.

#### Risco de churn
- Alto se isso acontecer em ambiente de cliente, porque quebra exatamente a prova de continuidade.

#### Risco de venda
- Alto. Isso é o tipo de falha que derruba confiança comercial.

#### Impacto em UX
- Muito negativo no cenário de erro.

#### Impacto em negócio
- Muito negativo. Sem dashboard consistente após import, o produto perde poder de retenção e defesa de preço.

### 5.5 Dashboard e atribuição
#### O que funcionou
- Conceitualmente, o dashboard está no caminho certo:
- revenue-first
- renewal read
- executive read
- retention defense
- attribution clarity
- Quando saudável, ele já conta uma história melhor de valor do que em sprints anteriores.

#### O que falhou
- No rerun limpo, a defesa de valor não foi reproduzível.
- A camada de atribuição endurecida depende de um schema que não estava presente no banco local.

#### O que ficou confuso
- A honestidade conceitual está boa.
- A confiança operacional ainda não está no teto porque a camada que deveria defender retenção foi justamente a que rompeu.

#### Bugs
- Mesmo bug crítico de schema/runtime.

#### Fricções
- Alta. O owner precisa confiar nisso sem founder por perto; hoje essa confiança ainda pode quebrar.

#### Risco de churn
- Alto a moderado. Se o cliente não vê a prova contínua com estabilidade, a renovação volta a depender de interpretação humana.

#### Risco de venda
- Alto para venda mais forte ou escala inicial.

#### Impacto em UX
- Forte queda no momento de maior expectativa de valor.

#### Impacto em negócio
- Dano direto em retenção, justificativa de preço e expansão de plano.

### 5.6 Experiência premium / percepção de valor
#### O que funcionou
- O produto continua premium em shell, composição, silêncio visual e direção narrow.
- Não parece CRM.
- Não parece chatbot.
- Não parece serviço escondido.
- Não parece software inchado.

#### O que falhou
- O premium feel já está forte, mas premium sem confiabilidade reprodutível não sustenta ticket alto por muito tempo.

#### O que ficou confuso
- Nada crítico em visual.
- O gap agora é menos estético e mais de credibilidade operacional.

#### Bugs
- Não são bugs de UI; são bugs que contaminam a leitura de valor.

#### Fricções
- Médias para preço alto.

#### Risco de churn
- Moderado se o cliente sentir que o app é bonito, mas instável na hora de defender valor.

#### Risco de venda
- Moderado a alto para topo de pricing.

#### Impacto em UX
- Positivo no look and feel.
- Negativo quando a confiança de dados é abalada.

#### Impacto em negócio
- O design ajuda muito a venda inicial.
- O runtime inconsistente ainda atrapalha a renovação.

## 6. Simulação de 6 meses
### O que a jornada deveria mostrar
| Mês | Leads | Booked | Receita estimada |
| --- | ---: | ---: | ---: |
| 1 | 22 | 6 | US$3,900 |
| 2 | 28 | 8 | US$5,200 |
| 3 | 34 | 10 | US$6,500 |
| 4 | 31 | 9 | US$5,850 |
| 5 | 39 | 13 | US$8,450 |
| 6 | 42 | 14 | US$9,100 |
| Total | 196 | 60 | US$39,000 |

### O que o produto conseguiu refletir
- Em evidência anterior do mesmo dia, o produto mostrou um dashboard convincente com `US$39,000`, `60 visible` e narrativa coerente de momentum.
- Isso indica que o modelo de valor do Seller faz sentido quando o runtime está íntegro.

### O que o produto não conseguiu refletir com segurança no rerun limpo
- A nova jornada do zero não sustentou o mesmo resultado.
- O dashboard que deveria mostrar a evolução de seis meses travou por problema de schema.
- O app não oferece leitura operacional nativa de objeções por mês, perdas por razão ou evolução de qualidade de resposta. Isso é coerente com o escopo narrow, mas limita um pouco a profundidade da retenção.

### Onde a ferramenta sustenta retenção
- Na tese: booked proof + revenue read + recent momentum + attribution clarity.
- Na UX: o dashboard já sabe como defender continuidade sem virar BI.

### Onde a ferramenta perde força
- Na confiabilidade de execução de ambiente limpo.
- Na ausência de uma camada longitudinal totalmente robusta e reproduzível sem founder interpretando.

## 7. Avaliação por plano
### 7.1 Basic — US$370
#### Percepção de valor
O `Basic` melhorou bastante em framing. Hoje ele parece um `premium entry`, não um plano “capado”. Isso ajuda.

#### Aderência ao ICP
Boa para MedSpas menores com uma offer principal clara e volume controlado.

#### Justificativa de preço
`US$370` está quase no limite superior do que o produto sustenta com folga no estado atual. Quando tudo funciona, é defendável. Quando a prova longitudinal falha, fica apertado.

#### Risco comercial
Moderado. Se a cliente não perceber revenue clarity cedo, pode achar o plano caro para um produto narrow.

#### Recomendação
Vendável, mas não como aposta mais fácil. Precisa de onboarding muito bem calibrado e ambiente estável.

### 7.2 Growth — US$570
#### Percepção de valor
É claramente o plano mais coerente com a narrativa atual do produto.

#### Aderência ao ICP
Alta. Growth parece o plano natural para a MedSpa que já investe em mídia paga e quer defender booked appointments + revenue read.

#### Justificativa de preço
Quando o dashboard longitudinal está funcionando, `US$570` é o preço mais defendável do produto hoje.

#### Risco comercial
Moderado por causa do runtime inconsistente; baixo no posicionamento.

#### Recomendação
Continua sendo o plano principal de venda. É o mais blindado conceitualmente.

### 7.3 Business
#### Percepção de valor
Ainda parece mais vendável na narrativa do que na entrega concreta.

#### Aderência ao ICP
Baixa a moderada para agora. O topo já está mais honesto, mas ainda não tem robustez suficiente para empurrar forte.

#### Justificativa de preço
Não sustentaria com conforto um ticket superior sem resolver primeiro estabilidade de atribuição, reprodutibilidade e defesa longitudinal.

#### Risco comercial
Alto. O topo pode soar maduro demais para o nível de robustez realmente provado.

#### Recomendação
Não usar como motor principal de venda ainda. Deixar como camada superior seletiva, sem oversell.

## 8. Avaliação de viabilidade do produto
- Existe viabilidade? `Sim.`
- A proposta é forte? `Sim.`
- A entrega atual condiz com a promessa? `Parcialmente.`
- O produto parece vendável ou ainda incompleto? `Vendável com ressalvas operacionais importantes.`

### Leitura honesta
O REVORY Seller hoje parece mais `E. um produto já vendável` na superfície e `B. um app promissor, mas ainda imaturo operacionalmente` quando submetido a rerun limpo e à cobrança de retenção real.

Traduzindo: a tese está boa, a UX está forte e a direção comercial está correta. O ponto que impede nota mais alta não é mais posicionamento. É confiabilidade de runtime na parte mais sensível da prova de valor.

## 9. Avaliação de pricing
- `Basic — US$370`: preço `ok`, mas perto do limite do que o estado atual sustenta hoje.
- `Growth — US$570`: preço `ok` e mais defensável do que o resto da grade.
- `Business`: preço `acima do que o produto sustenta hoje` se for vendido agressivamente como camada madura.

### Leitura sem suavizar
O problema do pricing não está mais em branding fraco. Está em profundidade e confiabilidade de defesa de valor. Se o dashboard e a atribuição estiverem estáveis, o pricing sobe junto. Se a camada de valor continuar sensível a drift de ambiente, o preço começa a parecer ousado demais.

## 10. O que falta para vender com segurança
### Bloqueadores
- Corrigir a inconsistência de schema/runtime que quebrou o dashboard em ambiente limpo:
- coluna ausente `clients.hasLeadBaseSupport`
- erro em `get-dashboard-overview.ts`
- Garantir que a jornada limpa de import -> dashboard -> retention read seja reproduzível sem ambiente “pré-ajustado”.

### Importantes
- Fortalecer ainda mais a defesa longitudinal de valor sem inflar o produto.
- Reduzir dependência de interpretação humana na renovação.
- Refinar a forma como defaults de onboarding são percebidos para parecerem recomendação, não decisão tomada.

### Melhorias premium
- Dar um pouco mais de concretude operacional à evolução dos últimos meses sem virar analytics suite.
- Refinar a profundidade do topo de planos para quando o produto estiver mais maduro.

### Nice-to-have
- Melhorar evidência in-app de ganho por source principal e offer principal ao longo do tempo.
- Tornar mais explícita a ponte entre guidance curta e impacto de booking sem aumentar ruído.

## 11. Julgamento final de vendabilidade
### Notas
- Clareza de proposta: `9.2`
- Onboarding: `8.7`
- Percepção premium: `9.4`
- Tracking / atribuição: `7.5`
- Valor percebido: `8.2`
- Justificativa de preço: `7.8`
- Prontidão para venda: `8.0`

### Veredito final
`VENDÁVEL COM RESSALVAS`

### Por quê
O produto já é bom o suficiente para vender de forma disciplinada, especialmente em `Growth`, mas ainda não é seguro tratá-lo como blindado para venda mais forte enquanto a camada mais importante de defesa de renovação puder quebrar em um rerun limpo. O problema não é tese nem visual. É confiabilidade da prova de valor.

## 12. Recomendação executiva final
Se eu estivesse aconselhando o founder hoje:

- `Pode vender?` Pode, mas com disciplina.
- `Pode vender Growth?` Sim. É o plano mais coerente e mais fácil de defender.
- `Pode empurrar topo?` Não agressivamente.
- `Pode escalar mais forte agora?` Ainda não com conforto.
- `Precisa corrigir pricing?` Não necessariamente. Primeiro precisa corrigir estabilidade e reprodutibilidade da leitura de valor.
- `Precisa fortalecer dashboard?` Sim, mas o principal agora não é mais adicionar camada. É garantir que a camada atual funcione de forma confiável em ambiente limpo.
- `Precisa reforçar onboarding?` Só incrementalmente.
- `Precisa reforçar prova de valor?` Sim. Esse continua sendo o coração da renovação.

### Recomendação final ao founder
Venda `Growth` com confiança moderada, mantenha `Basic` como entrada seletiva e segure ambição comercial do topo. Antes de empurrar venda mais forte ou escalar aquisição, resolva a consistência entre migrations, banco e dashboard. O produto já está comercialmente bom o bastante para convencer; o que ainda falta é blindar a confiança operacional para não desperdiçar essa venda depois.
