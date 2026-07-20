# REVORY — plano de CNPJ, fiscal e legal para o lançamento

Data: 2026-07-19. Status: **identidade jurídica confirmada; revisão profissional e operação fiscal ainda pendentes**.

Este documento organiza o trabalho; não substitui contador nem advogado. O código e as páginas públicas podem ser finalizados no repositório, mas a identidade jurídica, o enquadramento tributário e a aprovação dos textos precisam vir de profissionais habilitados.

## 1. Abertura e enquadramento da empresa

Responsável: Henrique + contador.

1. Definir natureza jurídica, sócios, capital, endereço e nome empresarial.
2. Pedir ao contador a seleção de CNAEs que cubram o produto SaaS, licenciamento/uso de software e atividades efetivamente exercidas. Não copiar CNAE de outro SaaS sem análise tributária.
3. Executar consulta de viabilidade, inscrição e licenciamento pela [Redesim](https://www.gov.br/empresas-e-negocios/pt-br/pastas-da-nova-capa/abrir-cnpj).
4. Decidir com o contador entre Simples Nacional e outro regime. Para empresa nova, registrar a opção no prazo aplicável; a orientação oficial atual informa 30 dias do último deferimento de inscrição, desde que não tenham passado 60 dias da abertura do CNPJ.
5. Obter inscrição municipal e habilitar emissão de NFS-e. Confirmar o emissor aceito pelo município e a transição para o padrão nacional aplicável às empresas do Simples.
6. Abrir conta bancária PJ e manter os dados cadastrais idênticos em Receita, banco, Stripe, contratos e notas fiscais.

Fontes oficiais: [Redesim](https://www.gov.br/empresas-e-negocios/pt-br/redesim), [opção pelo Simples Nacional](https://www.gov.br/pt-br/servicos/optar-pelo-simples-nacional) e [NFS-e padrão nacional](https://www.gov.br/pt-br/servicos/emitir-nota-fiscal-de-servico-eletronica).

## 2. Dados que o fundador precisa devolver

Preencher somente depois da confirmação do contador/advogado:

| Campo | Valor aprovado |
|---|---|
| Razão social | AMETRINE LABS DESENVOLVIMENTO DE SOFTWARE NAO CUSTOMIZAVEL LTDA |
| Nome fantasia | AMETRINE LABS; produto público REVORY |
| CNPJ | 68.046.497/0001-12 · situação ATIVA em 16/07/2026 |
| Endereço registrado | Rua Pais Leme, 215, Conj. 1713, Pinheiros, São Paulo - SP, 05424-150 |
| Município/UF e jurisdição contratual | São Paulo/SP, Brasil · sujeito à revisão jurídica e direitos obrigatórios do cliente |
| E-mail de suporte | support@revory.app · alias/recebimento a validar antes do checkout |
| E-mail de privacidade/LGPD | privacy@revory.app · alias/recebimento a validar antes do checkout |
| E-mail de segurança/incidentes | security@revory.app · alias/recebimento a validar antes do checkout |
| Responsável primário por incidentes | Henrique, confirmar |
| Responsável substituto por incidentes | PENDENTE |
| Regime tributário | PENDENTE |
| Emissor de NFS-e | PENDENTE |
| Moeda e mercados iniciais | USD / EUA, confirmar com contador |
| Política do Audit de US$799 | versão operacional publicada: reembolso antes do início da análise; após consumo, somente cobrança indevida/duplicada, falha verificável, direito legal ou exceção aprovada |
| Política do Starter de US$399/mês | cancelar a qualquer momento para o fim do ciclo; sem pró-rata, salvo direito legal ou cobrança indevida/duplicada |
| Prazo padrão de retenção | PENDENTE |
| Prazo após cancelamento/exclusão | PENDENTE |

## 3. Pacote jurídico a aprovar

Responsável: Henrique + advogado com experiência em SaaS/LGPD e, se a venda começar nos EUA, contratos internacionais.

- Terms of Service com identidade da empresa, escopo, limitações, pagamento, renovação, cancelamento, propriedade intelectual, disponibilidade, limitação de responsabilidade e jurisdição.
- Privacy Notice cobrindo dados de conta, importações, telemetria, suporte, bases legais, retenção, direitos dos titulares e transferências internacionais.
- DPA definindo REVORY como operador/processador quando tratar dados importados sob instrução do cliente, sem apagar os papéis próprios de controlador para conta, segurança e cobrança.
- Lista de subprocessadores somente com fornecedores realmente ativos: Vercel, banco gerenciado, Resend, Google OAuth, OpenAI quando o recurso opcional estiver habilitado e Stripe apenas quando o checkout for ativado.
- Política de reembolso/cancelamento separada para o Audit one-time e para o Starter recorrente.
- Política tributária e de emissão de nota/fatura para clientes brasileiros e estrangeiros.
- Processo de incidente e solicitação de titular, com contatos e prazos operacionais reais.

A ANPD mantém orientação oficial sobre os papéis de controlador, operador, suboperador e encarregado no [Guia dos Agentes de Tratamento](https://www.gov.br/anpd/pt-br/assuntos/noticias/nova-versao-do-guia-dos-agentes-de-tratamento).

## 4. O que o projeto já pode fazer

- Manter `/terms`, `/privacy`, `/dpa`, `/security` e `/subprocessors` publicados como rascunhos operacionais honestos.
- Substituir os marcadores pendentes pelos fatos aprovados, sem alterar o visual.
- Registrar data, versão e hash dos textos aprovados.
- Exigir aceite e manter trilha de auditoria quando o checkout for ativado.
- Deixar Stripe tecnicamente preparado, mas bloqueado até preços, chaves, webhook, políticas e testes E2E serem aprovados.

## 5. Gate de liberação

`REVORY_PAID_CHECKOUT_ENABLED` deve permanecer desligado até existirem, ao mesmo tempo:

1. CNPJ e dados cadastrais finais;
2. decisão tributária e emissão fiscal testada;
3. textos jurídicos aprovados por profissional qualificado;
4. contatos públicos e política de cancelamento/reembolso publicados;
5. Stripe test mode aprovado de ponta a ponta;
6. evidência de segurança, backup/restore, email e operação exigida no checklist de lançamento.
