alter table public.dim_usuario
  alter column nm_usuario drop not null;

alter table public.dim_usuario
  add column if not exists fl_perfil_completo boolean not null default false,
  add column if not exists dt_perfil_completo timestamptz null;

create index if not exists idx_dim_usuario_perfil_completo
  on public.dim_usuario (fl_perfil_completo);

create or replace function public.fn_auth_criar_dim_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_email text;
  v_nome_inicial text;
begin
  v_email := coalesce(new.email, '');

  v_nome_inicial := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(v_email, '@', 1)
  )), '');

  insert into public.dim_usuario (
    auth_user_id,
    nm_usuario,
    ds_email,
    cd_token_conexao,
    fl_perfil_completo,
    fl_ativo
  )
  values (
    new.id,
    v_nome_inicial,
    v_email,
    public.fn_gerar_token_usuario(),
    false,
    true
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_auth_users_criar_dim_usuario on auth.users;

create trigger trg_auth_users_criar_dim_usuario
after insert on auth.users
for each row
execute function public.fn_auth_criar_dim_usuario();

create or replace function public.fn_bloquear_alteracao_campos_sensiveis_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if new.auth_user_id is distinct from old.auth_user_id then
    raise exception 'AUTH_USER_ID_IMUTAVEL'
      using errcode = 'P0001';
  end if;

  if new.ds_email is distinct from old.ds_email then
    raise exception 'EMAIL_USUARIO_IMUTAVEL'
      using errcode = 'P0001';
  end if;

  if new.cd_token_conexao is distinct from old.cd_token_conexao then
    raise exception 'TOKEN_USUARIO_IMUTAVEL'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dim_usuario_bloquear_campos_sensiveis
on public.dim_usuario;

create trigger trg_dim_usuario_bloquear_campos_sensiveis
before update on public.dim_usuario
for each row
execute function public.fn_bloquear_alteracao_campos_sensiveis_usuario();

create or replace function public.rpc_obter_meu_perfil()
returns public.dim_usuario
language plpgsql
security definer
stable
set search_path = public, auth, extensions
as $$
declare
  v_usuario public.dim_usuario;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO'
      using errcode = 'P0001';
  end if;

  select u.*
  into v_usuario
  from public.dim_usuario u
  where u.auth_user_id = auth.uid()
  limit 1;

  if v_usuario.id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO'
      using errcode = 'P0001';
  end if;

  return v_usuario;
end;
$$;

create or replace function public.rpc_completar_perfil_usuario(
  p_nm_usuario text,
  p_url_avatar text default null
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

  if nullif(btrim(p_nm_usuario), '') is null then
    raise exception 'NOME_USUARIO_OBRIGATORIO'
      using errcode = 'P0001';
  end if;

  update public.dim_usuario u
  set
    nm_usuario = btrim(p_nm_usuario),
    url_avatar = nullif(btrim(p_url_avatar), ''),
    fl_perfil_completo = true,
    dt_perfil_completo = coalesce(u.dt_perfil_completo, now()),
    atualizado_por = u.id,
    updated_at = now()
  where u.auth_user_id = auth.uid()
    and u.fl_ativo = true
  returning *
  into v_usuario;

  if v_usuario.id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO'
      using errcode = 'P0001';
  end if;

  return v_usuario;
end;
$$;

create or replace function public.rpc_registrar_login_usuario()
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
    dt_ultimo_login = now(),
    updated_at = now()
  where u.auth_user_id = auth.uid()
    and u.fl_ativo = true
  returning *
  into v_usuario;

  if v_usuario.id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO'
      using errcode = 'P0001';
  end if;

  return v_usuario;
end;
$$;

drop policy if exists pol_dim_usuario_insert_proprio
on public.dim_usuario;

revoke insert on public.dim_usuario from authenticated;
revoke update on public.dim_usuario from authenticated;
grant update (nm_usuario, url_avatar) on public.dim_usuario to authenticated;

revoke all on function public.fn_auth_criar_dim_usuario() from public;
revoke all on function public.fn_bloquear_alteracao_campos_sensiveis_usuario() from public;
revoke all on function public.rpc_obter_meu_perfil() from public;
revoke all on function public.rpc_completar_perfil_usuario(text, text) from public;
revoke all on function public.rpc_registrar_login_usuario() from public;

grant execute on function public.rpc_obter_meu_perfil() to authenticated;
grant execute on function public.rpc_completar_perfil_usuario(text, text) to authenticated;
grant execute on function public.rpc_registrar_login_usuario() to authenticated;
