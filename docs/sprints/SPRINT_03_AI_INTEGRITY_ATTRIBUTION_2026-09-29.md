# Sprint 03 — Identidade e atribuição

**Data:** 2026-09-29  
**Estado:** concluído localmente para revisão interna; sem deploy, scan, margem ou findings.  
**Autoridade:** [source of truth](../source-of-truth.md), [bíblia](../REVORY_PRODUCT_BIBLE.md) e [plano](../REVORY_AI_SAAS_MIGRATION_PLAN.md).

## Entrega

- `/app/ai-integrity/attribution` permite selecionar um lote de revenue, ledger e provider, revisar IDs observados e confirmar/revogar vínculos Stripe customer → internal customer ou provider project → internal customer com período fechado. A API exige sessão, workspace, acesso interno, origem válida e rate limit.
- Identidades externas usam chaves com namespace de source system ou provider/organization. IDs iguais em contas diferentes não se vinculam. A confirmação exige IDs vistos em lotes do mesmo workspace e período. Projeto de provider exige declaração explícita de exclusividade e uso correspondente no ledger.
- Vínculos temporalmente sobrepostos ou contraditórios são preservados como `CONFLICTED`; revogar preserva histórico e auditoria. Um vínculo anterior pode voltar a `CONFIRMED` quando fica sozinho e a evidência conhecida não o contradiz.
- Cobertura é uma leitura determinística por **um lote de provider + um ledger**, separada por provider e moeda. Denominador: soma exata de custos `REPORTED` não negativos, sem ajustes ou buckets sobrepostos, dentro da janela do lote escolhido. O resultado expõe os IDs de buckets no denominador e no numerador, custo atribuído, não atribuído e percentual em basis points.
- Custo por customer só recebe classe `STRONG` se houver projeto confirmado exclusivo durante todo o bucket, janela do ledger completa, uso interno corroborante do mesmo customer e nenhuma evidência conhecida de projeto compartilhado em qualquer import do workspace. Ausência de projeto/customer, conflito, janela incompleta e custo estimado suprimem atribuição com motivo visível. Não há cálculo de margem por customer.
- `EXACT`, `MAPPED` e `ESTIMATED` são classes previstas no contrato, mas **não elegíveis para custo dos buckets agregados atuais**. Nenhuma UI sugere que essas classes ou uma reconciliação financeira já existem. Nada é gravado em `AiIntegrityFinding` ou `AiIntegritySnapshot` nesta sprint.
- Índice aditivo para busca temporal de uso por projeto; sem renomear ou apagar entidades antigas. Componentes usam os tokens visuais premium do REVORY.

## Evidência do gate

| Risco | Verificação |
| --- | --- |
| Projeto compartilhado gera custo por customer | Corpus puro e teste PostgreSQL mostram custo atribuído igual a zero quando outro customer usa o mesmo projeto, inclusive em import posterior. |
| Vínculo ambíguo ou sem customer | Overlap vira `CONFLICTED`; ledger sem customer suprime classe Strong. Nenhuma margem por customer é produzida. |
| Denominador inflado | Apenas lote escolhido; moedas agrupadas; buckets sobrepostos, estimativas e ajustes fora do denominador. IDs e razão de exclusão explícitos. |
| Período incorreto | Mapping precisa caber nos dois lotes; exige cobertura integral do bucket e da janela do ledger. |
| Vazamento entre workspaces | Serviço de vínculo, revogação e leitura de cobertura rejeita lote/mapping de outro workspace no banco descartável. |
| Claim financeiro prematuro | Teste confirma zero findings. A UI rotula cobertura como qualidade de atribuição, não dinheiro perdido. |

**Comandos:** `npm run qa:ai-integrity-sprint-3`, `npm run qa:ai-integrity-sprint-3:db`, `npm run typecheck`, `npx prisma validate`, lint direcionado e `npm run build`. O harness de banco só cria/apaga um banco aleatório quando `DATABASE_URL` aponta para localhost. Dados de teste são sintéticos.

## Limites e próxima etapa

O denominador cobre apenas o provider report escolhido, não todo o gasto de IA da empresa. Um projeto confirmado exclusivo é declaração do usuário corroborada pelo ledger, não garantia de completude externa. A revisão visual autenticada e exports reais consentidos permanecem para gates posteriores. Sprint 04 deve construir reconciliação determinística, supressões, snapshot imutável e export reproduzível; não deve transformar cobertura baixa em “leak”. Produção, domínio, Stripe e preços permanecem intactos. A preferência comercial continua: nenhum scan real gratuito.
