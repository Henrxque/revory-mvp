# Sprint 10 — Homologação remota e experiência autenticada AI SaaS

Estado em 2026-10-05: **PLANEJADA; gate aberto**. Esta sprint inicia a execução após o plano 0–9 e não muda a decisão `NO_GO` da [Sprint 09](SPRINT_09_AI_SAAS_LAUNCH_PREPARATION_2026-10-02.md). A home pública já apresenta o novo REVORY e uma demo sintética; o fluxo AI SaaS após login continua bloqueado em produção. A prova local com dados fictícios não é homologação remota nem autorização para dados reais.

## Resultado executável

Entregar uma URL de homologação protegida, acessível ao fundador, com banco **isolado e verificado**, onde seja possível percorrer login → dashboard AI → importação sintética → mapping → scan → finding → export. O ambiente não oferece scan de dados do cliente, compra live ou monitoramento real.

## Trabalho

1. Registrar commit, projeto/ambiente Vercel, datasource, domínio de preview e responsáveis. Verificar por fingerprint não sensível que o `DATABASE_URL` do preview aponta para um banco distinto do principal **antes** do build: `scripts/vercel-build.mjs` executa `prisma migrate deploy` em preview e produção. Não imprimir URLs, tokens ou senhas no relatório.
2. Criar ou vincular um banco descartável isolado; aplicar migrations aditivas e provar backup/restauração nesse alvo. Sem migration destrutiva, cópia de dados reais ou reuso semântico de tabelas contractor/MedSpa.
3. Tornar a flag AI SaaS controlável no ambiente de homologação sem abrir a aplicação nova em `revory.app` por efeito colateral. A condição atual em `services/ai-integrity/experience.ts` bloqueia `NODE_ENV=production`; a substituição deve distinguir *ambiente aprovado* de `NODE_ENV`, falhar fechado e preservar o fallback histórico.
4. Inventariar rotas, links e navegação após login como `keep`, `restore`, `adapt` ou `retire`, com dependência de substituição. Exibir somente a navegação AI SaaS no preview; manter acesso e dados históricos até decisão de migração específica. Corrigir links que devolvam o fundador ao dashboard Quote Recovery.
5. Preservar NextAuth/Google OAuth, e-mail/senha, verificação/reset, sessões, identidade/workspace e Resend. Testar cada fluxo configurado no alvo; qualquer ajuste de callback, segredo ou domínio remetente exige necessidade demonstrada e autoridade explícita.
6. Preparar conta e fixtures **sintéticas** de teste com validade/limpeza definidas. Testar isolamento entre dois workspaces, upload inválido, duplicata, reembolso simulado e export. O dashboard deve rotular dados sintéticos e não expor ofertas novas como disponíveis.
7. Comparar landing, login, dashboard, importação e relatório em desktop/mobile com o contrato visual: `#141516`, `#252729`, `#43B39B`, logo transparente e Instrument Serif/DM Sans/Sora. Registrar screenshots sem dados privados.

## Aceite verificável

- URL restrita funciona fora de `localhost`; um usuário convidado conclui o percurso sintético sem call e recebe export reproduzível.
- Preview e produção têm datasources comprovadamente diferentes; build, migração e rollback são ensaiados no alvo isolado.
- Login, reset/verificação, sessão e workspace funcionam conforme a configuração aprovada; nenhum usuário vê registros de outro workspace.
- `revory.app` mantém a apresentação pública e o percurso legado até o gate de liberação; preview não aceita dados reais nem cobrança live.
- Há relatório com commit, ambiente, evidências redigidas, falhas corrigidas e decisão `PASS/FAIL`. `FAIL` impede a Sprint 11 de usar esse ambiente.

## Fora desta sprint

Conexão OpenAI/Stripe real, análise de cliente, comprador pago, ativação de preço live e publicação oficial. A [Sprint 11](SPRINT_11_AI_SAAS_OPENAI_SOURCE_2026-10-05.md) usa esta homologação para a primeira fonte conectada.
