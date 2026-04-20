# Sprint 18 — Auth Maturity Architecture

## Leitura do estado atual

O estado atual de auth do REVORY Seller esta funcional, mas ainda nao esta semanticamente maduro.

Hoje o caminho real de autenticacao sustentado pelo produto e:

- `NextAuth` com `GoogleProvider` em [auth.ts](C:\Users\hriqu\Documents\revory-mvp\auth.ts)
- sessao JWT simples
- `sign-in` e `sign-up` com surface premium propria
- `sign-out` funcional

O principal problema nao esta na infra base. Esta na diferenca entre o que o runtime realmente suporta e o que a UI ainda sugere.

Os ruidos mais claros sao:

- [components/auth/AuthOptionsPanel.tsx](C:\Users\hriqu\Documents\revory-mvp\components\auth\AuthOptionsPanel.tsx) ainda mostra `Email`, `Password`, CTA de email e botao `Continue with Meta`
- `Meta` aparece como provider possivel, mas nao existe provider registrado em [auth.ts](C:\Users\hriqu\Documents\revory-mvp\auth.ts)
- `emailConfigured` depende apenas de `AUTH_EMAIL_FROM` em [services/auth/provider-config.ts](C:\Users\hriqu\Documents\revory-mvp\services\auth\provider-config.ts), mas nenhum provider de email existe no runtime
- o usuario hoje pode ler a screen como "auth multiprovider em maturacao", quando o produto na pratica e `Google-first` e quase `Google-only`

Isso gera dois riscos:

- capability fake
- excesso de superficie de auth para um produto que deveria parecer estreito, real e confiavel

## Arquitetura proposta

A arquitetura minima e correta para a Sprint 18 e:

- assumir `Google` como caminho principal e explicitamente recomendado
- tratar `sign-in` e `sign-up` como duas entradas do mesmo fluxo curto de workspace access
- remover da superficie qualquer affordance que leia como provider real sem backend real
- manter a camada de auth curta e premium, sem chooser amplo de autenticacao

Em termos de produto, a frente de `Auth Maturity` nao deve significar "mais providers". Deve significar:

- menos ruido
- menos simulacao de capability
- mais confianca no caminho real
- menos atrito cognitivo no primeiro acesso

Em termos tecnicos, a arquitetura recomendada e:

- `Google` continua como unico provider real por enquanto
- `sign-in` e `sign-up` continuam como paginas proprias, mas com painel simplificado
- `provider-config` deve refletir apenas providers realmente suportados pelo runtime
- o estado "configurado" deve depender do provider existir de verdade, nao de env isolada que nao fecha o fluxo

## Caminho real de auth

O caminho real recomendado para o produto hoje deve ser:

1. usuario chega em `sign-in` ou `sign-up`
2. usuario ve um unico caminho principal: `Continue with Google`
3. `Google` autentica via `NextAuth`
4. o usuario volta para o workspace e segue para o fluxo correto

Esse caminho e coerente com o produto atual porque:

- e curto
- e confiavel
- reduz suporte
- reduz falsa promessa
- preserva o produto como software narrow, nao como suite de identidade

`Sign in` e `Create account` podem continuar existindo como contexto de entrada, mas a experiencia interna deve ser a mesma familia de fluxo: `workspace access through Google`.

## Itens a remover ou ajustar

Itens a remover da surface:

- campos `Email` e `Password` enquanto nao houver provider real de email/password
- CTA primario de email/password enquanto nao houver submit funcional real
- botao `Continue with Meta`
- nota `Email and password will connect here when the email route is enabled in this build`

Itens a ajustar:

- headline e supporting copy do painel devem enquadrar o acesso como `secure Google access to your workspace`
- `sign-in` e `sign-up` devem parar de sugerir um mercado de providers
- `provider-config` deve deixar de expor `isMetaAuthConfigured()` e `isEmailAuthConfigured()` como sinais de UI se esses providers nao existem em [auth.ts](C:\Users\hriqu\Documents\revory-mvp\auth.ts)
- o estado de configuracao deve ser derivado do runtime real de auth, nao de envs soltas

Itens a manter:

- `GoogleProvider`
- callback/redirect atual
- `AuthGoogleButton`
- paginas proprias de `sign-in` e `sign-up`
- `AuthSignOutButton`

## Arquivos impactados

Arquivos certamente impactados:

- [auth.ts](C:\Users\hriqu\Documents\revory-mvp\auth.ts)
- [components/auth/AuthOptionsPanel.tsx](C:\Users\hriqu\Documents\revory-mvp\components\auth\AuthOptionsPanel.tsx)
- [components/auth/AuthGoogleButton.tsx](C:\Users\hriqu\Documents\revory-mvp\components\auth\AuthGoogleButton.tsx)
- [services/auth/provider-config.ts](C:\Users\hriqu\Documents\revory-mvp\services\auth\provider-config.ts)
- [src/app/sign-in/[[...sign-in]]/page.tsx](C:\Users\hriqu\Documents\revory-mvp\src\app\sign-in\[[...sign-in]]\page.tsx)
- [src/app/sign-up/[[...sign-up]]/page.tsx](C:\Users\hriqu\Documents\revory-mvp\src\app\sign-up\[[...sign-up]]\page.tsx)

Arquivos possivelmente impactados, dependendo da forma final de simplificacao:

- [components/auth/AuthStepCard.tsx](C:\Users\hriqu\Documents\revory-mvp\components\auth\AuthStepCard.tsx)
- [components/auth/AuthJsProvider.tsx](C:\Users\hriqu\Documents\revory-mvp\components\auth\AuthJsProvider.tsx)

## Riscos

Riscos tecnicos:

- se `provider-config` continuar olhando apenas envs isoladas, a UI pode continuar mentindo mesmo com auth real estreita
- se a simplificacao for feita so em copy, mas os campos falsos continuarem na tela, o ruido principal permanece

Riscos de escopo:

- tentar resolver `Auth Maturity` adicionando email auth, Meta auth ou provider extra agora
- tentar transformar essa sprint em "auth platform cleanup"
- abrir verificacao por email, reset de senha, magic link, invite flow ou SSO sem necessidade MVP

Riscos comerciais:

- manter providers fake fragiliza a sensacao de software maduro
- uma tela de auth que promete mais do que entrega enfraquece confianca logo no primeiro contato

## O que NAO entra

Nao entra nesta frente:

- email/password auth real
- magic link
- Meta login
- Apple login
- Microsoft login
- SSO
- org/role management
- invite system complexo
- MFA
- recovery flows enterprise
- qualquer chooser amplo de identidade

Se o produto quiser abrir outro caminho de auth no futuro, isso deve acontecer apenas quando houver necessidade comercial clara e implementacao real pronta. Nao como placeholder.

## Veredito executivo

A direcao certa para a Sprint 18 e `subtracao disciplinada`, nao expansao.

Hoje o REVORY Seller ja tem auth suficiente para um produto narrow: `Google workspace access`.

O que falta nao e mais capability. O que falta e maturidade semantica:

- remover o que soa fake
- parar de insinuar providers nao entregues
- deixar a autenticacao curta, limpa e verdadeira

Se essa frente for executada assim, o produto fica mais maduro, mais confiavel e mais coerente com `LIKE WATER` sem abrir uma frente de complexidade desnecessaria.
