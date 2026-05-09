create table public.dim_workspace (
  id uuid primary key default gen_random_uuid(),
  nm_workspace text not null,
  ds_slogan text not null default 'Sincronia é a base de tudo',
  tp_workspace text not null default 'CASAL',
  fl_ativo boolean not null default true,
  criado_por uuid null references public.dim_usuario(id),
  atualizado_por uuid null references public.dim_usuario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_dim_workspace_tp_workspace
    check (tp_workspace in ('CASAL', 'FAMILIA', 'GRUPO'))
);

create table public.rel_workspace_usuario (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  usuario_id uuid not null references public.dim_usuario(id) on delete cascade,
  tp_papel text not null default 'MEMBRO',
  fl_ativo boolean not null default true,
  dt_entrada timestamptz not null default now(),
  criado_por uuid null references public.dim_usuario(id),
  atualizado_por uuid null references public.dim_usuario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_rel_workspace_usuario_tp_papel
    check (tp_papel in ('ADMIN', 'MEMBRO', 'CONVIDADO')),
  constraint uq_rel_workspace_usuario_workspace_usuario
    unique (workspace_id, usuario_id)
);

create table public.cfg_workspace (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  hr_inicio_dia time not null default '06:00',
  hr_fim_dia time not null default '23:00',
  fl_notificacao_interna boolean not null default true,
  fl_push_habilitado boolean not null default false,
  fl_kanban_habilitado boolean not null default true,
  fl_agenda_habilitada boolean not null default true,
  nm_idioma text not null default 'pt-BR',
  nm_timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_cfg_workspace_workspace unique (workspace_id),
  constraint chk_cfg_workspace_horario_dia check (hr_fim_dia > hr_inicio_dia)
);

create table public.fato_convite_workspace (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null references public.dim_workspace(id) on delete cascade,
  usuario_origem_id uuid not null references public.dim_usuario(id),
  usuario_destino_id uuid not null references public.dim_usuario(id),
  cd_token_utilizado char(6) not null,
  tp_status text not null default 'ACEITO',
  dt_aceite timestamptz null,
  criado_por uuid null references public.dim_usuario(id),
  atualizado_por uuid null references public.dim_usuario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_fato_convite_workspace_status
    check (tp_status in ('PENDENTE', 'ACEITO', 'RECUSADO', 'CANCELADO')),
  constraint chk_fato_convite_workspace_token
    check (cd_token_utilizado::text ~ '^[0-9]{6}$'),
  constraint chk_fato_convite_workspace_usuarios_distintos
    check (usuario_origem_id <> usuario_destino_id)
);

create trigger trg_dim_workspace_set_updated_at
before update on public.dim_workspace
for each row
execute function public.fn_set_updated_at();

create trigger trg_rel_workspace_usuario_set_updated_at
before update on public.rel_workspace_usuario
for each row
execute function public.fn_set_updated_at();

create trigger trg_cfg_workspace_set_updated_at
before update on public.cfg_workspace
for each row
execute function public.fn_set_updated_at();

create trigger trg_fato_convite_workspace_set_updated_at
before update on public.fato_convite_workspace
for each row
execute function public.fn_set_updated_at();

create index idx_dim_workspace_criado_por
  on public.dim_workspace (criado_por);

create index idx_dim_workspace_fl_ativo
  on public.dim_workspace (fl_ativo);

create index idx_dim_workspace_tp_workspace
  on public.dim_workspace (tp_workspace);

create index idx_rel_workspace_usuario_workspace_id
  on public.rel_workspace_usuario (workspace_id);

create index idx_rel_workspace_usuario_usuario_id
  on public.rel_workspace_usuario (usuario_id);

create index idx_rel_workspace_usuario_papel
  on public.rel_workspace_usuario (tp_papel);

create index idx_rel_workspace_usuario_ativo
  on public.rel_workspace_usuario (fl_ativo);

create index idx_cfg_workspace_workspace_id
  on public.cfg_workspace (workspace_id);

create index idx_fato_convite_workspace_workspace_id
  on public.fato_convite_workspace (workspace_id);

create index idx_fato_convite_workspace_origem_id
  on public.fato_convite_workspace (usuario_origem_id);

create index idx_fato_convite_workspace_destino_id
  on public.fato_convite_workspace (usuario_destino_id);

create index idx_fato_convite_workspace_status
  on public.fato_convite_workspace (tp_status);

create index idx_fato_convite_workspace_token
  on public.fato_convite_workspace (cd_token_utilizado);

create or replace function public.fn_payload_workspace_membros(p_workspace_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select jsonb_build_object(
    'workspace', to_jsonb(w),
    'membros', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'usuario_id', u.id,
          'nm_usuario', u.nm_usuario,
          'url_avatar', u.url_avatar,
          'tp_papel', r.tp_papel,
          'dt_entrada', r.dt_entrada,
          'fl_ativo', r.fl_ativo
        )
        order by r.dt_entrada
      ) filter (where u.id is not null),
      '[]'::jsonb
    )
  )
  from public.dim_workspace w
  left join public.rel_workspace_usuario r
    on r.workspace_id = w.id
   and r.fl_ativo = true
  left join public.dim_usuario u
    on u.id = r.usuario_id
   and u.fl_ativo = true
  where w.id = p_workspace_id
  group by w.id;
$$;

create or replace function public.rpc_criar_perfil_usuario(
  p_nm_usuario text default null
)
returns public.dim_usuario
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_auth_uid uuid;
  v_email text;
  v_nm_usuario text;
  v_usuario public.dim_usuario;
begin
  v_auth_uid := auth.uid();

  if v_auth_uid is null then
    raise exception 'USUARIO_NAO_AUTENTICADO'
      using errcode = 'P0001';
  end if;

  select u.*
  into v_usuario
  from public.dim_usuario u
  where u.auth_user_id = v_auth_uid;

  if found then
    return v_usuario;
  end if;

  v_email := coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'email', ''),
    ''
  );

  v_nm_usuario := coalesce(
    nullif(btrim(p_nm_usuario), ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(split_part(v_email, '@', 1), ''),
    'Usuario'
  );

  insert into public.dim_usuario (
    auth_user_id,
    nm_usuario,
    ds_email
  )
  values (
    v_auth_uid,
    v_nm_usuario,
    v_email
  )
  returning *
  into v_usuario;

  return v_usuario;
end;
$$;

create or replace function public.rpc_criar_workspace_inicial(
  p_nm_workspace text,
  p_ds_slogan text default 'Sincronia é a base de tudo'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_usuario_id uuid;
  v_workspace_id uuid;
  v_workspaces uuid[];
  v_qtd_workspaces int;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO'
      using errcode = 'P0001';
  end if;

  select u.id
  into v_usuario_id
  from public.dim_usuario u
  where u.auth_user_id = auth.uid()
    and u.fl_ativo = true;

  if v_usuario_id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO'
      using errcode = 'P0001';
  end if;

  select array_agg(r.workspace_id order by r.dt_entrada)
  into v_workspaces
  from public.rel_workspace_usuario r
  join public.dim_workspace w on w.id = r.workspace_id
  where r.usuario_id = v_usuario_id
    and r.fl_ativo = true
    and w.fl_ativo = true;

  v_qtd_workspaces := coalesce(array_length(v_workspaces, 1), 0);

  if v_qtd_workspaces = 1 then
    return public.fn_payload_workspace_membros(v_workspaces[1]);
  elsif v_qtd_workspaces > 1 then
    raise exception 'CONFLITO_WORKSPACE_EXISTENTE'
      using errcode = 'P0001';
  end if;

  if nullif(btrim(p_nm_workspace), '') is null then
    raise exception 'NOME_WORKSPACE_OBRIGATORIO'
      using errcode = 'P0001';
  end if;

  insert into public.dim_workspace (
    nm_workspace,
    ds_slogan,
    tp_workspace,
    criado_por,
    atualizado_por
  )
  values (
    btrim(p_nm_workspace),
    coalesce(nullif(btrim(p_ds_slogan), ''), 'Sincronia é a base de tudo'),
    'CASAL',
    v_usuario_id,
    v_usuario_id
  )
  returning id
  into v_workspace_id;

  insert into public.rel_workspace_usuario (
    workspace_id,
    usuario_id,
    tp_papel,
    criado_por,
    atualizado_por
  )
  values (
    v_workspace_id,
    v_usuario_id,
    'ADMIN',
    v_usuario_id,
    v_usuario_id
  );

  insert into public.cfg_workspace (workspace_id)
  values (v_workspace_id);

  return public.fn_payload_workspace_membros(v_workspace_id);
end;
$$;

create or replace function public.rpc_conectar_usuario_por_token(
  p_cd_token_conexao char(6)
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_usuario_atual public.dim_usuario;
  v_usuario_destino public.dim_usuario;
  v_token text;
  v_workspace_id uuid;
  v_workspaces_atual uuid[];
  v_workspaces_destino uuid[];
  v_qtd_atual int;
  v_qtd_destino int;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO'
      using errcode = 'P0001';
  end if;

  select u.*
  into v_usuario_atual
  from public.dim_usuario u
  where u.auth_user_id = auth.uid()
    and u.fl_ativo = true;

  if v_usuario_atual.id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO'
      using errcode = 'P0001';
  end if;

  v_token := btrim(p_cd_token_conexao::text);

  if v_token is null or v_token !~ '^[0-9]{6}$' then
    raise exception 'TOKEN_INVALIDO'
      using errcode = 'P0001';
  end if;

  select u.*
  into v_usuario_destino
  from public.dim_usuario u
  where u.cd_token_conexao = v_token::char(6);

  if v_usuario_destino.id is null then
    raise exception 'TOKEN_INVALIDO'
      using errcode = 'P0001';
  end if;

  if v_usuario_destino.id = v_usuario_atual.id then
    raise exception 'TOKEN_PROPRIO_NAO_PERMITIDO'
      using errcode = 'P0001';
  end if;

  if v_usuario_destino.fl_ativo is not true then
    raise exception 'USUARIO_DESTINO_INATIVO'
      using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(least(v_usuario_atual.id::text, v_usuario_destino.id::text)),
    hashtext(greatest(v_usuario_atual.id::text, v_usuario_destino.id::text))
  );

  if exists (
    select 1
    from public.rel_workspace_usuario r_atual
    join public.rel_workspace_usuario r_destino
      on r_destino.workspace_id = r_atual.workspace_id
     and r_destino.usuario_id = v_usuario_destino.id
     and r_destino.fl_ativo = true
    join public.dim_workspace w
      on w.id = r_atual.workspace_id
     and w.fl_ativo = true
    where r_atual.usuario_id = v_usuario_atual.id
      and r_atual.fl_ativo = true
  ) then
    raise exception 'USUARIO_JA_VINCULADO'
      using errcode = 'P0001';
  end if;

  select array_agg(r.workspace_id order by r.dt_entrada)
  into v_workspaces_atual
  from public.rel_workspace_usuario r
  join public.dim_workspace w on w.id = r.workspace_id
  where r.usuario_id = v_usuario_atual.id
    and r.fl_ativo = true
    and w.fl_ativo = true;

  select array_agg(r.workspace_id order by r.dt_entrada)
  into v_workspaces_destino
  from public.rel_workspace_usuario r
  join public.dim_workspace w on w.id = r.workspace_id
  where r.usuario_id = v_usuario_destino.id
    and r.fl_ativo = true
    and w.fl_ativo = true;

  v_qtd_atual := coalesce(array_length(v_workspaces_atual, 1), 0);
  v_qtd_destino := coalesce(array_length(v_workspaces_destino, 1), 0);

  if v_qtd_atual > 1 or v_qtd_destino > 1 then
    raise exception 'CONFLITO_WORKSPACE_EXISTENTE'
      using errcode = 'P0001';
  end if;

  if v_qtd_atual > 0 and v_qtd_destino > 0 then
    raise exception 'CONFLITO_WORKSPACE_EXISTENTE'
      using errcode = 'P0001';
  end if;

  if v_qtd_destino = 1 then
    v_workspace_id := v_workspaces_destino[1];
  elsif v_qtd_atual = 1 then
    v_workspace_id := v_workspaces_atual[1];
  else
    insert into public.dim_workspace (
      nm_workspace,
      ds_slogan,
      tp_workspace,
      criado_por,
      atualizado_por
    )
    values (
      'DuoCal',
      'Sincronia é a base de tudo',
      'CASAL',
      v_usuario_atual.id,
      v_usuario_atual.id
    )
    returning id
    into v_workspace_id;

    insert into public.cfg_workspace (workspace_id)
    values (v_workspace_id);
  end if;

  insert into public.rel_workspace_usuario (
    workspace_id,
    usuario_id,
    tp_papel,
    criado_por,
    atualizado_por
  )
  values (
    v_workspace_id,
    v_usuario_atual.id,
    case when v_qtd_destino = 0 and v_qtd_atual = 0 then 'ADMIN' else 'MEMBRO' end,
    v_usuario_atual.id,
    v_usuario_atual.id
  )
  on conflict on constraint uq_rel_workspace_usuario_workspace_usuario
  do update set
    fl_ativo = true,
    atualizado_por = excluded.atualizado_por,
    updated_at = now();

  insert into public.rel_workspace_usuario (
    workspace_id,
    usuario_id,
    tp_papel,
    criado_por,
    atualizado_por
  )
  values (
    v_workspace_id,
    v_usuario_destino.id,
    'MEMBRO',
    v_usuario_atual.id,
    v_usuario_atual.id
  )
  on conflict on constraint uq_rel_workspace_usuario_workspace_usuario
  do update set
    fl_ativo = true,
    atualizado_por = excluded.atualizado_por,
    updated_at = now();

  insert into public.fato_convite_workspace (
    workspace_id,
    usuario_origem_id,
    usuario_destino_id,
    cd_token_utilizado,
    tp_status,
    dt_aceite,
    criado_por,
    atualizado_por
  )
  values (
    v_workspace_id,
    v_usuario_atual.id,
    v_usuario_destino.id,
    v_token::char(6),
    'ACEITO',
    now(),
    v_usuario_atual.id,
    v_usuario_atual.id
  );

  return public.fn_payload_workspace_membros(v_workspace_id);
end;
$$;

revoke all on function public.fn_payload_workspace_membros(uuid) from public;
revoke all on function public.rpc_criar_perfil_usuario(text) from public;
revoke all on function public.rpc_criar_workspace_inicial(text, text) from public;
revoke all on function public.rpc_conectar_usuario_por_token(character) from public;

grant execute on function public.rpc_criar_perfil_usuario(text) to authenticated;
grant execute on function public.rpc_criar_workspace_inicial(text, text) to authenticated;
grant execute on function public.rpc_conectar_usuario_por_token(character) to authenticated;
