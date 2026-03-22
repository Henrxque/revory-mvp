# REVORY — Sprint 3 Etapa 2 Review

## Objetivo da etapa
Construir a tela real de preview de mapeamento do import assistido dentro do fluxo autenticado de imports, permitindo que o usuario revise o arquivo recebido, veja a sugestao do sistema, ajuste a decisao final de mapping e so avance quando os guardrails minimos estiverem satisfeitos.

## Arquivos criados/alterados
- Criado: `components/imports/AssistedImportMappingPreview.tsx`
- Alterado: `components/imports/CsvUploadCard.tsx`
- Alterado: `services/imports/build-assisted-import-payload.ts`
- Alterado: `lib/imports/assisted-import.ts`
- Alterado: `types/imports.ts`
- Alterado: `src/app/(app)/app/imports/page.tsx`

## Decisoes de UX
- O preview foi organizado em tres camadas explicitas:
  - arquivo recebido
  - sugestao da REVORY
  - decisao final atual
- O upload card deixou de concentrar toda a experiencia em um bloco unico e passou a delegar a revisao visual de mapping para uma superficie propria.
- O layout do preview foi dividido em:
  - coluna de contexto e bloqueios
  - coluna de linhas de mapeamento
- O usuario ve, para cada header:
  - o nome bruto vindo do arquivo
  - a sugestao inicial da REVORY
  - a selecao final atual dentro dos campos validos do modelo
- Os estados visuais foram mantidos simples e premium:
  - confident match
  - needs confirmation
  - unresolved
  - blocked
- A tela nao tenta virar ferramenta de ETL. O usuario so consegue escolher entre campos oficiais validos do template correspondente.

## O que foi implementado
- Preview real de mapeamento dentro da rota autenticada de imports.
- Separacao entre sugestao original do sistema e mapping final atual do usuario.
- Draft adicional de confirmacao de mapping, pronto para a etapa seguinte, sem reabrir o payload da Etapa 1.
- Resumo visual da revisao com:
  - headers detectados
  - sugestoes confiantes
  - sugestoes que ainda precisam confirmacao
  - campos ainda ignorados
  - required fields prontos
  - ajustes manuais feitos pelo usuario
- Lista explicita de bloqueios antes do import.
- CTA final bloqueado quando:
  - existem duplicate source headers
  - faltam required fields
  - falta identity path
  - existem duplicate targets

## Evidencias do fluxo funcionando
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- A tela de imports agora consome diretamente o payload existente da Etapa 1 e:
  - renderiza o preview de mapping quando um CSV valido e selecionado
  - recalcula o estado atual do preview quando o usuario muda um select
  - preserva a sugestao original da REVORY para comparacao visual
  - gera um `mappingDecisionDraft` serializavel e pronto para consumo na etapa seguinte

## Guardrails e bloqueios cobertos
- Duplicate raw headers aparecem como bloqueio explicito.
- Required fields faltando aparecem como bloqueio explicito.
- Ausencia de client identity path aparece como bloqueio explicito.
- Duplicate target mapping aparece como bloqueio explicito.
- O botao final nao permite avancar quando esses requisitos minimos nao estao satisfeitos.

## Limitacoes conhecidas
- A experiencia ainda termina no submit direto do import atual. A etapa seguinte pode isolar a confirmacao final em uma superficie propria, se isso fizer sentido para o fluxo.
- A tela nao cria memoria persistida de mapping por workspace.
- A tela nao adiciona transformacoes manuais, formulas ou regras de conversao.
- Duplicate raw headers continuam bloqueando o import; a UI so permite revisao visual do problema.

## Pendencias
- Consumir o `mappingDecisionDraft` na etapa seguinte de confirmacao final.
- Decidir se a confirmacao final sera um passo separado ou um estado expandido da tela atual.
- Refinar microcopy final do CTA quando a etapa seguinte estiver pronta.

## Riscos conhecidos
- Se o usuario insistir em um CSV muito distante do contrato oficial, a experiencia continua limitada de proposito pelo MVP.
- O matching assistido continua heuristico e pode exigir ajuste manual em bases legadas com naming inconsistente.
- Sem memoria persistida de mapping, o mesmo cliente pode precisar revisar novamente arquivos diferentes com headers parecidos.

## Proximos passos
- Implementar a etapa de confirmacao final do mapping consumindo o draft ja preparado.
- Encadear a confirmacao final com o import existente sem duplicar a semantica do parser da Sprint 2.
- Refinar feedback final do fluxo para deixar ainda mais claro o que foi:
  - sugerido pela REVORY
  - mantido como estava
  - ajustado manualmente
