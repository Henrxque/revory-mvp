# REVORY Seller — Current Product State

## 1. Resumo executivo

O produto hoje entrega um app web protegido com:

- autenticação real via Google, quando o provider está configurado
- criação automática de usuário local, workspace e activation setup
- onboarding guiado em etapas para configurar o Seller
- upload guiado de CSV para booked proof e lead base
- leitura de dashboard centrada em booked appointments, revenue visibility, attribution support e recent momentum
- seleção de plano e checkout Stripe, quando Stripe está configurado

O núcleo funcional atual é:

- `auth -> workspace -> activation setup -> booking inputs -> revenue view`

O produto não entrega hoje um sistema amplo de operação comercial. O estado atual é um fluxo estreito de entrada, setup, imports, dashboard e billing.

## 2. O que está implementado e funcional

- Login com Google via NextAuth, quando `AUTH_GOOGLE_CLIENT_ID` e `AUTH_GOOGLE_CLIENT_SECRET` estão configurados.
- Criação e sincronização de usuário local a partir da sessão autenticada.
- Criação automática de workspace no primeiro acesso autenticado.
- Criação automática de `activationSetup` por workspace.
- Redirecionamento inteligente do `/app`:
  - para setup se activation ainda não foi concluído
  - para booking inputs se activation foi concluído, mas booked proof ainda não está visível
  - para dashboard se activation foi concluído e booked proof está visível
- Fluxo de setup em múltiplas etapas:
  - clinic name + main offer
  - lead entry
  - booking path
  - value per booking
  - seller voice
  - activation review/finalization
- Persistência real dessas escolhas no banco.
- Atualização do nome do workspace a partir do clinic name.
- Persistência de `MedSpaProfile` básico durante o setup.
- Upload de CSV com fluxo real em Booking Inputs.
- Validação estrutural de CSV antes da persistência.
- Prévia de mapeamento assistido de colunas antes de confirmar o upload.
- Persistência de imports de appointments e clients no banco.
- Registro de metadata do import e revalidação das páginas após upload.
- Exibição de erros, warnings e resumo do import.
- Dashboard com leituras reais do banco:
  - revenue now
  - recent revenue
  - supported revenue
  - booked proof
  - attribution clarity
  - recent booked momentum
  - renewal read
  - retention read
  - upcoming bookings
- Seleção de plano na rota `/start`.
- Criação de checkout Stripe por plano via `/api/billing/checkout`, quando Stripe está configurado.
- Webhook Stripe para sincronizar billing status do workspace.
- Portal Stripe via `/api/billing/portal`, quando Stripe está configurado e existe `stripeCustomerId`.
- Logout funcional.

## 3. O que está implementado parcialmente

- Billing:
  - a estrutura de checkout, sync e portal existe e é funcional
  - mas depende completamente de envs Stripe válidas para ser uso real
  - sem isso, a superfície existe, mas não fecha o fluxo de cobrança real
- Dashboard:
  - entrega leitura de valor real baseada em imports e setup
  - mas a profundidade continua limitada ao que foi importado e ao modelo atual de cálculo
  - não é uma camada analítica profunda nem uma atribuição completa
- Decision support / AI:
  - existe camada real de classificação e patch de guidance
  - mas ela é auxiliar, bounded e com fallback
  - não é o núcleo da entrega do produto
- Setup:
  - o fluxo é real e funcional
  - mas continua sendo configuração inicial narrow, não um sistema operacional posterior para gestão contínua
- Import mapping:
  - existe revisão assistida e confirmação de mapping
  - mas isso continua limitado ao fluxo de CSV import, não a uma engine geral de integração

## 4. O que está apenas preparado visualmente ou estruturalmente

- Login por email:
  - existe visual de `Email + Password`
  - existe botão principal de sign in/create account
  - existe mensagem condicional de que a rota conectará ali quando habilitada
  - hoje isso não executa auth real
- Login com Meta:
  - existe botão na UI
  - hoje ele aparece como `Coming soon`
  - não há provider real configurado no `auth.ts`
- Forgot password:
  - existe botão visual em sign-in
  - hoje não há fluxo funcional associado
- Create account por email:
  - existe visual na mesma superfície
  - hoje não há criação real de conta por email/senha
- Leitura de providers na UI:
  - o app mostra disponibilidade por configuração
  - mas a arquitetura real de auth continua Google-only no backend atual

## 5. O que depende de configuração externa

- Google auth:
  - depende de `AUTH_GOOGLE_CLIENT_ID`
  - depende de `AUTH_GOOGLE_CLIENT_SECRET`
- Stripe checkout / portal / webhook:
  - depende de `STRIPE_SECRET_KEY`
  - depende de `STRIPE_WEBHOOK_SECRET`
  - depende dos `STRIPE_*_PRICE_ID`
  - depende de `NEXT_PUBLIC_APP_URL` correto
- OpenAI / bounded AI:
  - depende de `OPENAI_API_KEY`
  - depende de `REVORY_LLM_ENABLED`
  - sem provider disponível, a camada deve cair em fallback local
- Banco:
  - depende de `DATABASE_URL`
  - o produto é stateful; sem banco funcional não há fluxo real
- Meta auth:
  - a UI olha `AUTH_META_APP_ID` e `AUTH_META_APP_SECRET`
  - mas isso hoje não ativa login Meta real, porque o provider não está implementado no backend
- Email auth:
  - a UI olha `AUTH_EMAIL_FROM`
  - mas isso hoje não ativa auth por email real

## 6. O que ainda não existe

- Login real por email/senha.
- Signup real por email/senha.
- Magic link funcional.
- Reset de senha funcional.
- Login real com Meta.
- Multi-provider auth real no backend.
- Auth consistency real entre Google + Meta + Email.
- Inbox.
- CRM.
- chatbot aberto.
- agente comercial autônomo.
- multi-offer orchestration.
- multi-channel operating layer complexa.
- analytics suite ampla.
- automação operacional enterprise.

## 7. Fluxos realmente funcionais hoje

- Fluxo 1: Google auth -> workspace -> setup
  - o usuário autentica com Google
  - o app cria/sincroniza `User`
  - cria ou recupera `Workspace`
  - cria ou recupera `ActivationSetup`
  - leva o usuário para a etapa correta do setup

- Fluxo 2: Setup -> activation complete
  - o usuário percorre as etapas
  - o app persiste as escolhas
  - o activation setup pode ser concluído
  - o app redireciona para `/app`

- Fluxo 3: Activation complete -> Booking Inputs
  - se não houver booked proof visível, o app manda para imports
  - o usuário pode selecionar CSV, revisar mapeamento e confirmar
  - o app valida, persiste e revalida as páginas

- Fluxo 4: Booked proof visible -> Revenue View
  - com booked proof visível, o app abre o dashboard
  - o dashboard lê métricas reais do banco e monta a leitura atual

- Fluxo 5: Logged in user without active billing -> plan selection
  - o usuário autenticado pode abrir `/start`
  - escolhe um plano
  - se Stripe estiver configurado, o app cria checkout session

- Fluxo 6: Stripe checkout -> workspace billing sync
  - webhook e sync do checkout atualizam billing status do workspace
  - com acesso ativo, o app redireciona o usuário para `/app`

## 8. Limites reais do produto atual

O produto para hoje em:

- setup inicial narrow
- upload/import de booked proof e lead base
- dashboard de leitura comercial e operacional curta
- billing de planos

O produto não faz hoje:

- operação diária completa de pipeline
- CRM
- messaging / inbox
- follow-up engine ampla
- orchestration multicanal robusta
- autenticação multi-provider real
- email/password auth real
- Meta auth real
- gestão complexa de times, permissões ou enterprise access

O dashboard também não sustenta, no estado atual, a leitura de um sistema analítico profundo. Ele sustenta uma leitura curta e objetiva em cima do que existe no banco e do modelo atual do Seller.

## 9. Julgamento final

A entrega real do produto hoje é:

- um app narrow de REVORY Seller com Google auth real, setup estruturado, imports reais de CSV, dashboard de revenue/proof/attribution e billing Stripe preparado para operação real quando configurado

O maior risco de interpretação errada é:

- confundir a superfície de auth atual com um sistema multi-provider já entregue
- confundir a UI de email/meta com funcionalidade real já disponível
- confundir o dashboard com uma plataforma analítica ou operacional mais ampla do que ele realmente é

Onde existe risco de oversell:

- auth:
  - a UI sugere mais opções do que o backend realmente entrega hoje
- provider expansion:
  - Google é real
  - Meta e Email não são entrega funcional real hoje
- dashboard:
  - a leitura é forte dentro do escopo narrow
  - mas não sustenta promessas de analytics ou attribution mais amplas do que o código atual entrega
- billing:
  - o fluxo é real
  - mas sem Stripe configurado não é experiência real de pagamento
