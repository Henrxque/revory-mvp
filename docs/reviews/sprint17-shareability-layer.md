# Sprint 17 — Executive Proof Summary Shareability

## Solução implementada

Foi implementada uma camada de shareability curta e narrow para a `Executive Proof Summary`, sem abrir reporting suite.

O mecanismo escolhido combina:

- `Copy summary`
- `Share summary` via system share sheet quando o dispositivo suporta
- `Print or save PDF` via print view dedicada em popup

Essa combinação cobre o caso real da sprint:

- compartilhar rápido por texto
- abrir a summary fora da home principal
- gerar um asset limpo para PDF ou impressão

Sem criar:

- export suite
- PDF generator complexo
- histórico de relatórios
- share link público

## Fluxo de compartilhamento

1. O usuário abre `Share proof` a partir da `Revenue view`.
2. A sheet mostra a `Executive Proof Summary` em uma surface curta.
3. A partir dali, o usuário pode:
   - copiar a versão textual curta
   - usar o share nativo do sistema, quando disponível
   - abrir `Print or save PDF`
4. O `Print or save PDF` abre uma janela limpa contendo só a peça executiva.
5. Dessa janela, o usuário pode:
   - imprimir
   - salvar como PDF pelo fluxo nativo do navegador

## Arquivos alterados

- [components/proof/ExecutiveProofSummarySheet.tsx](C:/Users/hriqu/Documents/revory-mvp/components/proof/ExecutiveProofSummarySheet.tsx)
- [components/proof/ExecutiveProofSummaryCard.tsx](C:/Users/hriqu/Documents/revory-mvp/components/proof/ExecutiveProofSummaryCard.tsx)
- [services/proof/get-executive-proof-summary-read.ts](C:/Users/hriqu/Documents/revory-mvp/services/proof/get-executive-proof-summary-read.ts)

## Trade-offs

- o `Print or save PDF` usa popup + print nativo do navegador
  - isso mantém a solução simples
  - mas não entrega PDF renderizado custom por backend
- a peça impressa reutiliza a mesma leitura executiva
  - isso preserva product truth
  - mas exige disciplina para não deixar a versão impressa começar a divergir da summary principal
- o share nativo depende do suporte do dispositivo
  - quando não existe, o produto cai para `copy`
- não existe share link público
  - isso reduz conveniência máxima
  - mas evita abrir escopo de distribuição e segurança cedo demais

## Veredito executivo

A shareability ficou no tamanho certo.

Ela resolve o problema real da sprint — fazer a prova sair da UI principal de forma simples e útil — sem virar sistema de exportação ou suíte de relatórios. O resultado ficou premium, prático e compatível com solo-founder fit.
