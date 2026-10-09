# Sprint 10 — evidência de homologação remota (2026-10-09)

## Ambiente e decisão

- Branch: `migration/ai-saas-sprint-10` no projeto Vercel `revory-mvp` (Preview).
- URL: `https://revory-mvp-git-migration-ai-saas-sprint-10-henrxques-projects.vercel.app`.
- A proteção Vercel Authentication respondeu com redirecionamento SSO (`302`) a uma requisição anônima. Uma sessão Vercel autorizada abriu o preview.
- Banco: `revory_ai_sandbox_48878a64f5c2`, distinto de `neondb` usado na configuração local principal. `DATABASE_URL` é Secret do Vercel limitado a essa branch. As três flags de habilitação também têm escopo exclusivo nessa branch. Nenhuma URL de conexão ou senha é registrada aqui.
- A verificação antes de `prisma migrate deploy` exige nome exato do banco sintético em Preview e falha antes da migração quando o alvo diverge. A primeira tentativa de deploy falhou por essa proteção; após configurar o Secret, o redeploy Preview ficou `READY`.
- `revory.app`, domínio de produção, configurações de OAuth/Resend e Stripe não foram alterados nesta sprint.

## Percurso confirmado no alvo remoto

1. Login com a conta fictícia `ai-sandbox@revory.local` e sessão persistente funcionaram. `/app` redirecionou para o dashboard AI SaaS.
2. Dashboard exibiu três tipos de importação sintética e histórico de relatórios. CSV arbitrário foi rejeitado com a mensagem da política das três amostras permitidas.
3. Amostra Stripe permitida passou por revisão de colunas e Data Quality. Reimportação retornou o lote existente sem duplicar registros.
4. Página de identidade exibiu mapeamento explícito, cobertura de 74,94% e USD 615,25 de custo reportado sem vínculo confiável.
5. Novo scan do período fictício 2026-08-01 a 2026-09-01 produziu dois itens de revisão: diferença calculada de 380.000 tokens e USD 615,25 de spend sem atribuição. JSON de evidência e CSV de dois findings foram baixados e inspecionados.
6. Segundo usuário e workspace fictícios foram criados para checagem. `getAiIntegrityScan` leu o relatório no workspace dono e retornou `null` no outro workspace. A segunda conta autenticou remotamente; seu acesso à interface parou corretamente no aceite legal, que não foi aceito pelo agente.
7. Build local de produção com flags de Preview, TypeScript, ESLint e `qa:ai-integrity-sprint-10` passaram. O build listou o proxy que redireciona telas antigas e bloqueia APIs contractor no preview sintético; confirmar o mesmo comportamento após o próximo deploy.

## Inventário de rotas e dependências

| Grupo | Classificação | Condição no preview | Dependência para mudança definitiva |
| --- | --- | --- | --- |
| Login, cadastro, reset, verificação, sessão e `/api/auth` | keep | Código e configuração preservados; login por senha verificado | Testar OAuth Google, e-mails e callbacks no host aprovado |
| `/app`, shell e navegação | adapt | Dashboard e navegação AI SaaS | QA mobile e aceite completo do fluxo |
| `/app/ai-integrity/*` e `/api/ai-integrity/*` | adapt | Apenas amostras fictícias; checkout remoto indisponível | Pilotos, fonte real e gates comerciais posteriores |
| `/app/dashboard`, imports, setup, Quote Recovery e Revenue Realization | retire após substituição | Implementação histórica preservada no repositório; proxy bloqueia navegação direta no Preview sintético | Gate de substituição, export e política de retenção |
| `/api/canonical-intake`, `/api/billing`, `/api/jobs` | retire após substituição | Proxy bloqueia no Preview sintético | Substituição validada e decisão de migração específica |
| `/api/webhooks/resend` | keep | Serviço e rota preservados; proteção de Preview impede uso normal externo | Validar no ambiente e callback aprovados |

## Gate ainda aberto

**FAIL / NO_GO para usar este ambiente como base da Sprint 11 ou para dados reais.** Ainda falta prova de backup e restauração em alvo independente. Uma branch Neon do projeto atual copiaria também o banco principal, por isso não foi criada apenas para satisfazer a checklist. Google OAuth, entrega Resend, reset/verificação e responsividade desktop/mobile não têm ensaio completo neste preview. A proteção Vercel exige acesso autorizado para o fundador. O preview permite somente amostras fictícias e não aceita pagamento; não há comprador pago verificado.
