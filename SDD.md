# SDD — Estrutura detalhada do projeto (DuoCal)

**Data:** 2026-05-10  
**Objetivo deste SDD:** documentar a estrutura atual do repositório e o papel de cada arquivo/pasta, distinguindo o que é versionado, gerado ou local.

---

## 1) Visão geral

O DuoCal é uma aplicação PWA mobile-first em React + TypeScript, com TanStack Router, TanStack Query e Supabase. O estado atual do repositório já contém:

- autenticação por e-mail/senha;
- criação e manutenção de perfil do usuário;
- leitura do workspace atual;
- conexão por código de 6 dígitos;
- central de notificações de solicitações de workspace;
- navegação inferior para as áreas principais;
- telas placeholder para agenda, kanban e perfil.

---

## 2) Árvore do repositório

> Pastas geradas ou locais aparecem aqui, mas não são detalhadas como código de produto.

```text
DuoCal/
├─ .env.example
├─ .env.local
├─ .git/
├─ .gitignore
├─ .tanstack/
├─ dist/
├─ README.md
├─ SDD.md
├─ docs/
├─ eslint.config.js
├─ index.html
├─ node_modules/
├─ package-lock.json
├─ package.json
├─ public/
├─ src/
├─ supabase/
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

### 2.1 Raiz

- `.env.example` (**versionado**): template de variáveis de ambiente.
   - inclui `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_APP_VERSION`.
   - inclui `SUPABASE_SERVICE_ROLE_KEY` (somente CI/backend; nunca usar no frontend e nunca prefixar com `VITE_`).
- `.env.local` (**local**): variáveis de ambiente para Vite, incluindo credenciais do Supabase e versão do app.
- `.gitignore` (**versionado**): arquivos e pastas que não entram no Git.
- `eslint.config.js` (**versionado**): configuração do ESLint em flat config.
- `index.html` (**versionado**): HTML base do Vite, com `#root` e bootstrap de `src/main.tsx`.
- `package.json` (**versionado**): scripts e dependências do projeto.
- `package-lock.json` (**versionado**): lockfile do npm.
- `README.md` (**versionado**): visão geral do projeto.
- `SDD.md` (**versionado**): este documento.
- `tsconfig.json` (**versionado**): configuração principal do TypeScript.
- `tsconfig.app.json` (**versionado**): TypeScript do frontend.
- `tsconfig.node.json` (**versionado**): TypeScript das ferramentas e build.
- `vite.config.ts` (**versionado**): configuração do Vite e plugins do ecossistema do app.
   - inclui TanStack Router Plugin (geração de `routeTree.gen.ts`) e `vite-plugin-pwa` (manifest do PWA).
- `dist/` (**gerado**): saída do build do Vite (ignorada pelo Git).
- `node_modules/` (**gerado**): dependências instaladas.
- `.tanstack/` (**gerado/local**): artefatos e cache do ecossistema TanStack.
- `.git/` (**local**): metadados do Git.

### 2.2 Documentação

```text
docs/
└─ SDD_BANCO_MVP1.md
```

- `docs/SDD_BANCO_MVP1.md` (**versionado**): documento técnico do banco do MVP 1, com taxonomia, RLS, RPCs e versionamento de client.
   - observação: o fluxo de conexão evoluiu do vínculo direto por token para solicitações por código (ver migrations `008+`).

### 2.3 Assets públicos

Arquivos estáticos servidos a partir da raiz do app.

- `public/duocal-icon.svg` (**versionado**): ícone do app.
- `public/duocal-logo.svg` (**versionado**): logotipo usado nas telas de login e home.

---

## 3) `src/`

### 3.1 Árvore atual

```text
src/
├─ app/
│  └─ App.tsx
├─ assets/
├─ components/
│  ├─ index.ts
│  ├─ notifications/
│  │  ├─ index.ts
│  │  ├─ NotificationCenterCard.tsx
│  │  └─ NotificationRequestCard.tsx
│  ├─ profile/
│  │  └─ ProfileSetupModal.tsx
│  └─ ui/
│     ├─ BottomNavigation.tsx
│     ├─ Button.tsx
│     ├─ EmptyState.tsx
│     ├─ FeedbackAlert.tsx
│     ├─ Input.tsx
│     ├─ ScreenContainer.tsx
│     └─ VersionOutdatedModal.tsx
├─ hooks/
│  ├─ index.ts
│  ├─ useAuthSession.ts
│  ├─ useMeuPerfil.ts
│  ├─ useUnreadNotificationCount.ts
│  └─ useWorkspaceAtual.ts
├─ lib/
│  ├─ cache.ts
│  ├─ errors.ts
│  ├─ index.ts
│  ├─ supabase.ts
│  └─ visual.ts
├─ pages/
│  ├─ AppTabPlaceholderPage.tsx
│  ├─ ConnectPage.tsx
│  ├─ HomePage.tsx
│  ├─ LoginPage.tsx
│  └─ NotificationsPage.tsx
├─ routes/
│  ├─ __root.tsx
│  ├─ agenda.tsx
│  ├─ conectar.tsx
│  ├─ index.tsx
│  ├─ kanban.tsx
│  ├─ login.tsx
│  ├─ notificacoes.tsx
│  └─ perfil.tsx
├─ styles/
│  └─ globals.css
├─ utils/
│  └─ index.ts
├─ main.tsx
├─ router.ts
└─ routeTree.gen.ts
```

### 3.2 Responsabilidades por pasta

- `src/app/`: shell global da aplicação.
- `src/assets/`: assets versionados importados pelo frontend (atualmente vazio, reservado para imagens/ícones do bundle).
- `src/components/`: componentes reutilizáveis de UI, modais e cards.
- `src/hooks/`: hooks de sessão, perfil, workspace e notificações.
- `src/lib/`: cliente Supabase, cache, mensagens de erro e tokens visuais.
- `src/pages/`: páginas concretas usadas pelas rotas.
- `src/routes/`: rotas file-based do TanStack Router.
- `src/styles/`: estilos globais e base visual.
- `src/utils/`: utilitários puros.

### 3.3 Bootstrap

- `src/main.tsx` (**versionado**): ponto de entrada do React.
   - cria o `QueryClient` com `refetchOnWindowFocus: false` e `retry: 1`;
   - envolve a app com `QueryClientProvider` e `RouterProvider`;
   - carrega `src/styles/globals.css`.
- `src/app/App.tsx` (**versionado**): layout raiz da aplicação.
   - aplica a base visual global e o background do app.

### 3.4 Router

- `src/router.ts` (**versionado**): cria o router com base em `routeTree`.
   - usa `defaultPreload: 'intent'`.
- `src/routeTree.gen.ts` (**gerado**): árvore gerada automaticamente pelo TanStack Router Plugin.
   - não deve ser editado manualmente.

### 3.5 Rotas

- `src/routes/__root.tsx` (**versionado**): rota raiz que envolve a aplicação com `AppLayout`.
- `src/routes/index.tsx` (**versionado**): rota `/`, renderiza `HomePage`.
- `src/routes/login.tsx` (**versionado**): rota `/login`, renderiza `LoginPage`.
- `src/routes/conectar.tsx` (**versionado**): rota `/conectar`, renderiza `ConnectPage`.
- `src/routes/notificacoes.tsx` (**versionado**): rota `/notificacoes`, renderiza `NotificationsPage`.
- `src/routes/agenda.tsx` (**versionado**): rota `/agenda`, renderiza placeholder da agenda.
- `src/routes/kanban.tsx` (**versionado**): rota `/kanban`, renderiza placeholder do quadro.
- `src/routes/perfil.tsx` (**versionado**): rota `/perfil`, renderiza a tela de perfil em placeholder.

### 3.6 Páginas

- `src/pages/LoginPage.tsx` (**versionado**): tela de autenticação.
   - alterna entre `login` e `signup`;
   - usa `supabase.auth.signInWithPassword` e `supabase.auth.signUp`;
   - chama a RPC `rpc_registrar_login_usuario` após login bem-sucedido;
   - exibe `VersionOutdatedModal` quando a API sinaliza versão obsoleta.
- `src/pages/HomePage.tsx` (**versionado**): home autenticada.
   - redireciona para `/login` quando não há sessão;
   - carrega o perfil do usuário e o workspace atual;
   - mostra o código de conexão do usuário;
   - permite copiar e compartilhar o código/link;
   - permite criar workspace inicial;
   - permite solicitar conexão por código;
   - mostra o contador de notificações não lidas.
- `src/pages/ConnectPage.tsx` (**versionado**): fluxo de conexão a partir de link com `codigo`.
   - lê `?codigo=XXXXXX` da URL;
   - salva código pendente e redireciona para `/login` quando necessário;
   - usa a mutation de solicitação por código;
   - exibe modal de perfil incompleto e modal de versão quando necessário.
- `src/pages/NotificationsPage.tsx` (**versionado**): central de notificações.
   - lista solicitações pendentes e notificações de solicitação de workspace;
   - permite aceitar ou recusar solicitações;
   - usa navegação inferior e contador de não lidas;
   - trata estado de perfil incompleto e erro de versão.
- `src/pages/AppTabPlaceholderPage.tsx` (**versionado**): páginas placeholder para abas ainda não implementadas.
   - `AgendaPlaceholderPage`;
   - `KanbanPlaceholderPage`;
   - `ProfilePlaceholderPage`, que também permite sair da conta.

### 3.7 Componentes

- `src/components/index.ts` (**versionado**): barrel export dos componentes.
- `src/components/ui/Button.tsx` (**versionado**): botão com variantes `primary`, `secondary`, `ghost` e `danger`.
- `src/components/ui/Input.tsx` (**versionado**): input com label e estilo padrão.
- `src/components/ui/ScreenContainer.tsx` (**versionado**): container mobile-first com largura máxima e safe-area.
- `src/components/ui/EmptyState.tsx` (**versionado**): componente de estado vazio.
- `src/components/ui/FeedbackAlert.tsx` (**versionado**): alerta de feedback (`success`, `error`, `info`) com ação opcional de fechar.
- `src/components/ui/VersionOutdatedModal.tsx` (**versionado**): modal de atualização que limpa storages antes de recarregar.
- `src/components/ui/BottomNavigation.tsx` (**versionado**): navegação inferior com badge de notificações.
- `src/components/profile/ProfileSetupModal.tsx` (**versionado**): modal para completar perfil.
- `src/components/notifications/index.ts` (**versionado**): barrel export dos componentes de notificações.
- `src/components/notifications/NotificationCenterCard.tsx` (**versionado**): card da central de notificações com agrupamento e formatação de tempo.
- `src/components/notifications/NotificationRequestCard.tsx` (**versionado**): card individual de solicitação com ações de aceitar/recusar.

### 3.8 Hooks

- `src/hooks/index.ts` (**versionado**): barrel export dos hooks.
- `src/hooks/useAuthSession.ts` (**versionado**): carrega a sessão do Supabase e reage a `onAuthStateChange`.
   - limpa caches versionados quando a sessão é removida.
- `src/hooks/useMeuPerfil.ts` (**versionado**): obtém e completa o perfil do usuário.
   - usa `rpc_obter_meu_perfil`;
   - faz fallback para `rpc_criar_perfil_usuario`;
   - expõe `rpc_completar_perfil_usuario` e `rpc_registrar_login_usuario`.
- `src/hooks/useWorkspaceAtual.ts` (**versionado**): resolve workspace atual e integra as solicitações de conexão.
   - lê o vínculo ativo em `rel_workspace_usuario`;
   - expõe consultas de solicitações pendentes e notificações;
   - expõe mutations para solicitar conexão, responder solicitação e criar workspace inicial.
- `src/hooks/useUnreadNotificationCount.ts` (**versionado**): agrega o contador de não lidas com base nas consultas do workspace.

### 3.9 Lib

- `src/lib/supabase.ts` (**versionado**): cria o cliente Supabase.
   - valida `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_APP_VERSION`;
   - injeta o header global `x-duocal-version`.
- `src/lib/cache.ts` (**versionado**): chaves de cache versionadas e helpers de storage.
   - usa o prefixo `duocal:${VITE_APP_VERSION}:`;
   - persiste e remove o código de conexão pendente;
   - limpa `localStorage` e `sessionStorage` por prefixo.
- `src/lib/errors.ts` (**versionado**): normaliza mensagens e identifica erro de versão obsoleta.
- `src/lib/visual.ts` (**versionado**): tokens visuais do produto.
   - cores-base da marca;
   - estilos de categorias do banco em português.
- `src/lib/index.ts` (**versionado**): barrel export da camada de biblioteca.

### 3.10 Utils e estilos

- `src/utils/index.ts` (**versionado**): função `cn()` para combinar classes com `clsx` + `tailwind-merge`.
- `src/styles/globals.css` (**versionado**): estilos globais do app.

---

## 4) `supabase/`

```text
supabase/
└─ migrations/
   ├─ 20260508000100_001_extensoes_funcoes_base.sql
   ├─ 20260508000200_002_dimensoes_core.sql
   ├─ 20260508000300_003_workspaces_vinculos.sql
   ├─ 20260508000400_004_eventos_notificacoes.sql
   ├─ 20260508000500_005_rls_policies.sql
   ├─ 20260508000600_006_versionamento_app.sql
   ├─ 20260508000700_007_auth_users_trigger_dim_usuario.sql
   ├─ 20260510000100_008_ajuste_workspace_solicitacoes_codigo.sql
   ├─ 20260510000200_009_corrige_rpc_solicitacoes_workspace_uuid.sql
   ├─ 20260510000300_010_corrige_ambiguidade_rpc_responder_solicitacao_workspace.sql
   └─ 20260510000400_011_corrige_on_conflict_rpc_responder_solicitacao_workspace.sql
```

### 4.1 Papel da pasta

- `supabase/migrations/` (**versionado**): histórico de schema, funções, triggers, policies e RPCs.
- `supabase/.temp/` (**local/gerado**, quando existir): cache do Supabase CLI.

### 4.2 Migrations

- `20260508000100_001_extensoes_funcoes_base.sql`: extensão `pgcrypto` e função base de `updated_at`.
- `20260508000200_002_dimensoes_core.sql`: base de dimensões do app, incluindo `dim_usuario` e o código de conexão (inicialmente como token).
- `20260508000300_003_workspaces_vinculos.sql`: workspace, vínculo entre usuários e configuração por workspace.
- `20260508000400_004_eventos_notificacoes.sql`: categorias, eventos, relacionamentos e notificações.
- `20260508000500_005_rls_policies.sql`: funções auxiliares, grants e políticas de RLS.
- `20260508000600_006_versionamento_app.sql`: controle de versão do client via header `x-duocal-version`.
- `20260508000700_007_auth_users_trigger_dim_usuario.sql`: trigger de `auth.users` para criar `dim_usuario` e RPCs de perfil/login.
- `20260510000100_008_ajuste_workspace_solicitacoes_codigo.sql`: renomeia token para código de conexão (`cd_codigo_conexao`) e introduz o fluxo de solicitações pendentes.
   - cria `fato_solicitacao_workspace` + RLS, e permite `workspace_id` nulo em `fato_notificacao` para notificações fora de workspace.
   - adiciona a RPC `rpc_listar_solicitacoes_workspace_pendentes`.
- `20260510000200_009_corrige_rpc_solicitacoes_workspace_uuid.sql`: reaplica/corrige as RPCs de solicitação.
   - define `rpc_solicitar_conexao_por_codigo`.
   - define a versão base de `rpc_responder_solicitacao_workspace` (posteriormente ajustada em `010/011`).
- `20260510000300_010_corrige_ambiguidade_rpc_responder_solicitacao_workspace.sql`: qualifica colunas/aliases e remove ambiguidades na RPC `rpc_responder_solicitacao_workspace`.
- `20260510000400_011_corrige_on_conflict_rpc_responder_solicitacao_workspace.sql`: corrige `ON CONFLICT` na RPC `rpc_responder_solicitacao_workspace` para evitar colisões e garantir idempotência.

---

## 5) Integração com o frontend

### 5.1 Variáveis de ambiente

O frontend lê as variáveis abaixo via `import.meta.env`:

- `VITE_SUPABASE_URL`: URL do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: chave anônima do Supabase.
- `VITE_APP_VERSION`: versão do client.

### 5.2 Uso da versão do app

- `src/lib/supabase.ts` injeta `x-duocal-version` em toda chamada ao backend.
- `src/lib/cache.ts` prefixa chaves com `duocal:${VITE_APP_VERSION}:`.
- `src/components/ui/VersionOutdatedModal.tsx` limpa storages antes de recarregar quando o backend sinaliza desatualização.

### 5.3 RPCs e tabelas usadas pelo frontend

RPCs consumidas pelo client (via `supabase.rpc()`):

- Perfil (hooks `useMeuPerfil` e `useRegistrarLoginUsuario`, e tela de login):
   - `rpc_obter_meu_perfil`.
   - `rpc_criar_perfil_usuario` (fallback quando o perfil ainda não existe).
   - `rpc_completar_perfil_usuario`.
   - `rpc_registrar_login_usuario`.
- Workspace e conexão por código (hook `useWorkspaceAtual`):
   - `rpc_criar_workspace_inicial`.
   - `rpc_solicitar_conexao_por_codigo`.
   - `rpc_listar_solicitacoes_workspace_pendentes`.
   - `rpc_responder_solicitacao_workspace`.

Leituras diretas via PostgREST (via `supabase.from(...)`):

- `fato_notificacao`: lista notificações não lidas do tipo `SOLICITACAO_WORKSPACE`.
- `rel_workspace_usuario`: resolve o vínculo ativo do usuário.
- `dim_workspace`: carrega detalhes do workspace atual.

---

## 6) Scripts npm

- `npm run dev`: inicia o Vite em modo desenvolvimento.
- `npm run build`: executa `tsc -b` e depois `vite build`.
- `npm run lint`: executa o ESLint.
- `npm run preview`: sobe o preview do build gerado.

---

## 7) Status atual do projeto

O repositório já possui a base funcional do fluxo principal:

- login e signup;
- criação automática de perfil;
- leitura da sessão;
- home autenticada;
- código de conexão do usuário;
- solicitação de conexão por código;
- central de notificações de solicitações;
- navegação inferior;
- placeholders para agenda, kanban e perfil.

As próximas áreas naturais de evolução são a implementação completa da agenda, do kanban e das configurações detalhadas do workspace.
