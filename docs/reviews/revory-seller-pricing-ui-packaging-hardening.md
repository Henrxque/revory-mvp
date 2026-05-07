# REVORY Seller - Pricing UI and CTA Packaging Hardening

## Problemas encontrados

- A pricing UI ainda apresentava `Basic`, `Growth` e `Premium` como tres cards equivalentes, o que sugeria tiering natural de produto.
- `Growth` era destacado visualmente, mas ainda competia com dois CTAs laterais que pareciam igualmente compraveis.
- `Basic` usava linguagem de plano de entrada direto e prometia sinais como menor volume sem existir enforcement real de volume, quota ou capacidade.
- `Premium` dizia `Review Premium Fit`, mas o CTA levava a checkout direto. Isso era o ponto mais perigoso de product truth.
- A landing tinha links antigos para `/start?plan=basic` e `/start?plan=premium`, o que mantinha a chance de compra seletiva virar checkout publico.
- A rota `/api/billing/checkout` ainda aceitava `basic` e `premium` diretamente, mesmo depois da decisao de packaging dizer que apenas `Growth` deve ser self-service principal.
- O catalogo interno de billing ainda descrevia os planos com linguagem de headroom/room que podia soar como capacidade tecnica diferenciada.

## Ajustes aplicados

- Reorganizei a hierarchy da tela `/start`: `Growth` virou o card dominante e ocupa a coluna principal.
- Rebaixei `Basic` e `Premium` para cards seletivos laterais, com menor peso visual e copy mais contida.
- Reescrevi as features do `Growth` para vender o produto real completo, nao uma lista artificial de tier features.
- Reescrevi `Basic` como entrada seletiva, nao como plano publicamente feature-lite.
- Reescrevi `Premium` como fit-reviewed, nao como plataforma maior ou tier superior funcional.
- Adicionei mensagens especificas para `basic-fit` e `premium-fit` na tela `/start`.
- Ajustei a landing para nao mandar Basic/Premium para plano direto; os links agora abrem mensagens de fit.
- Protegi `/api/billing/checkout` para redirecionar `BASIC` e `PREMIUM` de volta para `/start` com mensagem de fit, mantendo checkout self-service apenas para `GROWTH`.
- Atualizei `services/billing/workspace-billing.ts` para alinhar labels, fit labels, framing e in-app signals com a estrategia real.

Arquivos alterados:

- `src/app/start/page.tsx`
- `src/app/api/billing/checkout/route.ts`
- `src/content/revory-landing-reference.html`
- `services/billing/workspace-billing.ts`

Validacoes executadas:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Resultado das validacoes:

- Todas passaram.

## CTAs finais

### Basic

- Label final: `Ask about Basic fit`
- Destino final na pricing UI: `/start?billing=basic-fit&plan=basic`
- Comportamento: nao abre checkout direto.
- Leitura correta: Basic existe como entrada seletiva/comercial, nao como produto menor tecnicamente separado.

### Growth

- Label final: `Start with Growth`
- Destino final na pricing UI: `/api/billing/checkout?plan=growth`
- Comportamento: abre o unico checkout self-service principal.
- Leitura correta: Growth e o plano publico real do REVORY Seller hoje.

### Premium

- Label final: `Check Premium fit`
- Destino final na pricing UI: `/start?billing=premium-fit&plan=premium`
- Comportamento: nao abre checkout direto.
- Leitura correta: Premium e fit-reviewed e nao deve sugerir produto maior, CRM, BI, automacao ou attribution suite.

## Hierarchy final

- `Growth` fica como plano dominante, visualmente maior, com badge `Best fit` e CTA primario.
- `Basic` fica como alternativa seletiva, com peso visual menor e CTA secundario.
- `Premium` fica como alternativa fit-reviewed, com peso visual menor e CTA secundario.
- A UI deixa de parecer uma tabela SaaS generica de tres tiers equivalentes.
- A narrativa passa a ser: um produto principal real, uma entrada seletiva e um tier superior protegido por fit.

## Veredito executivo

Pricing UI e CTAs agora estao alinhados com a estrategia real de planos.

O produto nao esta mais vendendo fake tiering na superficie principal:

- `Growth` e o unico plano self-service direto.
- `Basic` nao e mais vendido como versao publica menor.
- `Premium` nao e mais vendido como checkout direto com promessa de superioridade nao sustentada.

Veredito final:

- A pricing page ficou mais honesta.
- O risco de undersell do Basic caiu.
- O risco de oversell do Premium caiu.
- A hierarchy agora defende melhor o plano que realmente representa o produto atual.
