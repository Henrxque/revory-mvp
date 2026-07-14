# REVORY manual CSV acceptance kit

As datas e os resultados esperados deste kit usam **2026-07-14** como data de
referencia. Todos os nomes, emails, telefones e valores sao ficticios.

## Cenario 1 — Quote Recovery baseline

Use os quatro arquivos de `quote-recovery-baseline` juntos e informe exatamente
este sistema de origem:

```text
revory-manual-qa-2026-07
```

Resultado esperado em um workspace sem outro dado ativo:

- 21 registros aceitos: 6 customers, 6 leads, 6 estimates e 3 activities;
- zero links unmatched ou conflicting;
- as seis regras de Quote Recovery elegiveis;
- 11 findings ativos atribuidos aos estimates do kit;
- valores financeiros exibidos como oportunidades estimadas, nunca perda confirmada.

Findings esperados por estimate:

| Estimate | Findings esperados |
| --- | --- |
| EST-QA-001 | overdue follow-up, high-value stale quote, estimate aging risk |
| EST-QA-002 | high-value stale quote, open estimate no activity, estimate aging risk, missing owner or next step |
| EST-QA-003 | nenhum |
| EST-QA-004 | recoverable lost quote |
| EST-QA-005 | overdue follow-up, estimate aging risk, missing owner or next step |
| EST-QA-006 | nenhum; status won |

O total do dashboard pode ser maior caso o workspace ja possua outro
`sourceSystem` ativo. Nesse caso, valide os IDs `EST-QA-*` individualmente.

### Gap conhecido que este kit evidencia

O read model atual soma `valueCents` por finding. Como um mesmo estimate pode
gerar mais de um finding financeiro, o card `Estimated recoverable` pode mostrar
US$154,900 para este kit, embora a exposicao unica dos quatro estimates com valor
seja US$74,200. Isso e dupla contagem de uma mesma base e nao deve ser interpretado
como oportunidade agregada defensavel. Ate o resumo ser deduplicado por estimate,
use os 11 findings individuais como criterio do teste.

## Cenario 2 — rejeicao atomica

Use apenas `invalid/invalid-estimates.csv` na lane Estimates. O profiling deve
conseguir mapear os headers, mas o commit final deve ser rejeitado por campos
obrigatorios/valores invalidos. Nenhum registro parcial deve ser salvo.

Esse cenario nao deve consumir a leitura do Audit porque a Data Quality rejeita o
lote antes da reserva de capacidade.

## Cenario 3 — segundo snapshot

Use os quatro arquivos de `quote-recovery-second-read` somente depois de haver
acesso Starter/Growth/Pro. Mantenha exatamente o mesmo `sourceSystem` do baseline:

```text
revory-manual-qa-2026-07
```

Os arquivos representam um snapshot completo posterior. Eles resolvem parte dos
findings antigos, mantem outros, pioram `EST-QA-005` e introduzem `EST-QA-007`.
O fluxo deve produzir estados new, persistent, worsening e resolved sem duplicar
registros.

Com o relogio de referencia em 2026-07-14, o resultado deterministico e:

- 25 registros aceitos;
- 10 findings atuais;
- 5 new;
- 5 persistent;
- 2 worsening (subconjunto dos persistent);
- 6 resolved.

Nao use esse cenario com um entitlement Quote Recovery Audit de uma leitura: um
novo snapshot aceito precisa de capacidade recorrente.

## Cenario 4 — Revenue Realization gate

Os quatro arquivos de `revenue-realization-gated` sao fixtures contractor validas
para jobs, invoices, change orders e costs. Na conta que possui apenas Quote
Recovery Audit, o profiling deve ser bloqueado com a mensagem de que Revenue
Realization exige Pro ou preview interno autorizado. Isso e o comportamento
correto e evita expor claims gated.
