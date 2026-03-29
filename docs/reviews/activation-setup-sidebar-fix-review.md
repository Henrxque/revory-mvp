# REVORY - Activation Setup Sidebar Fix Review

## Causa do problema
O item `Activation Setup` no sidebar apontava corretamente para `/app/setup`, mas a própria rota não era uma página real. Ela sempre redirecionava:
- para `/app/dashboard` quando o setup já estava completo
- para o step atual do wizard quando o setup ainda estava em andamento

Na prática, isso fazia o item parecer morto ou sem efeito, especialmente quando o usuário já estava no dashboard.

## Correção aplicada
- `/app/setup` deixou de ser apenas um redirect invisível.
- A rota agora renderiza uma página mínima e honesta de status de activation setup.
- A nova página mostra:
  - status geral de ativação
  - itens configurados
  - itens pendentes
  - visão curta do step atual
  - CTA claro para:
    - continuar setup, quando pendente
    - abrir dashboard/imports, quando já concluído

## Arquivo alterado
- `src/app/(app)/app/setup/page.tsx`

## O que foi preservado
- Não houve expansão de escopo.
- Não foi criado módulo novo pesado.
- O wizard de setup continua existindo em `/app/setup/[step]`.
- O sidebar continua simples e coerente com o restante do app.

## Validação executada
- `npm run typecheck`
- `npx eslint "src/app/(app)/app/setup/page.tsx" "components/app/AppSidebar.tsx" --max-warnings=0`
- `npm run build`

## Veredito
- Corrigido.
- O item `Activation Setup` agora tem destino funcional real e não parece mais clicável sem efeito.
