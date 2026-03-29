# REVORY Seller 2.0

Setup inicial do projeto `revory-mvp`, construido com Next.js, TypeScript e Tailwind.

## Source Of Truth

O contexto principal deste projeto esta em [docs/source-of-truth.md](docs/source-of-truth.md).

Quando houver conflito entre docs antigas, wireframes, README legado ou implementacao parcial, siga primeiro esse documento de referencia.

## Foco do projeto

- premium
- self-service
- MedSpa-first
- booking-first
- 1 main offer por cliente no inicio
- IA minima, barata e invisivel
- dashboard centrado em receita

## Stack

- Next.js
- TypeScript
- Tailwind CSS

## Como iniciar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Variaveis de ambiente

Copie `.env.example` para `.env.local` e ajuste os valores conforme o ambiente.

## Estrutura inicial

```text
.
|-- src/
|   `-- app/
|       |-- globals.css
|       |-- layout.tsx
|       `-- page.tsx
|-- .env.example
|-- .gitignore
|-- eslint.config.mjs
|-- next.config.ts
|-- package.json
|-- postcss.config.mjs
`-- tsconfig.json
```
