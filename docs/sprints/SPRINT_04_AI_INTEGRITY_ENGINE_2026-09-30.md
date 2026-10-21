# Sprint 04 — Motor determinístico de integridade

Data: 2026-09-30. Estado: **concluído localmente para testes internos com dados sintéticos**. Regra: `ai-integrity/4.1.0`. Sem deploy, compra, oferta pública ou análise de dados de clientes.

## Entrega

- `domain/ai-integrity/reconciliation.ts`: motor puro, decimais exatos com BigInt, comparação por intervalo UTC semiaberto, provider/project/model e unidade exata. Nenhuma IA participa do cálculo.
- Duas famílias: `UNATTRIBUTED_PROVIDER_SPEND` (custo observado elegível sem vínculo Strong) e `LEDGER_PROVIDER_USAGE_MISMATCH` (delta de quantidade calculado, sem valor monetário). Uso pode ser reconciliado mesmo quando o custo está indisponível/estimado, desde que identidade e fontes sejam elegíveis.
- `services/ai-integrity/scan.ts`: leitura consistente em transação Repeatable Read; snapshot, findings, dependências de evidência e audit event gravados atomicamente. Concorrência/idempotência testadas.
- Snapshot congela dados normalizados com IDs, hashes e linhas de origem; três lotes selecionados; revisão de fechamento/lag; mappings e provenance; evidência de outros imports usada apenas para contradições; regra e hash do resultado.
- JSON com manifesto completo e resultado reproduzível; CSV de findings com escaping para planilhas. Leitura valida replay pelo hash. Revogar mapping ou importar depois não altera o snapshot anterior.
- Console interno em `/app/ai-integrity/scans`, acessível a partir de attribution; histórico de 20 snapshots, evidência por finding, Data Quality, downloads. Mantém tokens/fontes/logo existentes.
- API `POST /api/ai-integrity/scans` e `GET /api/ai-integrity/scans/[snapshotId]/export?format=json|csv`, com workspace derivado da sessão. Mutação exige origem válida, JSON limitado a 8 KB, limite de 10 scans/10 minutos, confirmação de dados sintéticos e revisão das fontes.
- Nenhuma migration adicional: usa as entidades aditivas dos Sprints 1–3. Portabilidade e retenção existentes abrangem os snapshots/findings e todos os lotes dependentes.

## Contratos e supressões

1. Exatamente um lote de cada fonte, mesmo intervalo UTC. Um lote com `duplicateCount > 0`, contagem incompleta ou membership inconsistente é recusado; selecionar import original. Não reconstruir silenciosamente registros deduplicados de outros lotes.
2. Operador registra `asOf`, `exportedAt`, `completeThrough` de cada fonte e lag inteiro de 0–720 horas. Não há default que finja conhecer a consolidação do provider. Datas com offset obrigatório; nenhuma revisão no futuro; fechamento até a data exportada. Datas são normalizadas para UTC.
3. Fonte aberta/antes do lag suprime conclusões dependentes. `reportedAt` do bucket, quando presente, deve estar após o fim do bucket + lag e até o export revisado. Idade da fonte aparece no Data Quality. Ausência de `reportedAt` usa declaração explícita do operador, registrada como limitação.
4. Denominador monetário separado por provider/moeda: somente custo reportado, não negativo, sem ajustes ou versões conflitantes/sobreposições. Dimensão ausente significa agregado: agregado + detalhe sobreposto exclui ambos. Registros excluídos continuam na evidência. Não converter moedas.
5. Uso exige mapping exclusivo confirmado cobrindo o bucket inteiro e corroborado pelo ledger; mesma unidade exata, dimensões compatíveis e ambas as fontes completas. Falta de provider/project/model, customer compartilhado, outra organização, unidade divergente, versão conflitante, request duplicado, ajustes negativos ou buckets sobrepostos suprimem o delta. Cada evento participa de no máximo uma comparação elegível.
6. CSV parcial com linhas excluídas suprime comparação de uso. Coverage monetária é apenas dos buckets elegíveis selecionados, com escopo e exclusões explícitos. Nenhum percentual afirma representar providers ausentes.
7. Receita Stripe, refunds, créditos e subscriptions permanecem contexto. Não somar charge e invoice, calcular net revenue/margem, monetizar usage ou interpretar `creditsDelta` como dinheiro. Essas regras exigem contratos futuros.
8. Custo sem atribuição é um problema de cobertura. Delta de uso pede revisão de metering, retries, caching e batching. Nenhum deles prova perda; não existe total combinado de “at risk”.

## Verificação executada

| Camada | Evidência |
| --- | --- |
| Motor | 31 casos determinísticos/adversariais: lag, stale report, fechamento contraditório, refund/crédito, moedas, timezone, limite semiaberto, unidades, decimais além de Number, overflow, duplicatas, aggregate/detail, conflitos, mapping expirado/compartilhado, custo estimado/ausente/zero, imports parciais e dimensões faltantes |
| HTTP input | JSON bounded, confirmação sintética e estrutura da revisão |
| PostgreSQL descartável | Duas chamadas concorrentes → mesmo snapshot; um audit event e dois findings; tenant estrangeiro recusado; replay imutável após revogação; novo snapshot para novo mapping; membership duplicado recusado; JSON/CSV estáveis; escaping de CSV; portabilidade e retenção |
| Navegador autenticado | Formulário → POST → DB → dois findings renderizados → exports JSON/CSV; navegação para attribution; request sem auth = 401; origem estrangeira = 403 |
| Visual | Desktop 1280×800 e mobile 390×844; nenhuma exceção/erro de console ou overflow horizontal. Capturas em `docs/qa/ai-integrity-sprint4/` |
| Regressão | Suites puras dos Sprints 1, 2 e 3, TypeScript, ESLint direcionado e build Next.js |

O CLI agent-browser não estava disponível; verificação real de navegador usou o Playwright já instalado. Banco temporário criado e removido pelo harness local, sem aplicar migrations ao banco principal. Servidor de QA encerrado após o teste. Avisos existentes do loader TypeScript experimental não impediram os testes.

## Como reproduzir

```powershell
npm run qa:ai-integrity-sprint-4
npm run qa:ai-integrity-sprint-4:db
npm run qa:ai-integrity-sprint-4:browser
```

Os dois últimos comandos exigem PostgreSQL local e permissão para criar um banco descartável; o harness recusa URL não local. O teste de browser usa a porta 3144, conta/secret temporários e fixtures sintéticas. Para revisão manual em desenvolvimento, entrar com conta interna, importar as três fontes em `/app/ai-integrity/imports`, confirmar IDs em attribution e abrir scans. Não usar dados de clientes.

## Limites e próximo gate

- Console técnico interno; shell/navegação pública ainda contém domínio contractor. A substituição da experiência pública pertence ao Sprint 5.
- Limites explícitos: até 2.000 buckets selecionados, 25.000 registros por coleção de evidência no workspace e manifesto de 20 MB. Outros imports só suprimem contradições; não aumentam totais selecionados. Isso é capacidade do teste interno, não promessa de escala comercial.
- Matching de unidade por igualdade literal; nenhuma conversão tokens↔requests ou decomposição implícita de input/output/cache. Ambiguidades podem produzir supressões conservadoras.
- Fechamento/lag são revisados pelo operador. Ainda não há verificação externa de completude/frescor, conectores ou validação de precisão com clientes reais.
- Replay suporta a versão atual da regra. Evoluções devem preservar implementações anteriores ou versionar explicitamente o leitor, sem reinterpretar snapshots históricos.
- Scan continua bloqueado em produção e exige dados sintéticos. Não habilitar dados reais até compra/entitlement e gate de validação apropriados.
- Sprint 5: onboarding e resultados para o comprador, finding detail, demo sintética, landing AI SaaS e compra pontual testada, preservando identidade premium.
