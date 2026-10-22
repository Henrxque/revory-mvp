# REVORY — Landing e rodapé institucional

## Pedido e avaliação da Reh

Direção de 21/10/2026: complementar a copy e recuperar a qualidade visual da versão mais recente do Quote Recovery, preservando o produto AI SaaS e incluindo a identidade institucional no rodapé.

**Alinhado com ajuste:** a apresentação anterior mostrava preços antes de explicar o mecanismo, o resultado e os requisitos. A revisão oferece uma sequência de leitura: problema, exemplo de evidência, fontes, percurso, resultados suportados, compra e perguntas. Sem validação social fictícia ou promessa de recuperação/margem.

## Entrega

- Headline: “Know where your AI usage stops adding up.”
- Exemplo visual de Aster AI, explicitamente sintético, derivado de `aiIntegrityDemoResult()`: mesmas quantidades, diferença e cobertura da demo. Não é cliente nem resultado de produção.
- Três fontes explicadas: Stripe como contexto de invoices; ledger interno como registro do produto; OpenAI como uso/custo reportado.
- Fluxo curto de compra/preparação, revisão de identidade/qualidade e inspeção das evidências. Recorrência identificada como Monitor.
- Escopo das duas famílias de findings e das mudanças entre períodos, com limites próximos de cada explicação.
- Cards de compra independentes: Integrity Scan US$99 uma vez; Monitor US$199/mês. Valores dos contratos compartilhados com billing; nenhuma assinatura automática.
- FAQ: perfil compatível, API versus CSV, resultado suportado, compra independente, dados incompletos, credenciais e cancelamento.
- Rodapé com navegação de produto, políticas, suporte, LinkedIn, razão social, CNPJ e endereço oriundos de `REVORY_LEGAL`.

## Contrato visual

Reutilizados os primitives vivos de `components/legacy/ContractorHomePage.tsx` e `src/app/globals.css`: fundo #141516, superfície #252729, accent #43B39B, logo transparente, Instrument Serif nos títulos editoriais, DM Sans nos controles e leitura, grid de 1240px, faixas sutis, cards arredondados e glow contido. Nenhuma copy, oferta ou métrica contractor foi transferida. Nenhuma seta foi acrescentada.

Header com âncoras e Sign in, navegação fixa, link para pular ao conteúdo, FAQ nativa operável por teclado, foco visível e respeito a reduced motion.

## Classificação de rotas e componentes

| Superfície | Decisão | Dependência e preservação |
| --- | --- | --- |
| `/` comercial | adapt | Mesmo gate comercial; narrativa AI SaaS ampliada, ofertas do PR #14. |
| `AiMarketingNav` / `AiMarketingFooter` | adapt | Institucional e navegação completos. Preview mantém aviso de dados fictícios e acesso limitado. |
| `/limitations` | adapt | Nova explicação AI SaaS apenas sob gate comercial. Implementação contractor original preservada no fallback histórico. |
| Auth, billing, APIs de fontes e dados | keep | Nenhuma alteração de fluxo, segredo, domínio ou contrato de cobrança nesta revisão de landing. |

## Verificação e publicação

TypeScript, lint das superfícies alteradas, QA legal e build de produção passaram. Navegador local em 1440px, 390px e 320px verificou: preços, exemplo sintético, CNPJ/operadora/contato, nove links institucionais com rotas HTTP 200, FAQ por teclado, navegação fixa, reduced motion, ausência de overflow, setas e copy contractor nas superfícies adaptadas, sem erros de página. Capturas e JSON em `docs/qa/landing-copy-2026-10-21/`.

A revisão integra a branch `release/pricing-99-199` e o PR #14. A publicação em revory.app permanece coordenada com o catálogo Stripe live US$99/US$199 e sua permissão pendente. O Preview não comprova pagamento, utilização por cliente ou a validação OpenAI com dados não vazios. Não foram alterados secrets, produção ou catálogo Stripe para esta revisão visual.
