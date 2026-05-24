-- ============================================================
-- 018 · Avatar de Perfil
-- Adiciona avatar_path em dim_usuario, RPCs de atualização,
-- atualiza rpc_listar_membros_workspace, cria bucket avatars
-- no Storage e configura policies de acesso.
-- ============================================================

-- ─── 1. Coluna avatar_path ────────────────────────────────────
alter table public.dim_usuario
  add column if not exists avatar_path text null;

grant update (avatar_path) on public.dim_usuario to authenticated;

-- ─── 2. RPC: salvar avatar_path após upload ───────────────────
create or replace function public.rpc_atualizar_avatar_usuario(
  p_avatar_path text
)
returns public.dim_usuario
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_usuario public.dim_usuario;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO'
      using errcode = 'P0001';
  end if;

  if nullif(btrim(p_avatar_path), '') is null then
    raise exception 'AVATAR_PATH_OBRIGATORIO'
      using errcode = 'P0001';
  end if;

  update public.dim_usuario u
  set
    avatar_path = btrim(p_avatar_path),
    updated_at  = now()
  where u.auth_user_id = auth.uid()
    and u.fl_ativo      = true
  returning *
  into v_usuario;

  if v_usuario.id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO'
      using errcode = 'P0001';
  end if;

  return v_usuario;
end;
$$;

-- ─── 3. RPC: limpar avatar_path (remoção) ────────────────────
create or replace function public.rpc_remover_avatar_usuario()
returns public.dim_usuario
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_usuario public.dim_usuario;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO'
      using errcode = 'P0001';
  end if;

  update public.dim_usuario u
  set
    avatar_path = null,
    updated_at  = now()
  where u.auth_user_id = auth.uid()
    and u.fl_ativo      = true
  returning *
  into v_usuario;

  if v_usuario.id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO'
      using errcode = 'P0001';
  end if;

  return v_usuario;
end;
$$;

-- ─── 4. Atualizar rpc_listar_membros_workspace ───────────────
-- Inclui avatar_path para exibição nas telas de agenda e perfil
create or replace function public.rpc_listar_membros_workspace(
  p_workspace_id uuid
)
returns table (
  usuario_id  uuid,
  nm_usuario  text,
  ds_email    text,
  tp_papel    text,
  dt_entrada  timestamptz,
  avatar_path text
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_usuario_id uuid;
begin
  v_usuario_id := public.fn_usuario_atual_id();

  if v_usuario_id is null then
    raise exception 'NAO_AUTENTICADO' using hint = 'auth';
  end if;

  if not public.fn_usuario_membro_workspace(p_workspace_id) then
    raise exception 'SEM_PERMISSAO' using hint = 'workspace';
  end if;

  return query
  select
    u.id,
    u.nm_usuario,
    u.ds_email,
    r.tp_papel,
    r.dt_entrada,
    u.avatar_path
  from public.rel_workspace_usuario r
  join public.dim_usuario u on u.id = r.usuario_id
  where r.workspace_id = p_workspace_id
    and r.fl_ativo = true
  order by r.dt_entrada;
end;
$$;

-- ─── 5. Permissões ───────────────────────────────────────────
revoke all on function public.rpc_atualizar_avatar_usuario(text) from public;
revoke all on function public.rpc_remover_avatar_usuario() from public;

grant execute on function public.rpc_atualizar_avatar_usuario(text) to authenticated;
grant execute on function public.rpc_remover_avatar_usuario() to authenticated;

-- ─── 6. Storage: bucket avatars ──────────────────────────────
-- Bucket público: URLs funcionam sem auth, RLS controla escrita
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/gif']
)
on conflict (id) do nothing;

-- ─── 7. Storage RLS Policies ─────────────────────────────────
-- Caminho esperado: workspaces/{workspace_id}/users/{user_id}/avatar.webp
-- storage.foldername retorna array: [1]=workspaces [2]=workspace_id [3]=users [4]=user_id

-- SELECT: leitura aberta para autenticados (bucket é público de qualquer forma)
drop policy if exists "avatars_select" on storage.objects;
create policy "avatars_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

-- INSERT: somente o próprio usuário pode fazer upload no seu caminho
drop policy if exists "avatars_insert" on storage.objects;
create policy "avatars_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.dim_usuario u
    where u.auth_user_id = auth.uid()
      and u.id::text = (storage.foldername(name))[4]
  )
);

-- UPDATE: somente o próprio usuário pode substituir o arquivo
drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.dim_usuario u
    where u.auth_user_id = auth.uid()
      and u.id::text = (storage.foldername(name))[4]
  )
);

-- DELETE: somente o próprio usuário pode remover
drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.dim_usuario u
    where u.auth_user_id = auth.uid()
      and u.id::text = (storage.foldername(name))[4]
  )
);
