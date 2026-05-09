# SDD — Estrutura detalhada do projeto (DuoCal)

**Data:** 2026-05-08  
**Objetivo deste SDD:** documentar a **estrutura atual do repositório** (pastas/arquivos) e descrever **o propósito de cada item**, indicando o que é **versionado** vs **gerado/local**.

---

## 1) Árvore do repositório (nível alto)

> Pastas grandes/geradas (`node_modules/`, `dist/`) aparecem aqui, mas não são expandidas.

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

---

## 2) Descrição item-a-item (raiz)

### 2.1 Configuração e build
- `.env.local` (**local**, não commitar segredos): variáveis de ambiente para Vite (prefixo `VITE_`).
- `.gitignore` (**versionado**): define o que não entra no Git (ex.: `node_modules/`, `dist/`, `supabase/.temp/`).
- `eslint.config.js` (**versionado**): ESLint em modo flat config; aplica regras para TS/React Hooks/React Refresh.
- `tsconfig.json` (**versionado**): “solution config” com referências para `tsconfig.app.json` e `tsconfig.node.json`.
- `tsconfig.app.json` (**versionado**): configura o TypeScript do app (`src/`), modo bundler, `jsx: react-jsx`.
- `tsconfig.node.json` (**versionado**): configura o TypeScript do Node (principalmente `vite.config.ts`).
- `vite.config.ts` (**versionado**): plugins do Vite (React, Tailwind, TanStack Router, PWA) e manifest do app.
- `index.html` (**versionado**): HTML do Vite (metas, favicon, `#root`, script para `src/main.tsx`).

### 2.2 Dependências e artefatos
- `package.json` (**versionado**): scripts (`dev`, `build`, `lint`, `preview`) e dependências.
- `package-lock.json` (**versionado**): lockfile do npm.
- `node_modules/` (**gerado**): dependências instaladas.
- `dist/` (**gerado**): saída do build do Vite.

### 2.3 Documentos
- `README.md` (**versionado**): documentação geral do projeto (pode estar básico).
- `SDD.md` (**versionado**): este documento.
- `docs/` (**versionado**): documentação complementar (expandido na seção 3).

### 2.4 Integrações
- `supabase/` (**misto**): migrations versionadas + cache local do Supabase CLI (expandido na seção 5).

### 2.5 Pastas internas do Git/Tooling
- `.git/` (**local**): metadados do Git.
- `.tanstack/` (**local/gerado**): artefatos/caches do ecossistema TanStack (ex.: geração de rotas). Conteúdo pode variar por máquina.

---

## 3) docs/

```
docs/
└─ SDD_BANCO_MVP1.md
```

- `docs/SDD_BANCO_MVP1.md` (**versionado**): especificação do banco para o MVP (migrations, taxonomia `dim_`/`fato_`/`rel_`, RLS, versionamento por header `x-duocal-version`).

---

## 4) public/

Arquivos estáticos servidos na raiz do app (ex.: `/duocal-logo.svg`).

```
public/
├─ duocal-icon.svg
└─ duocal-logo.svg
```

- `public/duocal-icon.svg` (**versionado**): ícone do app.
   - Usado em: `index.html` (favicon) e `vite.config.ts` (PWA manifest `icons`).
- `public/duocal-logo.svg` (**versionado**): logotipo exibido em telas (ex.: login/home).

---

## 5) src/

### 5.1 Árvore

```
src/
├─ app/
│  └─ App.tsx
├─ assets/
│  └─ (vazio)
├─ components/
│  ├─ index.ts
│  ├─ profile/
│  │  └─ ProfileSetupModal.tsx
│  └─ ui/
│     ├─ Button.tsx
│     ├─ Input.tsx
│     ├─ ScreenContainer.tsx
│     └─ VersionOutdatedModal.tsx
├─ hooks/
│  ├─ index.ts
│  ├─ useAuthSession.ts
│  ├─ useMeuPerfil.ts
│  └─ useWorkspaceAtual.ts
├─ lib/
│  ├─ cache.ts
│  ├─ errors.ts
│  ├─ index.ts
│  └─ supabase.ts
├─ pages/
│  ├─ HomePage.tsx
│  └─ LoginPage.tsx
├─ routes/
│  ├─ __root.tsx
│  ├─ index.tsx
│  └─ login.tsx
├─ styles/
│  └─ globals.css
├─ utils/
│  └─ index.ts
├─ main.tsx
├─ router.ts
└─ routeTree.gen.ts
```

### 5.2 Pastas (responsabilidades)
- `src/app/`: layout/shell base da aplicação.
- `src/assets/`: assets importados via bundler (quando houver).
- `src/components/`: componentes reutilizáveis (UI + modais).
- `src/hooks/`: hooks com regras de negócio e acesso a dados.
- `src/lib/`: infraestrutura (cliente Supabase, helpers de erro, cache versionado).
- `src/pages/`: páginas (telas) consumidas por rotas.
- `src/routes/`: rotas file-based (TanStack Router).
- `src/styles/`: CSS global (Tailwind + ajustes base).
- `src/utils/`: utilitários puros (ex.: `cn` para classes).

### 5.3 Entrypoint e providers
- `src/main.tsx` (**versionado**): bootstrap do React.
   - Cria `QueryClient` (TanStack Query) com defaults (`refetchOnWindowFocus: false`, `retry: 1`).
   - Envolve a app com `QueryClientProvider` e `RouterProvider`.
   - Importa o CSS global (`src/styles/globals.css`).

### 5.4 Router
- `src/router.ts` (**versionado**): cria o router (`createRouter`) usando `routeTree` gerado.
- `src/routeTree.gen.ts` (**gerado**): arquivo gerado automaticamente pelo TanStack Router Plugin com base em `src/routes/`.
   - **Não editar manualmente**.

### 5.5 Rotas
- `src/routes/__root.tsx` (**versionado**): rota raiz; define o layout via `AppLayout` e renderiza `Outlet`.
- `src/routes/index.tsx` (**versionado**): rota `/` → renderiza `HomePage`.
- `src/routes/login.tsx` (**versionado**): rota `/login` → renderiza `LoginPage`.

### 5.6 Páginas
- `src/pages/LoginPage.tsx` (**versionado**): tela de autenticação.
   - Alterna modo `login`/`signup`.
   - Usa `supabase.auth.signInWithPassword` / `supabase.auth.signUp`.
   - Exibe `VersionOutdatedModal` quando o backend exigir atualização via versão.
- `src/pages/HomePage.tsx` (**versionado**): tela principal (pós-login).
   - Garante sessão (redireciona para `/login` quando não autenticado).
   - Busca/gera perfil do usuário e dados do workspace.
   - Mostra token de conexão e ações de conectar/criar workspace.

### 5.7 Componentes
- `src/components/index.ts` (**versionado**): barrel exports (reexporta UI e modais).
- `src/components/ui/Button.tsx`: botão com variantes (`primary`, `secondary`, `ghost`) e estado `isLoading`.
- `src/components/ui/Input.tsx`: input com label e estilos padrão.
- `src/components/ui/ScreenContainer.tsx`: container responsivo/mobile-first (limita largura e aplica padding/safe-area).
- `src/components/ui/VersionOutdatedModal.tsx`: modal que orienta atualizar/refresh; limpa storages via `clearDuocalStorage()`.
- `src/components/profile/ProfileSetupModal.tsx`: modal para completar perfil do usuário (nome de exibição etc.).

### 5.8 Hooks
- `src/hooks/index.ts`: barrel exports (reexporta todos os hooks do diretório).
- `src/hooks/useAuthSession.ts`: mantém a sessão do Supabase em cache (TanStack Query) e reage a `onAuthStateChange`.
- `src/hooks/useMeuPerfil.ts`: obtém/cria perfil via RPC (`rpc_obter_meu_perfil`, fallback `rpc_criar_perfil_usuario`) e mutations (`rpc_completar_perfil_usuario`, `rpc_registrar_login_usuario`).
- `src/hooks/useWorkspaceAtual.ts`: resolve workspace atual e expõe mutations para conexão/criação via RPC.

### 5.9 Lib
- `src/lib/supabase.ts`: cria o client do Supabase e valida variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_VERSION`.
   - Injeta header global `x-duocal-version` com a versão do app.
- `src/lib/cache.ts`: chaves de cache versionadas (`duocal:${VITE_APP_VERSION}:`) e helpers para limpar storages por prefixo.
- `src/lib/errors.ts`: normalização de mensagens e detecção de erro de versão obsoleta.
- `src/lib/index.ts`: barrel exports.

### 5.10 Styles e utils
- `src/styles/globals.css`: Tailwind + estilos globais básicos e herança de fonte para `button/input`.
- `src/utils/index.ts`: utilitário `cn()` (combina `clsx` + `tailwind-merge`).

---

## 6) supabase/

> Pasta usada pelo Supabase CLI.

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

### 6.1 migrations/
- `20260508000100_001_extensoes_funcoes_base.sql`: habilita extensão `pgcrypto` e cria função padrão `fn_set_updated_at()`.
- `20260508000200_002_dimensoes_core.sql`: cria `dim_usuario` (perfil do app), gera token de conexão (6 dígitos) e trigger para proteger o token.
- `20260508000300_003_workspaces_vinculos.sql`: cria `dim_workspace`, vínculo `rel_workspace_usuario`, `cfg_workspace`, convites e triggers de `updated_at`.
- `20260508000400_004_eventos_notificacoes.sql`: categorias padrão/por workspace, eventos (`fato_evento`) e relacionamento de participantes.
- `20260508000500_005_rls_policies.sql`: funções auxiliares e políticas/grants de RLS para isolar por workspace.
- `20260508000600_006_versionamento_app.sql`: tabela de versão da aplicação e função `fn_validar_versao_requisicao()` para exigir header `x-duocal-version`.

### 6.2 .temp/
- `supabase/.temp/` (**local/gerado**): cache do Supabase CLI (não versionar; já ignorado no `.gitignore`).

---

## 7) Variáveis de ambiente (Vite)

> Variáveis lidas no frontend via `import.meta.env`.

- `VITE_SUPABASE_URL`: URL do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: chave anônima do Supabase.
- `VITE_APP_VERSION`: versão do client usada para:
   - header `x-duocal-version` (backend pode bloquear versões antigas);
   - chaves de cache e limpeza de storage por prefixo.

---

## 8) Scripts npm

- `npm run dev`: inicia o Vite.
- `npm run build`: `tsc -b` + `vite build`.
- `npm run lint`: roda ESLint.
- `npm run preview`: preview do build.
