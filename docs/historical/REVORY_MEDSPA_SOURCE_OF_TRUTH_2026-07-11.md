# Source Of Truth

Current public positioning: **REVORY is a Revenue Leak Detector for premium MedSpas**.

Historical REVORY Seller reference docs may remain in the repository as implementation context, but they are not current public positioning.

Este repo deve usar como referência principal de produto a lousa:

`C:\Users\hriqu\Documents\aon_csu_project\Revory V3\lousa_escopo_revory_revenue_leak_detector.md`

Essa lousa define o escopo oficial do **REVORY V3 — Revenue Leak Detector**.

## Regra De Prioridade

Se houver conflito entre:

- README antigo
- ADRs antigas
- wireframes antigos
- copy antiga
- documentos do REVORY Seller
- implementação parcial

seguir primeiro a lousa acima.

O escopo antigo do REVORY Seller deve ser tratado como histórico e como fundação técnica, não como posicionamento público principal.

## Resumo Executivo

O produto deve ser tratado como:

- Revenue Leak Detector para MedSpas premium;
- produto premium, self-service e MedSpa-first;
- Launch V1 forte, não MVP pequeno;
- detector de estimated revenue at risk;
- sistema narrow de priorização de vazamentos comerciais;
- engine determinística de leaks como fonte da verdade;
- AI barata e controlada apenas como camada de insight, explicação e CSV intake/triage;
- dashboard leak-first;
- Revenue Leaks Page;
- Daily Leak Brief;
- Executive Revenue Leak Summary.

## Métrica Central

Usar:

> Estimated Revenue at Risk This Month

Evitar:

> Revenue lost

Regra:

Todo número financeiro precisa deixar claro se é observado, estimado ou risco operacional, e deve carregar confidence/evidence.

## Classificação Obrigatória

Separar sempre:

- Financial leaks: no-show revenue leak, canceled not recovered.
- Operational leak risks: missing contact leak risk, booking path blocked risk, stale booked proof risk.

Operational risks não devem ser vendidos como perda financeira confirmada.

## O Produto Não Deve Virar

- CRM;
- inbox;
- WhatsApp manager;
- BI genérico;
- healthcare analytics suite;
- practice management system;
- scheduling system completo;
- revenue cycle management;
- consultoria disfarçada;
- operação manual de recuperação;
- agente de IA livre;
- produto clínico/diagnóstico.

## Guardrails Do Launch V1

- Uma engine, várias surfaces.
- CSV/template-first.
- Reaproveitar o visual premium atual nas sprints, evitando redesign geral sem necessidade.
- Data Quality Check obrigatório.
- AI CSV Intake/Triage permitido e desejado, mas com confirmação humana antes de persistir dados.
- AI não calcula valor financeiro final.
- AI não cria leak sem evidence determinística.
- AI não conversa livremente com o usuário.
- Toda leak precisa ter evidence, confidence e recommended action.
- O produto deve explicar limitações dentro da UI para evitar suporte manual.

## Leituras Operacionais

Ao tomar decisões de produto, UX, copy ou implementação, favorecer:

- mais clareza sobre dinheiro em risco;
- mais confiança na leitura;
- menos suporte manual;
- mais self-service;
- mais precisão sobre o que é leak financeiro vs risco operacional;
- menos configuração;
- menos exceção por cliente;
- menos carga operacional para founder solo.

Evitar:

- escopo inflado sem payoff comercial;
- promessas de automação que o produto não entrega;
- claims de perda financeira absoluta sem base;
- múltiplos canais complexos no Launch V1;
- integrações customizadas antes de validação pagante;
- IA livre em conversas longas;
- qualquer coisa que empurre o produto para mini-CRM, mini-BI ou consultoria.
