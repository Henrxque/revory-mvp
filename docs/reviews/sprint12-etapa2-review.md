# Sprint 12 — Etapa 2 Review

## objetivo da etapa
Endurecer a camada de attribution/renewal do dashboard para que ela continue agregando valor comercial quando saudável, mas não derrube a Revenue View quando houver falha parcial de runtime, drift de schema ou indisponibilidade pontual da subcamada de suporte.

## diagnóstico anterior
Antes desta etapa, a Revenue View dependia de uma única leitura acoplada:
- revenue principal
- momentum recente
- attribution support
- renewal/retention defense

O problema era estrutural: a mesma chamada agregada fazia consultas centrais e consultas opcionais de attribution no mesmo `Promise.all`. Resultado: bastava um campo ausente ou uma falha na subcamada de attribution para quebrar o dashboard inteiro, inclusive a leitura principal de revenue.

Na prática, o produto perdia exatamente o que mais precisava preservar em cenário degradado:
- booked proof
- revenue read
- executive value read

## pontos frágeis encontrados
- `getDashboardOverview` misturava consultas core e consultas de attribution em uma única execução crítica.
- A seleção de `client.hasLeadBaseSupport` dentro da leitura principal de revenue fazia o dashboard inteiro depender desse campo.
- O count de `leadBaseClientCount` também estava no caminho crítico.
- Não existia estado explícito de degradação parcial; a tela só sabia operar em modo “tudo certo” ou “quebra total”.
- A UI não tinha linguagem curta para sinalizar “revenue continua legível, support read ficou limitado”.

## mudanças realizadas
### 1. Desacoplamento entre core revenue e attribution support
Separei a camada de attribution para fora do caminho crítico da leitura principal.

Agora:
- revenue principal e momentum recente são calculados com dados mínimos e seguros
- attribution support é resolvido numa etapa dedicada
- falha de attribution não derruba booked proof nem revenue read

### 2. Fallback defensivo elegante
Implementei um resolver seguro para a camada de attribution:
- tenta carregar `leadBaseClientCount`, `bookedAppointmentsWithLeadBaseSupport` e `revenueWithLeadBaseSupport`
- se houver erro típico de drift/schema/runtime, faz fallback para estado `degraded`
- em vez de exceção fatal, a UI recebe valores nulos controlados e status explícito

### 3. Detecção de erro compatível com drift real
O hardening trata:
- `PrismaClientKnownRequestError` com `P2022`
- mensagens compatíveis com coluna ausente / campo ausente / `hasLeadBaseSupport`

### 4. Dashboard com leitura degradada segura
Quando attribution falha:
- Revenue View continua carregando
- `Executive read` continua mostrando revenue now e recent revenue
- `Attribution clarity` cai para estado `Limited`
- métricas específicas ficam como `Unavailable`
- a interface não finge dado nem cai em erro bruto

### 5. Validação controlada do modo degradado
Adicionei um gatilho interno apenas para validação técnica:
- `REVORY_FORCE_ATTRIBUTION_DEGRADED=1`

Ele não cria surface nova nem altera o comportamento normal do produto; só permite provar localmente que o fallback degradado funciona de ponta a ponta.

## arquivos alterados
- `C:\Users\\hriqu\\Documents\\revory-mvp\\services\\dashboard\\get-dashboard-overview.ts`
- `C:\Users\\hriqu\\Documents\\revory-mvp\\src\\app\\(app)\\app\\dashboard\\page.tsx`
- `C:\Users\\hriqu\\Documents\\revory-mvp\\docs\\reviews\\sprint12-etapa2-review.md`

## impacto em attribution reliability
Alto.

Antes:
- attribution era all-or-nothing
- um erro pontual podia matar a Revenue View inteira

Depois:
- attribution virou subcamada tolerante a falha
- a leitura principal deixou de depender da disponibilidade integral da camada de suporte
- o dashboard continua útil mesmo quando attribution não está íntegra

## impacto em renewal defense
Positivo e mais honesto.

O produto não perdeu renewal defense; ele ganhou uma forma mais segura de sustentá-la:
- quando attribution está saudável, renewal continua forte
- quando attribution falha, renewal não inventa continuidade nem quebra a tela
- a UI sinaliza limitação sem parecer erro caótico ou prometer o que não consegue ler naquele momento

## impacto em sale safety
Alto.

Essa etapa melhora a segurança comercial em três frentes:
- reduz risco de demo quebrada
- reduz risco de um workspace novo perder a Revenue View por dependência secundária
- protege a percepção premium em falha parcial, porque a interface continua curta, estável e economicamente legível

Em linguagem de venda: o app não fica mudo nem cai quando uma camada de suporte falha. Ele continua mostrando a parte mais importante do valor.

## riscos remanescentes
- O fallback degradado protege a UX, mas não substitui integridade de schema. Se houver drift, ele precisa continuar sendo corrigido na origem.
- `Attribution clarity` ainda depende de um modelo relativamente novo; a camada está mais segura, mas ainda merece watchlist nas próximas rodadas.
- O gatilho `REVORY_FORCE_ATTRIBUTION_DEGRADED` existe para validação técnica e não deve virar mecanismo operacional de rotina.

## julgamento final da etapa
**Aprovada.**

O dashboard agora está significativamente mais runtime-safe sem amputar a camada de valor recém-criada. A Revenue View continua narrow, revenue-first e premium, mas deixou de ser frágil a ponto de uma falha parcial em attribution derrubar a leitura principal.

## validação executada
### Estado saudável
- Revenue View carregou normalmente
- evidência: `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\sprint12-dashboard-healthy.png`

### Estado degradado forçado
- dashboard continuou abrindo
- `Revenue view` permaneceu viva
- `Limited` e `Unavailable` apareceram só na subcamada degradada
- nenhum `PrismaClientKnownRequestError` apareceu na UI
- evidência: `C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\sprint12-dashboard-degraded.png`

### Validação técnica
- `npm run lint` passou
- `npm run typecheck` passou
- `npm run build` passou
