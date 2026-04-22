# REVORY Seller — Full Product QA Bug Hunter Review

## 1. Leitura geral do estado do produto

- O core do produto está funcional no ambiente local atual. O app autenticado abre, onboarding/setup completo existe, imports sustentam booked proof/revenue, booking assistance carrega, Quick Add cria oportunidade, Action Pack copia, handoff registra abertura, Executive Proof Summary copia e abre versão printável, LLM bounded tem fallback e `env:check` passa.
- O produto está mais sólido do que frágil no fluxo principal. A maior parte dos bugs encontrados não está no booking core, mas em bordas de confiança: redirect de auth, lint/CI, links legais e coerência operacional de migrations.
- O ponto que parece mais pronto do que realmente está é a camada pública/self-service: pricing e CTA funcionam em modo controlado, mas checkout depende de Stripe env real; Privacy/Terms parecem links reais, mas voltam para `/`; auth tem um redirect bug que não aparece em uso normal, mas é sério para confiança.
- A camada privada passou melhor: Quick Add, blocked reason, conflito de identidade, stale read, proof share/print e LLM fallback não quebraram na rodada hands-on.

## 2. Fluxos testados

- Landing pública: carregamento, CTAs para `/start`, mojibake visível, footer links e console errors.
- Pricing/start: usuário autenticado sem billing, planos Basic/Growth/Premium, estado `Stripe env missing`, tentativa de checkout Growth e fallback `billing=unavailable`.
- Auth: redirect de `/app` sem sessão, sign-in/sign-up com `redirect_url`, sessão NextAuth local criada por token JWT.
- App autenticado: entrada em `/app`, redirect para dashboard ativo, shell privado.
- Activation/adjust setup: `/app/setup/deal_value?edit=1`, tentativa com valor inválido e erro esperado `error=deal_value`.
- Imports/Booking Inputs: surface carregando Daily Brief, Quick Add, Booking Assistance e lista curta.
- Manual Lead Quick Add: submit bloqueado sem contato; phone-only com booking path email vira `BLOCKED / ineligible_for_handoff`; identidade conflitante retorna erro visível.
- Source Freshness/Stale Read: manipulação controlada de `lastImportedAt`; stale aparece após revalidação de cache.
- Executive Proof Summary: `Copy summary` mostra sucesso real; `Print or save PDF` abre Blob URL não vazia, sem `about:blank` e sem `Copy failed`.
- LLM runtime/fallback: `npm run llm:qa` passou happy path, invalid JSON, provider failure, schema mismatch e timeout.
- Ambiente: `npm run env:check`, `npm run typecheck`, `npm run db:validate`, `npx prisma migrate status`, `npm run build`, `npm run lint`, tentativa de `rg --version`.

## 3. Bugs críticos encontrados

### Auth redirect aceita URL protocol-relative externa

- Severidade: crítica.
- Onde acontece: auth sign-in/sign-up redirect normalization.
- Como reproduzir:
  - Com sessão autenticada, chamar `/sign-in?redirect_url=%2F%2Fevil.example`.
  - Com sessão autenticada, chamar `/sign-up?redirect_url=%2F%2Fevil.example`.
- Comportamento esperado: `redirect_url` deveria aceitar apenas paths internos normais, por exemplo `/app`, ou cair para fallback seguro.
- Comportamento atual: resposta `307` com `Location: //evil.example` nos dois casos.
- Impacto no produto: isso é open redirect. Não quebra o core de booking, mas quebra confiança de auth e pode ser explorado em link malicioso/phishing. Para produto premium self-service, é bug de confiança real.
- Causa provável: `normalizeAuthRedirectTarget` aceita qualquer string que começa com `/`, incluindo `//evil.example`.
- Arquivo/área provável: `services/auth/redirects.ts`, linhas 13-14.
- Recomendação: corrigir agora. Rejeitar `//`, normalizar backslashes e manter fallback para `/app` quando o path não for claramente same-origin.

## 4. Bugs médios encontrados

### `npm run lint` falha no código-fonte atual

- Severidade: média.
- Onde acontece: pipeline local de qualidade.
- Como reproduzir: executar `npm run lint`.
- Comportamento esperado: lint deveria passar se o produto está pronto para venda/demo com confiança disciplinada.
- Comportamento atual: lint falha com 2 errors e 3 warnings com `--max-warnings=0`.
- Impacto no produto: não quebra runtime local nem build, mas quebra readiness de CI/qualidade. Se lint for gate de deploy, é bloqueador operacional.
- Causa provável:
  - `components/proof/ExecutiveProofSummarySheet.tsx:30`: `setCanShare` síncrono dentro de `useEffect`.
  - `src/app/(app)/app/layout.tsx:160`: `<a href="/app/setup">` interno em vez de `Link`.
  - `src/app/(app)/app/dashboard/page.tsx:188`: `SignalCard` não usado.
  - `src/app/(app)/app/layout.tsx:23` e `src/app/(app)/app/layout.tsx:98`: helpers/variáveis não usados.
- Arquivo/área provável: `components/proof/ExecutiveProofSummarySheet.tsx`, `src/app/(app)/app/layout.tsx`, `src/app/(app)/app/dashboard/page.tsx`.
- Recomendação: corrigir agora se lint participa do CI; caso contrário, curto prazo antes de qualquer release/demo externa.

### Histórico local de migrations tem registro no banco que não existe no repo

- Severidade: média.
- Onde acontece: coerência operacional do banco local.
- Como reproduzir: comparar `_prisma_migrations` com `prisma/migrations`.
- Comportamento esperado: migrations aplicadas no banco deveriam existir no diretório de migrations ou estar explicitamente documentadas como artefato local.
- Comportamento atual:
  - `npx prisma migrate status` passa.
  - `npm run env:check` passa.
  - Mas o banco tem uma migration extra: `20260411223208_sprint_12_5_auth_provider_expansion`.
  - Essa migration não existe em `prisma/migrations`.
- Impacto no produto: não quebra o app hoje. Mas é risco de reprodutibilidade e auditoria: outro ambiente não consegue explicar totalmente o histórico do banco local a partir do repo.
- Causa provável: migration antiga aplicada localmente e depois removida/renomeada no repositório.
- Arquivo/área provável: Prisma migration history/local DB.
- Recomendação: investigar e normalizar documentação ou histórico antes de tratar esse ambiente como baseline limpo. Não usar workaround que mascare schema real.

## 5. Bugs pequenos, mas perigosos para confiança

### Footer da landing tem Privacy e Terms apontando para `/`

- Severidade: pequena, mas perigosa para confiança.
- Onde acontece: landing page pública.
- Como reproduzir: abrir `/` e clicar em `Privacy` ou `Terms`.
- Comportamento esperado: abrir páginas reais de Privacy/Terms ou remover/rebaixar links até existirem.
- Comportamento atual: ambos apontam para `/`, parecendo links legais reais mas voltando para a landing.
- Impacto no produto: em venda self-service premium, isso passa sensação de software ainda incompleto. Não afeta booking core, mas afeta confiança pré-compra.
- Causa provável: placeholders preservados no footer.
- Arquivo/área provável: `src/app/page.tsx`, linhas 136-142.
- Recomendação: corrigir curto prazo. Criar páginas legais mínimas reais ou remover os links até existirem.

### `rg` está indisponível no ambiente local desta sessão

- Severidade: pequena, operacional.
- Onde acontece: tooling local de QA/dev.
- Como reproduzir: executar `rg --version`.
- Comportamento esperado: `rg` deveria executar normalmente.
- Comportamento atual: PowerShell retorna `Falha na execução do programa 'rg.exe': Acesso negado`.
- Impacto no produto: não é bug do app. Afeta velocidade/confiabilidade de auditoria local e força fallback para `Select-String`.
- Causa provável: permissão/instalação do `rg.exe` empacotado no ambiente Codex desktop.
- Arquivo/área provável: ambiente local, não repo.
- Recomendação: não bloquear release por isso, mas registrar como atrito de QA local.

## 6. Pontos não exatamente quebrados, mas ainda frágeis ou enganosos

- Checkout self-service está correto ao falhar de forma controlada quando Stripe env falta, mas não deve ser vendido como fluxo de pagamento live enquanto `Stripe env missing` estiver ativo. No teste, Growth redirecionou para `/start?billing=unavailable&plan=growth`, sem quebrar.
- Source Freshness funciona, mas passa por cache de aproximadamente 10 segundos via `unstable_cache`. Isso é aceitável para uma leitura executiva, desde que a copy não sugira engine real-time. Em teste manual, stale apareceu depois da revalidação.
- O app ainda tem documentação antiga mencionando Clerk em alguns docs históricos. Não é bug de produto, mas pode confundir manutenção se alguém usar docs antigos como referência operacional de auth.
- O auth redirect para URL absoluta externa como `https://evil.example/takeover` não sai do domínio; ele normaliza para `/takeover`. Isso é seguro contra redirect externo, mas ainda pode gerar path interno inexistente. O bug real é o caso `//evil.example`.
- O QA hands-on cria dados reais em workspace local. Isso é aceitável em ambiente de teste, mas o produto ainda se beneficiaria de um script explícito de cleanup/reset de QA para não acumular leads artificiais.

## 7. Estado de readiness de ambiente

- `npm run env:check`: passou.
- `npm run typecheck`: passou.
- `npm run db:validate`: passou.
- `npx prisma migrate status`: passou, com banco up to date.
- `npm run build`: passou.
- `npm run llm:qa`: passou, incluindo fallback de erro, timeout e schema mismatch.
- `npm run lint`: falhou. Este é o principal problema operacional atual.
- Migrations: sem pendentes, mas com um registro extra no banco local que não existe no diretório `prisma/migrations`.
- Banco local: funcional para app e QA hands-on. Não apresentou inconsistência de schema que quebre runtime.
- Evidência do harness: `.tmp/manual-audit/full-product-qa/full-product-qa-results.json`.

## 8. Top 10 correções recomendadas

1. Fixar open redirect em `normalizeAuthRedirectTarget`.
   - Prioridade: P1.
   - Impacto esperado: remove risco de segurança/confiança em auth.
   - Esforço estimado: baixo.
   - Recomendação: hotfix.

2. Fazer `npm run lint` passar.
   - Prioridade: P1.
   - Impacto esperado: restaura readiness de CI/qualidade.
   - Esforço estimado: baixo.
   - Recomendação: hotfix.

3. Corrigir ou remover links `Privacy` e `Terms` mortos.
   - Prioridade: P2.
   - Impacto esperado: melhora confiança self-service pré-compra.
   - Esforço estimado: baixo.
   - Recomendação: curto prazo.

4. Reconciliar migration extra no banco local.
   - Prioridade: P2.
   - Impacto esperado: melhora reprodutibilidade operacional.
   - Esforço estimado: baixo/médio.
   - Recomendação: curto prazo.

5. Adicionar teste automatizado para auth redirect same-origin.
   - Prioridade: P2.
   - Impacto esperado: impede regressão do bug crítico.
   - Esforço estimado: baixo.
   - Recomendação: curto prazo.

6. Adicionar smoke automatizado para Executive Proof copy/print.
   - Prioridade: P2.
   - Impacto esperado: protege uma surface comercial sensível.
   - Esforço estimado: baixo/médio.
   - Recomendação: curto prazo.

7. Adicionar smoke automatizado para Quick Add + blocked reason.
   - Prioridade: P2.
   - Impacto esperado: protege booking assistance contra regressão.
   - Esforço estimado: médio.
   - Recomendação: curto prazo.

8. Criar cleanup/reset leve para dados QA locais.
   - Prioridade: P3.
   - Impacto esperado: reduz sujeira em workspace de teste.
   - Esforço estimado: baixo/médio.
   - Recomendação: depois.

9. Deixar explícito em QA que freshness/stale tem cache curto.
   - Prioridade: P3.
   - Impacto esperado: evita falso positivo/falso negativo em testes manuais.
   - Esforço estimado: baixo.
   - Recomendação: depois.

10. Atualizar docs operacionais antigos de auth que ainda mencionam Clerk.
    - Prioridade: P3.
    - Impacto esperado: reduz confusão de manutenção.
    - Esforço estimado: baixo.
    - Recomendação: depois.

## 9. Veredito executivo final

- O produto core está realmente funcional no ambiente testado. O fluxo principal não parece uma casca: setup, import, dashboard, booking assistance, Quick Add, Action Pack, handoff, proof summary, LLM fallback e env readiness passaram.
- O que ainda está quebrado de verdade: auth redirect com `//evil.example`, lint quebrado e links legais mortos. O primeiro é o bug mais sério porque toca segurança/confiança. O segundo é readiness operacional. O terceiro é pequeno, mas ruim para venda self-service premium.
- O que mais ameaça demo/venda/confiança: open redirect em auth se descoberto, `npm run lint` falhando se aparecer em CI, e Privacy/Terms falsos se o buyer clicar antes de comprar.
- O produto está mais perto de “pronto” do que de “cheio de buracos escondidos”. A caça agressiva não encontrou quebra no booking core, nem no proof print/copy, nem em Quick Add, nem no fallback LLM. Mas ainda não está “limpo”: os bugs encontrados devem ser corrigidos antes de tratar a build como comercialmente madura.
- Recomendação executiva como QA Bug Hunter: corrigir agora o redirect e o lint; corrigir Privacy/Terms logo depois; reconciliar migration history antes de usar este ambiente como baseline confiável. Não abrir feature nova para resolver esses problemas.
