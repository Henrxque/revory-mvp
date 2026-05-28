# REVORY Seller — Launch Readiness Execution

## 1. Leitura do estado atual

- O core do REVORY Seller está funcional no ambiente local: onboarding/setup, imports, dashboard/revenue read, booking assistance, Manual Lead Quick Add, Action Pack, Executive Proof Summary, LLM bounded/fallback e gating simples Basic vs Growth foram validados.
- A camada pública já está mais coerente com a estratégia atual: Basic como entrada limitada, Growth como plano principal completo do MVP e Premium como futuro/indisponível agora.
- A autenticação ficou mais madura: Google foi mantido, email/senha foi implementado e reset de senha foi preparado com token seguro.
- O produto ainda não está pronto para venda paga real em self-service até receber configuração externa de Stripe e email transacional.
- O que falta para vender não é feature estrutural do produto. É configuração externa de billing, envio de email e domínio/callbacks finais de produção.

## 2. O que foi executado

### Landing / pricing

- Revisei a estratégia atual de planos no código e validei que a superfície pública comunica Growth como plano principal.
- Mantive Basic público e limitado, sem reabrir tiering complexo.
- Mantive Premium como future tier, sem checkout e sem motion manual.
- Corrigi o estado de `/start` para exibir mensagem honesta quando Stripe não está configurado para Basic/Growth, em vez de deixar o usuário cair em uma rota sem explicação suficiente.

### Auth

- Mantive Google login.
- Implementei login e cadastro com email/senha via Credentials Provider.
- Removi dependência de copy Google-only nas telas de entrada.
- Ajustei o label dos formulários para `Work email`, deixando entrada e reset mais claros para self-service.
- Confirmei que não há restos relevantes de Meta/Facebook no código pesquisado.
- Preservei redirect seguro de auth e validei que redirect protocol-relative externo não escapa para domínio externo.

### Forgot password / reset

- Implementei fluxo de solicitação de reset de senha.
- Implementei geração de token seguro, hash do token no banco e expiração curta.
- Implementei página de reset com validação de token inválido/expirado.
- Preparei envio por Resend, mas sem fingir que email funciona quando as credenciais não existem.
- Quando email delivery não está configurado, a UI retorna mensagem honesta de configuração pendente.

### Stripe / billing

- Revisei o runtime de billing contra a estratégia atual.
- Mantive Basic e Growth como planos públicos possíveis de checkout.
- Mantive Growth como plano principal completo do MVP.
- Mantive Premium fora de checkout self-service.
- Atualizei `.env.example` para deixar claro quais variáveis são necessárias para Basic/Growth e que Premium é futuro.
- Não validei checkout real porque não há `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BASIC_PRICE_ID` e `STRIPE_GROWTH_PRICE_ID` configurados no ambiente.

### QA

- Rodei validações de lint, typecheck, build, env readiness, Prisma, LLM e rerun limpo do produto.
- Executei QA headless cobrindo landing, pricing, signup, signin, forgot password, reset inválido, checkout unavailable, Premium future, gates Basic/Growth, redirect malicioso e activation/import/dashboard rerun.
- Corrigi problemas encontrados durante o QA em vez de apenas documentar.

### Onboarding / app readiness

- Corrigi bug real no activation path causado por cache de data source no onboarding.
- Após a correção, o clean rerun passou pelo setup, imports, activation e dashboard.
- Atualizei o script de rerun para aceitar a copy atual de imports, evitando falso negativo de QA.

### Bugs / fixes

- Corrigi estado honesto de Stripe unavailable no `/start`.
- Corrigi cache stale no onboarding activation.
- Corrigi script de QA que esperava copy antiga de imports.
- Corrigi copy/encoding quebrado no card de Executive Proof Summary.
- Endureci `env:check` para validar as novas colunas críticas de auth/password reset.

## 3. O que foi corrigido

- Email/password auth real foi adicionado.
- Forgot/reset password foi implementado com token seguro e expiração.
- Google login foi preservado.
- Meta/Facebook ficou fora do escopo e não foi exposto.
- Formulários de auth/reset agora usam `Work email`, reduzindo leitura genérica e melhorando clareza de entrada.
- O `/start` agora comunica Stripe indisponível de forma explícita quando checkout não está configurado.
- Activation path deixou de falhar por leitura stale de onboarding data source.
- QA clean rerun voltou a passar com a copy atual do produto.
- Basic gate foi validado para esconder Manual Lead Quick Add e copy/share/print da proof.
- Growth foi validado com Manual Lead Quick Add disponível e Executive Proof Summary acionável.
- Premium foi validado como futuro, sem checkout direto.
- Open redirect malicioso em auth foi validado como bloqueado.
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run env:check`, `npx prisma migrate status`, `npm run db:validate`, `npm run llm:env`, `npm run llm:smoke`, `npm run llm:qa` e `npm run qa:clean-rerun` passaram.

## 4. O que ainda falta

- Configurar Stripe para venda real: secret key, webhook secret e price IDs de Basic/Growth.
- Configurar email transacional para reset de senha: `RESEND_API_KEY` e `AUTH_EMAIL_FROM`.
- Configurar domínio/callbacks finais de produção para NextAuth/Google OAuth.
- Opcional, mas recomendado antes de tráfego frio maior: rate limiting/captcha leve em signup e forgot password.
- Opcional para uma fase posterior: email verification. Não é bloqueador do MVP se o objetivo for vender com baixa escala inicial e controle de qualidade.

## 5. Bloqueios reais que dependem de mim

### Stripe para venda real

- Por que depende de mim: exige credenciais e price IDs da conta Stripe.
- O que preciso: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BASIC_PRICE_ID` e `STRIPE_GROWTH_PRICE_ID`.
- Impacto de não resolver: Basic/Growth não conseguem vender de verdade por checkout self-service. O produto continua funcional, mas billing fica indisponível.

### Email transacional para reset de senha

- Por que depende de mim: exige credencial de provedor de email e remetente autorizado.
- O que preciso: `RESEND_API_KEY` e `AUTH_EMAIL_FROM`, ou decisão explícita por outro provedor.
- Impacto de não resolver: email/senha funciona, mas “esqueci minha senha” não consegue enviar link real para o usuário em produção.

### Domínio e callbacks de produção

- Por que depende de mim: depende do domínio final de lançamento e da configuração no Google OAuth/ambiente de deploy.
- O que preciso: domínio final, `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL` de produção e callback URLs configuradas no Google OAuth.
- Impacto de não resolver: Google login pode funcionar localmente, mas falhar ou gerar baixa confiança em produção.

## 6. Veredito executivo atual

- O produto está tecnicamente muito mais perto de venda real do que antes: core funcional, auth madura, reset preparado, pricing mais honesto, gates simples validados e QA amplo passando.
- O REVORY Seller ainda não deve ser considerado “pronto para vender com dinheiro real em self-service” enquanto Stripe e email transacional não forem configurados.
- O que impede venda real agora é principalmente credencial/configuração externa, não falta estrutural de produto.
- Minha recomendação final: configurar Stripe Basic/Growth, configurar Resend, ajustar domínio/callbacks finais e rodar um último smoke test em produção. Depois disso, vender Growth como plano principal, Basic como entrada limitada e Premium apenas como futuro.
