# SDD Banco MVP 1 - DuoCal

Data: 2026-05-08

Este documento descreve a base inicial de banco do DuoCal para o MVP 1. O foco desta etapa é preparar Supabase Auth, modelo multi-tenant por workspace, vínculo entre usuários por token, agenda compartilhada, notificações internas, RLS e versionamento de client.

## Migrations

As migrations ficam em `supabase/migrations/`:

- `20260508000100_001_extensoes_funcoes_base.sql`: extensão `pgcrypto` e função padrão de `updated_at`.
- `20260508000200_002_dimensoes_core.sql`: `dim_usuario`, token de conexão e trigger de proteção do token.
- `20260508000300_003_workspaces_vinculos.sql`: workspace, membros, configuração, convites e RPCs principais.
- `20260508000400_004_eventos_notificacoes.sql`: categorias, eventos, participantes, recorrência e notificações.
- `20260508000500_005_rls_policies.sql`: funções auxiliares de segurança, grants e policies de RLS.
- `20260508000600_006_versionamento_app.sql`: versão mínima/atual do client e validação por header.

## Taxonomia

O banco usa uma taxonomia única em português:

- `dim_`: dimensões e cadastros principais, como `dim_usuario`, `dim_workspace`, `dim_categoria_evento`.
- `fato_`: fatos/eventos operacionais, como `fato_evento`, `fato_notificacao`, `fato_convite_workspace`.
- `rel_`: relacionamentos N:N, como `rel_workspace_usuario`, `rel_evento_usuario`.
- `cfg_`: configurações, como `cfg_workspace`.
- `aux_`: dados auxiliares, como `aux_categoria_evento_padrao`.
- `fn_`: funções internas.
- `rpc_`: funções chamadas pelo client.
- `trg_`, `idx_`, `chk_`, `uq_`: triggers, índices, checks e uniques nomeados.

## Usuários e Supabase Auth

Supabase Auth continua sendo a fonte de autenticação em `auth.users`.

A aplicação usa `public.dim_usuario` como perfil próprio do produto. Cada linha possui:

- `auth_user_id`, com referência a `auth.users(id)`.
- `id`, UUID interno do app.
- `nm_usuario`, `ds_email`, avatar e campos de auditoria.
- `cd_token_conexao`, token único de 6 dígitos usado para conexão entre usuários.

A RPC `public.rpc_criar_perfil_usuario(p_nm_usuario text default null)` cria o perfil do usuário autenticado quando ele ainda não existe. O e-mail é lido do JWT quando disponível. O token é gerado no banco.

## Token de 6 Dígitos

O token fica em `dim_usuario.cd_token_conexao`.

Regras aplicadas:

- Formato obrigatório: exatamente 6 números.
- Unique global em `cd_token_conexao`.
- Geração automática por `public.fn_gerar_token_usuario()`.
- Trigger `trg_dim_usuario_token_biu` gera token no insert e bloqueia alteração no update.
- O usuário pode visualizar apenas o próprio perfil pelo RLS, portanto visualiza apenas o próprio token.

A geração usa `pgcrypto.gen_random_bytes(4)` e tenta novamente em caso de colisão.

## Workspace

`public.dim_workspace` representa o espaço compartilhado. O MVP usa `tp_workspace = 'CASAL'`, mas o check já aceita `CASAL`, `FAMILIA` e `GRUPO`.

`public.rel_workspace_usuario` relaciona usuários e workspaces. O criador inicial entra como `ADMIN`; o usuário conectado por token entra como `MEMBRO`.

`public.cfg_workspace` guarda configuração por workspace:

- início/fim do dia;
- flags de notificação, push futuro, kanban e agenda;
- idioma e timezone.

## Vínculo por Token

A RPC `public.rpc_conectar_usuario_por_token(p_cd_token_conexao char(6))` executa o vínculo direto do MVP.

Fluxo:

1. Valida `auth.uid()`.
2. Localiza o perfil atual em `dim_usuario`.
3. Valida o token recebido.
4. Bloqueia token próprio.
5. Bloqueia usuário destino inativo.
6. Verifica se os usuários já compartilham workspace ativo.
7. Decide o workspace:
   - se o destino já tem workspace ativo e o atual não tem, o atual entra no workspace do destino;
   - se o atual já tem workspace ativo e o destino não tem, o destino entra no workspace do atual;
   - se nenhum tem workspace, cria um workspace `CASAL`;
   - se ambos já têm workspaces ativos distintos, bloqueia por ambiguidade.
8. Registra `fato_convite_workspace` com status `ACEITO`.
9. Retorna JSON com workspace e membros.

Erros esperados:

- `USUARIO_NAO_AUTENTICADO`
- `PERFIL_NAO_ENCONTRADO`
- `TOKEN_INVALIDO`
- `TOKEN_PROPRIO_NAO_PERMITIDO`
- `USUARIO_DESTINO_INATIVO`
- `USUARIO_JA_VINCULADO`
- `CONFLITO_WORKSPACE_EXISTENTE`

## Agenda

`public.dim_categoria_evento` guarda categorias por workspace. A tabela auxiliar `public.aux_categoria_evento_padrao` guarda sugestões iniciais:

- Trabalho
- Faculdade
- Casal
- Saúde
- Finanças
- Casa

`public.fato_evento` guarda eventos compartilhados. Não há evento privado no MVP. Todo evento pertence a um `workspace_id`, pode ter categoria, período, status e flags de dia inteiro, bloqueio de horário e recorrência.

`public.rel_evento_usuario` relaciona participantes e responsáveis. A FK composta `(evento_id, workspace_id)` garante que o relacionamento pertence ao mesmo workspace do evento. A FK `(workspace_id, usuario_id)` garante que o participante existe no workspace.

`public.dim_recorrencia_evento` guarda recorrência simples: `DIARIA`, `SEMANAL` ou `MENSAL`.

## Notificações

`public.fato_notificacao` guarda notificações internas, sem push real nesta etapa. Ela já está preparada para MVP 2 com campos de agendamento/envio.

O usuário destino pode ler e marcar como lida. Administradores do workspace podem visualizar notificações do workspace para suporte operacional futuro.

## Isolamento por Workspace

Todas as tabelas operacionais de agenda, configuração, relacionamento, convite e notificação possuem `workspace_id` quando isso faz sentido.

O isolamento usa três camadas:

- FKs para manter integridade entre workspace, evento, participante e notificação.
- FKs compostas em eventos/participantes/recorrência para impedir cruzamento de `workspace_id`.
- RLS usando `public.fn_usuario_membro_workspace(p_workspace_id)` e `public.fn_usuario_admin_workspace(p_workspace_id)`.

## RLS

RLS está habilitado em todas as tabelas públicas criadas.

Funções auxiliares:

- `public.fn_usuario_atual_id()`: retorna o `dim_usuario.id` do `auth.uid()`.
- `public.fn_usuario_membro_workspace(p_workspace_id uuid)`: indica se o usuário atual é membro ativo.
- `public.fn_usuario_admin_workspace(p_workspace_id uuid)`: indica se o usuário atual é admin ativo.

Resumo das policies:

- `dim_usuario`: usuário acessa e atualiza apenas o próprio perfil; delete não é concedido.
- `dim_workspace`: membro lê; admin atualiza; criação direta pelo client não é concedida.
- `rel_workspace_usuario`: membro lê; admin insere/atualiza; delete não é concedido.
- `cfg_workspace`: membro lê; admin insere/atualiza; delete não é concedido.
- `dim_categoria_evento`: membro lê, insere e atualiza; delete físico não é concedido.
- `fato_evento`: membro lê, insere e atualiza; cancelamento deve usar `tp_status = 'CANCELADO'`.
- `rel_evento_usuario`: membro lê, insere, atualiza e remove participantes.
- `dim_recorrencia_evento`: membro lê, insere, atualiza e remove recorrência.
- `fato_notificacao`: destino lê e marca como lida; admin também pode ler.
- `fato_convite_workspace`: origem ou destino lê; insert/update ficam concentrados na RPC.
- `dim_versao_aplicacao`: usuário autenticado lê apenas a versão atual.

As RPCs sensíveis usam `SECURITY DEFINER` e `search_path` fixo.

## Versionamento do App

`public.dim_versao_aplicacao` controla a versão atual do client.

Versão inicial:

- `cd_versao = '20260508.001'`
- `ds_versao = 'Versão inicial do DuoCal'`
- `fl_versao_atual = true`
- `fl_bloqueia_versoes_antigas = true`

Existe índice unique parcial para permitir apenas uma versão atual.

`public.fn_validar_versao_requisicao()` está preparada para uso com `pgrst.db_pre_request`. Ela lê o header:

```txt
x-duocal-version
```

Se o header não existir, ou se for diferente da versão atual enquanto `fl_bloqueia_versoes_antigas = true`, a função lança:

- detail: `VERSAO_CLIENTE_OBSOLETA`
- message: `Sua versão do DuoCal está desatualizada. Atualize o aplicativo para continuar.`

Observação operacional: a migration cria a função, mas não aplica automaticamente a configuração global do PostgREST. Em Supabase, validar no ambiente antes de configurar `pgrst.db_pre_request = 'public.fn_validar_versao_requisicao'`, pois isso passa a afetar chamadas REST/RPC.

## Contrato Futuro do Frontend

Quando o client Supabase for ajustado, toda chamada deve enviar:

```ts
x-duocal-version: import.meta.env.VITE_APP_VERSION
```

O cache local deve usar prefixo versionado:

```ts
duocal:${VITE_APP_VERSION}:
```

Ao detectar `VERSAO_CLIENTE_OBSOLETA`, o frontend deve:

1. Exibir modal de atualização.
2. Limpar caches da versão antiga.
3. Limpar `localStorage` e `sessionStorage` com prefixo `duocal:`.
4. Manter a sessão do Supabase, se possível.
5. Executar `window.location.reload()`.

## Próxima Etapa

A próxima etapa planejada é implementar a tela de login e o bootstrap autenticado:

- configurar o client Supabase para enviar `x-duocal-version`;
- chamar `rpc_criar_perfil_usuario` após autenticação;
- criar ou conectar workspace;
- preparar cache versionado no TanStack Query/local storage.
