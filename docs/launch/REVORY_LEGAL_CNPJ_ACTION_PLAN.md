# REVORY — plano de CNPJ, fiscal e legal para o lançamento

Data: 2026-07-22. Status: **identidade jurídica, regime tributário e contatos públicos confirmados; comprovantes fiscais privados, acesso/emissão de NFS-e, revisão profissional e operação fiscal ainda pendentes**.

Este documento organiza o trabalho; não substitui contador nem advogado. O código e as páginas públicas podem ser finalizados no repositório, mas a identidade jurídica, o enquadramento tributário e a aprovação dos textos precisam vir de profissionais habilitados.

## 1. Abertura e enquadramento da empresa

Responsável: Henrique + contador.

1. Natureza jurídica, nome, endereço, porte, situação cadastral e CNAEs foram conferidos no comprovante da Receita emitido em 20/07/2026.
2. O fundador confirmou o regime Simples Nacional em 22/07/2026. Baixar e guardar fora do repositório o resultado da **Consulta Optantes** ou termo de deferimento; "arquivar" significa apenas preservar esse PDF/resultado como evidência fiscal privada.
3. Emitir e guardar a **Ficha de Dados Cadastrais (FDC)** do Cadastro de Contribuintes Mobiliários (CCM). A FDC é o comprovante oficial da inscrição municipal; o comprovante de CNPJ anexado não exibe o número do CCM.
4. Concluir a validação de identidade e o acesso fiscal. O fundador informa que o certificado digital ainda está em emissão e que o acesso ao sistema de NFS-e ainda não foi liberado.
5. Habilitar e testar a emissão de NFS-e antes da primeira cobrança real. Até 31/08/2026, usar o emissor municipal de São Paulo; a partir de 01/09/2026, empresas ME/EPP optantes pelo Simples Nacional deverão usar o Emissor Nacional.
6. Abrir ou confirmar conta bancária PJ e manter os dados cadastrais idênticos em Receita, banco, Stripe, contratos e notas fiscais.

Fontes oficiais: [Redesim](https://www.gov.br/empresas-e-negocios/pt-br/redesim), [Consulta/Opção pelo Simples Nacional](https://www8.receita.fazenda.gov.br/SimplesNacional/Servicos/Grupo.aspx?grp=4), [FDC/CCM de São Paulo](https://prefeitura.sp.gov.br/web/fazenda/w/servicos/ccm/2373), [emissor municipal](https://nfe.prefeitura.sp.gov.br/login.aspx) e [transição obrigatória para o Emissor Nacional em 01/09/2026](https://notadomilhao.sf.prefeitura.sp.gov.br/noticias/emissao-de-nfs-e-pelo-emissor-nacional-passa-a-ser-obrigatoria/).

### Caminho operacional de NFS-e

1. Concluir o certificado digital/validação de identidade em andamento e obter o acesso da pessoa jurídica. No sistema municipal, a pessoa jurídica usa SenhaWeb e pode usar certificado ICP-Brasil; no Emissor Nacional, o guia também prevê acesso por CNPJ/senha sem certificado depois do cadastro/habilitação. Portanto, o certificado não deve ser tratado como a única rota possível de emissão.
2. Emitir a FDC pelo CNPJ e confirmar que o CCM está ativo e com o código de serviço correto.
3. Enquanto a empresa estiver emitindo antes de 01/09/2026, configurar o perfil e fazer uma emissão controlada no sistema municipal da Nota Fiscal Paulistana.
4. Preparar também o primeiro acesso ao [Emissor Nacional](https://www.nfse.gov.br/EmissorNacional), pois o uso passa a ser obrigatório para optantes pelo Simples em 01/09/2026.
5. Antes da primeira nota real, pedir à Contabilizei confirmação escrita do código de serviço, retenções, incidência de ISS, preenchimento de IBS/CBS aplicável e tratamento de clientes no exterior. O REVORY não automatiza essa emissão nesta fase.

## 2. Dados que o fundador precisa devolver

Preencher somente depois da confirmação do contador/advogado:

| Campo | Valor aprovado |
|---|---|
| Razão social | AMETRINE LABS DESENVOLVIMENTO DE SOFTWARE NAO CUSTOMIZAVEL LTDA |
| Nome fantasia | AMETRINE LABS; produto público REVORY |
| CNPJ | 68.046.497/0001-12 · situação ATIVA em 16/07/2026 |
| Natureza jurídica e porte | Sociedade Empresária Limitada (206-2) · ME |
| Endereço registrado | Rua Pais Leme, 215, Conj. 1713, Pinheiros, São Paulo - SP, 05424-150 |
| CNAE principal | 62.03-1-00 · Desenvolvimento e licenciamento de programas de computador não-customizáveis |
| CNAEs secundários | 62.01-5-01; 62.04-0-00; 63.11-9-00 |
| Município/UF e jurisdição contratual | São Paulo/SP, Brasil · sujeito à revisão jurídica e direitos obrigatórios do cliente |
| E-mail de suporte, cobrança, reembolso e privacidade/LGPD | support@revory.app · recebimento testado pelo fundador em 22/07/2026 |
| E-mail de segurança/incidentes | security@revory.app · recebimento testado pelo fundador em 22/07/2026 |
| Responsável primário por incidentes | Henrique |
| Responsável substituto por incidentes | NÃO EXISTE NESTA FASE; risco operacional aceito para operação solo-founder, com rota técnica alternativa documentada; adicionar uma pessoa confiável antes de escalar |
| Regime tributário | Simples Nacional · confirmado pelo fundador em 22/07/2026; resultado da Consulta Optantes/termo ainda deve ser preservado no arquivo fiscal privado |
| Inscrição municipal | EXISTENTE segundo o fundador; FDC do CCM ainda deve ser emitida e preservada no arquivo fiscal privado |
| Emissor de NFS-e | PENDENTE · certificado/identidade e acesso municipal ainda em validação; transição para Emissor Nacional obrigatória em 01/09/2026 |
| Moeda e mercados iniciais | USD / EUA, confirmar com contador |
| Política do Audit de US$799 | versão operacional publicada: reembolso antes do início da análise; após consumo, somente cobrança indevida/duplicada, falha verificável, direito legal ou exceção aprovada |
| Política do Starter de US$399/mês | cancelar a qualquer momento para o fim do ciclo; sem pró-rata, salvo direito legal ou cobrança indevida/duplicada |
| Prazo padrão de retenção | 365 dias; cliente pode selecionar 30, 90, 180 ou 365 dias |
| Prazo após fim do acesso recorrente | até 30 dias para exportar; depois excluir dados de importação/análise, preservando somente registros legais, fiscais, de segurança e backup pelo prazo necessário |
| Digest operacional | segunda-feira, 10:00 America/Sao_Paulo |
| Meta interna de suporte | primeira resposta em 1 dia útil; sem promessa pública de 24/7 ou SLA contratual nesta fase |

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

1. CNPJ e dados cadastrais finais, incluindo comprovante da inscrição municipal;
2. decisão tributária documentada e emissão fiscal testada;
3. textos jurídicos aprovados por profissional qualificado;
4. contatos públicos e política de cancelamento/reembolso publicados;
5. Stripe test mode aprovado de ponta a ponta;
6. evidência de segurança, backup/restore, email e operação exigida no checklist de lançamento.
