# Estrutura do Projeto (hoje) — DuoCal

**Data:** 2026-05-08

> Este arquivo descreve **apenas** a estrutura atual do repositório (pastas/arquivos) e a finalidade de cada parte.

## Raiz do repositório

```
DuoCal/
├─ .env.local
├─ .git/
├─ .gitignore
├─ .tanstack/
├─ dist/
├─ eslint.config.js
├─ index.html
├─ node_modules/
├─ package-lock.json
├─ package.json
├─ public/
├─ README.md
├─ SDD.md
├─ src/
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

### Arquivos/pastas principais
- `.env.local`: variáveis locais (não commitar segredos).
- `.tanstack/`: cache/artefatos gerados pelo ecossistema TanStack (ex.: router generator).
- `dist/`: saída do build (gerada).
- `eslint.config.js`: configuração do ESLint.
- `index.html`: entry HTML do Vite.
- `node_modules/`: dependências instaladas (gerada).
- `package.json`: scripts e dependências.
- `public/`: arquivos servidos estáticos na raiz do site.
- `src/`: código-fonte da aplicação.
- `tsconfig*.json`: configs TypeScript (app e node).
- `vite.config.ts`: configuração do Vite (plugins, PWA, TanStack Router plugin, Tailwind, etc.).

## public/

```
public/
└─ (vazio)
```

> Observação: ícones do template foram removidos; se você for usar PWA, aqui normalmente ficam `pwa-192x192.png` e `pwa-512x512.png` (conforme manifest no `vite.config.ts`).

## src/

```
src/
├─ app/
│  └─ App.tsx
├─ assets/
│  └─ (vazio)
├─ components/
│  └─ index.ts
├─ hooks/
│  └─ index.ts
├─ lib/
│  └─ index.ts
├─ pages/
│  └─ HomePage.tsx
├─ routes/
│  ├─ __root.tsx
│  └─ index.tsx
├─ styles/
│  └─ globals.css
├─ utils/
│  └─ index.ts
├─ main.tsx
├─ router.ts
└─ routeTree.gen.ts
```

### O que vai em cada pasta
- `src/app/`: “shell”/layout base da aplicação (ex.: header/footer, containers, providers de UI).
- `src/assets/`: imagens/fontes locais importadas via bundler (hoje está vazio).
- `src/components/`: componentes reutilizáveis e compartilhados (botões, inputs, cards…).
- `src/hooks/`: hooks reutilizáveis (`useXyz`).
- `src/lib/`: integrações e clientes (ex.: Supabase client, API clients, wrappers).
- `src/pages/`: páginas (UI de alto nível) consumidas por rotas.
- `src/routes/`: rotas file-based do TanStack Router.
- `src/styles/`: estilos globais (Tailwind e resets).
- `src/utils/`: funções utilitárias puras.

### Arquivos principais
- `src/main.tsx`: bootstrap do React (mount no `#root`) e `RouterProvider`.
- `src/router.ts`: instancia o router usando o `routeTree`.
- `src/routeTree.gen.ts`: arquivo gerado pelo TanStack Router plugin a partir de `src/routes/`.
- `src/routes/__root.tsx`: rota raiz (layout + `Outlet`).
- `src/routes/index.tsx`: rota `/` (home).
- `src/styles/globals.css`: Tailwind import + estilos globais.

## Notas rápidas
- **Arquivos gerados:** `dist/`, `node_modules/`, `src/routeTree.gen.ts`.
- **Remoção do template Vite:** não há mais `src/App.tsx` antigo, `App.css`, `index.css`, nem logos/links/contador do starter.
