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
├─ docs/
├─ eslint.config.js
├─ index.html
├─ node_modules/
├─ package-lock.json
├─ package.json
├─ public/
├─ README.md
├─ SDD.md
├─ src/
├─ supabase/
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
- `supabase/`: migrations e metadados locais do Supabase CLI.
- `tsconfig*.json`: configs TypeScript (app e node).
- `vite.config.ts`: configuração do Vite (plugins, PWA, TanStack Router plugin, Tailwind, etc.).

## docs/

```
docs/
└─ SDD_BANCO_MVP1.md
```

- `docs/`: documentação do projeto.
- `docs/SDD_BANCO_MVP1.md`: documentação focada no banco/MVP (conteúdo específico do repositório).

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
- **Supabase:** `supabase/migrations/` deve ser versionado; `supabase/.temp/` é local/gerado.
- **Remoção do template Vite:** não há mais `src/App.tsx` antigo, `App.css`, `index.css`, nem logos/links/contador do starter.

## supabase/

```
supabase/
├─ migrations/
│  ├─ 20260508000100_001_extensoes_funcoes_base.sql
│  ├─ 20260508000200_002_dimensoes_core.sql
│  ├─ 20260508000300_003_workspaces_vinculos.sql
│  ├─ 20260508000400_004_eventos_notificacoes.sql
│  ├─ 20260508000500_005_rls_policies.sql
│  └─ 20260508000600_006_versionamento_app.sql
└─ .temp/
   ├─ linked-project.json
   ├─ project-ref
   └─ (outros arquivos de cache/versões)
```

- `supabase/migrations/`: versionamento do schema/policies via SQL.
- `supabase/.temp/`: cache local do Supabase CLI (não versionar).
