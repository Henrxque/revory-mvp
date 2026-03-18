# ADR: Stack Inicial do REVORY

## Contexto

O projeto REVORY inicia como um MVP premium, self-service e MedSpa-first. Nesta fase, a prioridade é estabelecer uma base técnica enxuta, organizada e suficiente para construir, validar e operar o produto com baixo atrito de implementação e deploy.

Também é necessário manter consistência entre frontend, backend, autenticação, envio de e-mails, armazenamento de arquivos, validação de dados e execução de jobs simples no início da operação.

## Decisão

A stack inicial do REVORY é definida da seguinte forma:

- Next.js para aplicação web
- TypeScript para tipagem do projeto
- Tailwind CSS para estilização
- PostgreSQL como banco de dados principal
- Prisma como ORM e camada de acesso a dados
- Clerk para autenticação e gestão de usuários
- Resend para envio de e-mails transacionais
- Supabase Storage para armazenamento de arquivos
- Vercel para deploy e hospedagem
- Zod para validação de dados e contratos de entrada/saída
- Jobs simples implementados inicialmente com tabela própria no banco de dados

## Justificativa Objetiva

- Next.js atende a necessidade de uma base web moderna, produtiva e alinhada ao fluxo de deploy na Vercel.
- TypeScript reduz ambiguidade na evolução do código e melhora segurança de manutenção desde o início.
- Tailwind CSS permite construir interface com velocidade e consistência sem adicionar complexidade desnecessária.
- PostgreSQL oferece uma base relacional sólida para o domínio operacional do produto.
- Prisma organiza o acesso ao banco com tipagem, migrations e produtividade adequada para o MVP.
- Clerk centraliza autenticação e gestão de sessão de forma direta para um produto self-service.
- Resend cobre o envio de e-mails transacionais de maneira simples para fluxos iniciais do produto.
- Supabase Storage atende a necessidade de armazenamento de arquivos sem introduzir uma camada adicional mais complexa nesta fase.
- Vercel simplifica o pipeline de deploy e operação da aplicação web desde o primeiro ciclo.
- Zod padroniza validação de dados entre frontend, backend e integrações.
- Jobs simples em tabela própria no banco atendem a etapa inicial sem introduzir infraestrutura separada de filas ou workers.

## Consequências

- O projeto parte com uma stack coesa, conhecida e suficiente para o MVP.
- A implementação inicial fica mais rápida e com menor dispersão de decisões técnicas.
- A aplicação passa a depender explicitamente de serviços externos definidos para auth, e-mail, storage e deploy.
- Os jobs iniciais ficam limitados a um modelo simples de execução e controle via banco.
- O banco de dados assume também a responsabilidade de suportar a fila inicial de jobs simples.

## O Que Fica Para Depois

- Refinamentos de observabilidade e monitoramento operacional
- Estratégia futura para workers dedicados ou fila especializada, caso o volume de jobs exija
- Regras mais detalhadas de separação entre serviços internos, jobs e integrações
- Políticas avançadas de storage, retenção e organização de arquivos
- Endurecimento progressivo de segurança, auditoria e governança conforme evolução do produto
