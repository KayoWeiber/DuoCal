create table public.dim_usuario (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  nm_usuario text not null,
  ds_email text not null,
  cd_token_conexao char(6) not null,
  url_avatar text null,
  dt_ultimo_login timestamptz null,
  fl_ativo boolean not null default true,
  criado_por uuid null references public.dim_usuario(id),
  atualizado_por uuid null references public.dim_usuario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_dim_usuario_auth_user unique (auth_user_id),
  constraint uq_dim_usuario_token_conexao unique (cd_token_conexao),
  constraint chk_dim_usuario_token_conexao check (cd_token_conexao::text ~ '^[0-9]{6}$')
);

create or replace function public.fn_gerar_token_usuario()
returns char(6)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_token char(6);
  v_bytes bytea;
  v_numero bigint;
  v_tentativa int := 0;
begin
  loop
    v_tentativa := v_tentativa + 1;
    v_bytes := extensions.gen_random_bytes(4);
    v_numero :=
      (get_byte(v_bytes, 0)::bigint << 24) |
      (get_byte(v_bytes, 1)::bigint << 16) |
      (get_byte(v_bytes, 2)::bigint << 8) |
      get_byte(v_bytes, 3)::bigint;

    v_token := lpad((v_numero % 1000000)::text, 6, '0')::char(6);

    exit when not exists (
      select 1
      from public.dim_usuario u
      where u.cd_token_conexao = v_token
    );

    if v_tentativa >= 100 then
      raise exception 'FALHA_GERAR_TOKEN_USUARIO'
        using errcode = 'P0001';
    end if;
  end loop;

  return v_token;
end;
$$;

create or replace function public.fn_trg_dim_usuario_token()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if tg_op = 'INSERT' then
    if new.cd_token_conexao is null or auth.uid() is not null then
      new.cd_token_conexao := public.fn_gerar_token_usuario();
    end if;
  elsif tg_op = 'UPDATE' then
    if new.cd_token_conexao is distinct from old.cd_token_conexao then
      raise exception 'TOKEN_USUARIO_IMUTAVEL'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_dim_usuario_token_biu
before insert or update on public.dim_usuario
for each row
execute function public.fn_trg_dim_usuario_token();

create trigger trg_dim_usuario_set_updated_at
before update on public.dim_usuario
for each row
execute function public.fn_set_updated_at();

create index idx_dim_usuario_auth_user_id
  on public.dim_usuario (auth_user_id);

create index idx_dim_usuario_token_conexao
  on public.dim_usuario (cd_token_conexao);

create index idx_dim_usuario_fl_ativo
  on public.dim_usuario (fl_ativo);

revoke all on function public.fn_gerar_token_usuario() from public;
revoke all on function public.fn_trg_dim_usuario_token() from public;
