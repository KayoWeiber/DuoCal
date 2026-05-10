-- Ajusta o fluxo de conexao do DuoCal para solicitacoes pendentes por codigo.
-- Esta migration preserva compatibilidade com a base inicial e remove o vinculo automatico por token.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dim_usuario'
      and column_name = 'cd_token_conexao'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dim_usuario'
      and column_name = 'cd_codigo_conexao'
  ) then
    alter table public.dim_usuario
      rename column cd_token_conexao to cd_codigo_conexao;
  end if;
end $$;

drop index if exists public.idx_dim_usuario_token_conexao;

alter table public.dim_usuario
  drop constraint if exists uq_dim_usuario_token_conexao,
  drop constraint if exists chk_dim_usuario_token_conexao;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_dim_usuario_codigo_conexao'
      and conrelid = 'public.dim_usuario'::regclass
  ) then
    alter table public.dim_usuario
      add constraint uq_dim_usuario_codigo_conexao unique (cd_codigo_conexao);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_dim_usuario_codigo_conexao'
      and conrelid = 'public.dim_usuario'::regclass
  ) then
    alter table public.dim_usuario
      add constraint chk_dim_usuario_codigo_conexao check (cd_codigo_conexao ~ '^[0-9]{6}$');
  end if;
end $$;

create index if not exists idx_dim_usuario_codigo_conexao
  on public.dim_usuario (cd_codigo_conexao)
  where fl_ativo = true;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'fato_convite_workspace'
      and column_name = 'cd_token_utilizado'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'fato_convite_workspace'
      and column_name = 'cd_codigo_utilizado'
  ) then
    alter table public.fato_convite_workspace
      rename column cd_token_utilizado to cd_codigo_utilizado;
  end if;
end $$;

drop index if exists public.idx_fato_convite_workspace_token;
create index if not exists idx_fato_convite_workspace_codigo
  on public.fato_convite_workspace (cd_codigo_utilizado);

create or replace function public.fn_gerar_token_usuario()
returns char(6)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_codigo char(6);
begin
  loop
    v_codigo := lpad(floor(random() * 1000000)::int::text, 6, '0')::char(6);

    exit when not exists (
      select 1
      from public.dim_usuario u
      where u.cd_codigo_conexao = v_codigo
        and u.fl_ativo = true
    );
  end loop;

  return v_codigo;
end;
$$;

create or replace function public.fn_trg_dim_usuario_token()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.cd_codigo_conexao is null then
    new.cd_codigo_conexao := public.fn_gerar_token_usuario();
  end if;

  return new;
end;
$$;

create or replace function public.fn_bloquear_alteracao_campos_sensiveis_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.cd_codigo_conexao is distinct from new.cd_codigo_conexao then
    raise exception 'CODIGO_CONEXAO_IMUTAVEL';
  end if;

  if old.auth_user_id is distinct from new.auth_user_id then
    raise exception 'AUTH_USER_ID_IMUTAVEL';
  end if;

  return new;
end;
$$;

create or replace function public.fn_auth_criar_dim_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_nome text;
begin
  v_nome := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  )), '');

  insert into public.dim_usuario (
    auth_user_id,
    nm_usuario,
    ds_email,
    cd_codigo_conexao,
    fl_perfil_completo,
    url_avatar,
    dt_ultimo_login
  )
  values (
    new.id,
    coalesce(v_nome, 'Novo usuario'),
    coalesce(new.email, ''),
    public.fn_gerar_token_usuario(),
    false,
    new.raw_user_meta_data ->> 'avatar_url',
    now()
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

alter table public.fato_notificacao
  alter column workspace_id drop not null,
  drop constraint if exists fk_fato_notificacao_membro_workspace,
  drop constraint if exists chk_fato_notificacao_tipo;

alter table public.fato_notificacao
  add constraint chk_fato_notificacao_tipo check (
    tp_notificacao in (
      'EVENTO_CRIADO',
      'EVENTO_ALTERADO',
      'EVENTO_CANCELADO',
      'TAREFA_CRIADA',
      'TAREFA_ALTERADA',
      'CONVITE_WORKSPACE',
      'SOLICITACAO_WORKSPACE',
      'LEMBRETE_EVENTO',
      'SISTEMA'
    )
  );

create table if not exists public.fato_solicitacao_workspace (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.dim_workspace (id) on delete cascade,
  usuario_solicitante_id uuid not null references public.dim_usuario (id) on delete cascade,
  usuario_destino_id uuid not null references public.dim_usuario (id) on delete cascade,
  cd_codigo_utilizado char(6) not null,
  tp_status text not null default 'PENDENTE',
  ds_mensagem text,
  dt_resposta timestamptz,
  respondido_por uuid references public.dim_usuario (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_fato_solicitacao_workspace_codigo check (cd_codigo_utilizado ~ '^[0-9]{6}$'),
  constraint chk_fato_solicitacao_workspace_status check (
    tp_status in ('PENDENTE', 'ACEITO', 'RECUSADO', 'CANCELADO')
  ),
  constraint chk_fato_solicitacao_workspace_usuarios_distintos check (
    usuario_solicitante_id <> usuario_destino_id
  )
);

create unique index if not exists uq_fato_solicitacao_workspace_pendente_par
  on public.fato_solicitacao_workspace (usuario_solicitante_id, usuario_destino_id)
  where tp_status = 'PENDENTE';

create index if not exists idx_fato_solicitacao_workspace_destino_status
  on public.fato_solicitacao_workspace (usuario_destino_id, tp_status);

create index if not exists idx_fato_solicitacao_workspace_solicitante_status
  on public.fato_solicitacao_workspace (usuario_solicitante_id, tp_status);

create index if not exists idx_fato_solicitacao_workspace_workspace
  on public.fato_solicitacao_workspace (workspace_id);

create index if not exists idx_fato_solicitacao_workspace_codigo
  on public.fato_solicitacao_workspace (cd_codigo_utilizado);

drop trigger if exists trg_fato_solicitacao_workspace_updated_at on public.fato_solicitacao_workspace;
create trigger trg_fato_solicitacao_workspace_updated_at
before update on public.fato_solicitacao_workspace
for each row
execute function public.fn_set_updated_at();

alter table public.fato_solicitacao_workspace enable row level security;

drop policy if exists fato_solicitacao_workspace_select_participantes on public.fato_solicitacao_workspace;
create policy fato_solicitacao_workspace_select_participantes
on public.fato_solicitacao_workspace
for select
to authenticated
using (
  usuario_solicitante_id = public.fn_usuario_atual_id()
  or usuario_destino_id = public.fn_usuario_atual_id()
);

drop policy if exists fato_solicitacao_workspace_insert_bloqueado on public.fato_solicitacao_workspace;
create policy fato_solicitacao_workspace_insert_bloqueado
on public.fato_solicitacao_workspace
for insert
to authenticated
with check (false);

drop policy if exists fato_solicitacao_workspace_update_bloqueado on public.fato_solicitacao_workspace;
create policy fato_solicitacao_workspace_update_bloqueado
on public.fato_solicitacao_workspace
for update
to authenticated
using (false)
with check (false);

drop policy if exists fato_solicitacao_workspace_delete_bloqueado on public.fato_solicitacao_workspace;
create policy fato_solicitacao_workspace_delete_bloqueado
on public.fato_solicitacao_workspace
for delete
to authenticated
using (false);

drop policy if exists pol_fato_notificacao_select_destino_ou_admin on public.fato_notificacao;
drop policy if exists fato_notificacao_select_destino_ou_admin on public.fato_notificacao;
create policy pol_fato_notificacao_select_destino_ou_admin
on public.fato_notificacao
for select
to authenticated
using (
  usuario_destino_id = public.fn_usuario_atual_id()
  or (
    workspace_id is not null
    and public.fn_usuario_admin_workspace(workspace_id)
  )
);

create or replace function public.rpc_obter_meu_codigo_conexao()
returns table (
  cd_codigo_conexao char(6)
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_usuario_atual_id uuid;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO';
  end if;

  v_usuario_atual_id := public.fn_usuario_atual_id();

  if v_usuario_atual_id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO';
  end if;

  return query
  select u.cd_codigo_conexao
  from public.dim_usuario u
  where u.id = v_usuario_atual_id
    and u.fl_ativo = true;
end;
$$;

create or replace function public.rpc_solicitar_conexao_por_codigo(
  p_cd_codigo_conexao char(6)
)
returns table (
  solicitacao_id uuid,
  usuario_destino_id uuid,
  nm_usuario_destino text,
  workspace_id uuid,
  tp_status text,
  ds_mensagem text
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_usuario_atual public.dim_usuario%rowtype;
  v_usuario_destino public.dim_usuario%rowtype;
  v_codigo text;
  v_workspace_destino_id uuid;
  v_workspace_destino_count int;
  v_solicitacao_id uuid;
  v_mensagem text;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO';
  end if;

  select *
    into v_usuario_atual
  from public.dim_usuario u
  where u.auth_user_id = auth.uid()
    and u.fl_ativo = true;

  if v_usuario_atual.id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO';
  end if;

  v_codigo := trim(p_cd_codigo_conexao::text);

  if v_codigo !~ '^[0-9]{6}$' then
    raise exception 'CODIGO_INVALIDO';
  end if;

  select *
    into v_usuario_destino
  from public.dim_usuario u
  where u.cd_codigo_conexao = v_codigo::char(6);

  if v_usuario_destino.id is null then
    raise exception 'CODIGO_INVALIDO';
  end if;

  if v_usuario_destino.id = v_usuario_atual.id then
    raise exception 'CODIGO_PROPRIO_NAO_PERMITIDO';
  end if;

  if v_usuario_destino.fl_ativo is not true then
    raise exception 'USUARIO_DESTINO_INATIVO';
  end if;

  if exists (
    select 1
    from public.rel_workspace_usuario r_atual
    join public.rel_workspace_usuario r_destino
      on r_destino.workspace_id = r_atual.workspace_id
     and r_destino.usuario_id = v_usuario_destino.id
     and r_destino.fl_ativo = true
    where r_atual.usuario_id = v_usuario_atual.id
      and r_atual.fl_ativo = true
  ) then
    raise exception 'USUARIO_JA_VINCULADO';
  end if;

  if exists (
    select 1
    from public.rel_workspace_usuario r
    join public.dim_workspace w on w.id = r.workspace_id
    where r.usuario_id = v_usuario_atual.id
      and r.fl_ativo = true
      and w.fl_ativo = true
  ) then
    raise exception 'USUARIO_JA_POSSUI_WORKSPACE';
  end if;

  if exists (
    select 1
    from public.fato_solicitacao_workspace s
    where s.usuario_solicitante_id = v_usuario_atual.id
      and s.usuario_destino_id = v_usuario_destino.id
      and s.tp_status = 'PENDENTE'
  ) then
    raise exception 'SOLICITACAO_JA_EXISTE';
  end if;

  select count(*), (array_agg(r.workspace_id order by r.dt_entrada, r.workspace_id))[1]
    into v_workspace_destino_count, v_workspace_destino_id
  from public.rel_workspace_usuario r
  join public.dim_workspace w on w.id = r.workspace_id
  where r.usuario_id = v_usuario_destino.id
    and r.fl_ativo = true
    and w.fl_ativo = true;

  if v_workspace_destino_count > 1 then
    raise exception 'CONFLITO_WORKSPACE_EXISTENTE';
  end if;

  v_mensagem := coalesce(v_usuario_atual.nm_usuario, 'Alguém')
    || ' quer se conectar com você no DuoCal.';

  insert into public.fato_solicitacao_workspace (
    workspace_id,
    usuario_solicitante_id,
    usuario_destino_id,
    cd_codigo_utilizado,
    tp_status,
    ds_mensagem
  )
  values (
    v_workspace_destino_id,
    v_usuario_atual.id,
    v_usuario_destino.id,
    v_codigo::char(6),
    'PENDENTE',
    v_mensagem
  )
  returning id into v_solicitacao_id;

  insert into public.fato_notificacao (
    workspace_id,
    usuario_destino_id,
    tp_notificacao,
    nm_titulo,
    ds_mensagem,
    tp_entidade,
    entidade_id
  )
  values (
    v_workspace_destino_id,
    v_usuario_destino.id,
    'SOLICITACAO_WORKSPACE',
    coalesce(v_usuario_atual.nm_usuario, 'Alguém') || ' quer se conectar com você',
    'Uma pessoa solicitou participar de um workspace compartilhado no DuoCal.',
    'SOLICITACAO_WORKSPACE',
    v_solicitacao_id
  );

  return query
  select
    s.id,
    u.id,
    u.nm_usuario,
    s.workspace_id,
    s.tp_status,
    s.ds_mensagem
  from public.fato_solicitacao_workspace s
  join public.dim_usuario u on u.id = s.usuario_destino_id
  where s.id = v_solicitacao_id;
end;
$$;

create or replace function public.rpc_listar_solicitacoes_workspace_pendentes()
returns table (
  solicitacao_id uuid,
  usuario_solicitante_id uuid,
  nm_usuario_solicitante text,
  workspace_id uuid,
  nm_workspace text,
  cd_codigo_utilizado char(6),
  dt_solicitacao timestamptz,
  ds_mensagem text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_usuario_atual_id uuid;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO';
  end if;

  v_usuario_atual_id := public.fn_usuario_atual_id();

  if v_usuario_atual_id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO';
  end if;

  return query
  select
    s.id,
    s.usuario_solicitante_id,
    u.nm_usuario,
    s.workspace_id,
    w.nm_workspace,
    s.cd_codigo_utilizado,
    s.created_at,
    s.ds_mensagem
  from public.fato_solicitacao_workspace s
  join public.dim_usuario u on u.id = s.usuario_solicitante_id
  left join public.dim_workspace w on w.id = s.workspace_id
  where s.usuario_destino_id = v_usuario_atual_id
    and s.tp_status = 'PENDENTE'
  order by s.created_at desc;
end;
$$;

create or replace function public.rpc_responder_solicitacao_workspace(
  p_solicitacao_id uuid,
  p_aceitar boolean
)
returns table (
  solicitacao_id uuid,
  workspace_id uuid,
  nm_workspace text,
  tp_status text,
  usuario_solicitante_id uuid,
  usuario_destino_id uuid
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_usuario_atual_id uuid;
  v_solicitacao public.fato_solicitacao_workspace%rowtype;
  v_usuario_solicitante public.dim_usuario%rowtype;
  v_workspace_id uuid;
  v_workspace_count int;
  v_workspace public.dim_workspace%rowtype;
  v_total_membros int;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO';
  end if;

  v_usuario_atual_id := public.fn_usuario_atual_id();

  if v_usuario_atual_id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO';
  end if;

  select *
    into v_solicitacao
  from public.fato_solicitacao_workspace s
  where s.id = p_solicitacao_id
  for update;

  if v_solicitacao.id is null then
    raise exception 'SOLICITACAO_NAO_ENCONTRADA';
  end if;

  if v_solicitacao.usuario_destino_id <> v_usuario_atual_id then
    raise exception 'SOLICITACAO_NAO_AUTORIZADA';
  end if;

  if v_solicitacao.tp_status <> 'PENDENTE' then
    raise exception 'SOLICITACAO_JA_RESPONDIDA';
  end if;

  select *
    into v_usuario_solicitante
  from public.dim_usuario u
  where u.id = v_solicitacao.usuario_solicitante_id;

  if v_usuario_solicitante.id is null or v_usuario_solicitante.fl_ativo is not true then
    raise exception 'SOLICITANTE_INATIVO';
  end if;

  if p_aceitar is not true then
    update public.fato_solicitacao_workspace
    set tp_status = 'RECUSADO',
        dt_resposta = now(),
        respondido_por = v_usuario_atual_id
    where id = v_solicitacao.id;

    insert into public.fato_notificacao (
      workspace_id,
      usuario_destino_id,
      tp_notificacao,
      nm_titulo,
      ds_mensagem,
      tp_entidade,
      entidade_id
    )
    values (
      null,
      v_solicitacao.usuario_solicitante_id,
      'SOLICITACAO_WORKSPACE',
      'Solicitação recusada',
      'Sua solicitação de conexão no DuoCal foi recusada.',
      'SOLICITACAO_WORKSPACE',
      v_solicitacao.id
    );

    update public.fato_notificacao
    set fl_lida = true,
        dt_lida = coalesce(dt_lida, now())
    where usuario_destino_id = v_usuario_atual_id
      and tp_notificacao = 'SOLICITACAO_WORKSPACE'
      and tp_entidade = 'SOLICITACAO_WORKSPACE'
      and entidade_id = v_solicitacao.id;

    return query
    select
      s.id,
      s.workspace_id,
      w.nm_workspace,
      s.tp_status,
      s.usuario_solicitante_id,
      s.usuario_destino_id
    from public.fato_solicitacao_workspace s
    left join public.dim_workspace w on w.id = s.workspace_id
    where s.id = v_solicitacao.id;

    return;
  end if;

  if exists (
    select 1
    from public.rel_workspace_usuario r
    join public.dim_workspace w on w.id = r.workspace_id
    where r.usuario_id = v_solicitacao.usuario_solicitante_id
      and r.fl_ativo = true
      and w.fl_ativo = true
  ) then
    raise exception 'SOLICITANTE_JA_POSSUI_WORKSPACE';
  end if;

  select count(*), (array_agg(r.workspace_id order by r.dt_entrada, r.workspace_id))[1]
    into v_workspace_count, v_workspace_id
  from public.rel_workspace_usuario r
  join public.dim_workspace w on w.id = r.workspace_id
  where r.usuario_id = v_usuario_atual_id
    and r.fl_ativo = true
    and w.fl_ativo = true;

  if v_workspace_count > 1 then
    raise exception 'CONFLITO_WORKSPACE_EXISTENTE';
  end if;

  if v_workspace_id is null then
    insert into public.dim_workspace (
      nm_workspace,
      ds_slogan,
      tp_workspace,
      criado_por,
      atualizado_por
    )
    values (
      'Meu DuoCal',
      'Sincronia é a base de tudo',
      'CASAL',
      v_usuario_atual_id,
      v_usuario_atual_id
    )
    returning * into v_workspace;

    v_workspace_id := v_workspace.id;

    insert into public.cfg_workspace (workspace_id)
    values (v_workspace_id)
    on conflict (workspace_id) do nothing;
  else
    select *
      into v_workspace
    from public.dim_workspace w
    where w.id = v_workspace_id
    for update;
  end if;

  insert into public.rel_workspace_usuario (
    workspace_id,
    usuario_id,
    tp_papel,
    fl_ativo,
    criado_por,
    atualizado_por
  )
  values (
    v_workspace_id,
    v_usuario_atual_id,
    'ADMIN',
    true,
    v_usuario_atual_id,
    v_usuario_atual_id
  )
  on conflict (workspace_id, usuario_id) do update
  set fl_ativo = true,
      tp_papel = case
        when public.rel_workspace_usuario.tp_papel = 'ADMIN' then 'ADMIN'
        else excluded.tp_papel
      end,
      atualizado_por = excluded.atualizado_por,
      updated_at = now();

  select count(*)
    into v_total_membros
  from public.rel_workspace_usuario r
  where r.workspace_id = v_workspace_id
    and r.fl_ativo = true;

  if v_workspace.tp_workspace = 'CASAL' and v_total_membros >= 2 then
    raise exception 'WORKSPACE_LIMITE_MEMBROS_ATINGIDO';
  end if;

  insert into public.rel_workspace_usuario (
    workspace_id,
    usuario_id,
    tp_papel,
    fl_ativo,
    criado_por,
    atualizado_por
  )
  values (
    v_workspace_id,
    v_solicitacao.usuario_solicitante_id,
    'MEMBRO',
    true,
    v_usuario_atual_id,
    v_usuario_atual_id
  )
  on conflict (workspace_id, usuario_id) do update
  set fl_ativo = true,
      tp_papel = 'MEMBRO',
      atualizado_por = excluded.atualizado_por,
      updated_at = now();

  update public.fato_solicitacao_workspace
  set workspace_id = v_workspace_id,
      tp_status = 'ACEITO',
      dt_resposta = now(),
      respondido_por = v_usuario_atual_id
  where id = v_solicitacao.id;

  update public.fato_notificacao
  set fl_lida = true,
      dt_lida = coalesce(dt_lida, now())
  where usuario_destino_id = v_usuario_atual_id
    and tp_notificacao = 'SOLICITACAO_WORKSPACE'
    and tp_entidade = 'SOLICITACAO_WORKSPACE'
    and entidade_id = v_solicitacao.id;

  insert into public.fato_notificacao (
    workspace_id,
    usuario_destino_id,
    tp_notificacao,
    nm_titulo,
    ds_mensagem,
    tp_entidade,
    entidade_id
  )
  values (
    v_workspace_id,
    v_solicitacao.usuario_solicitante_id,
    'SOLICITACAO_WORKSPACE',
    'Solicitação aceita',
    'Sua solicitação de conexão no DuoCal foi aceita.',
    'SOLICITACAO_WORKSPACE',
    v_solicitacao.id
  );

  return query
  select
    s.id,
    s.workspace_id,
    w.nm_workspace,
    s.tp_status,
    s.usuario_solicitante_id,
    s.usuario_destino_id
  from public.fato_solicitacao_workspace s
  join public.dim_workspace w on w.id = s.workspace_id
  where s.id = v_solicitacao.id;
end;
$$;

-- Compatibilidade temporaria: chamadas antigas deixam de criar vinculo direto e passam a criar solicitacao.
create or replace function public.rpc_conectar_usuario_por_token(
  p_cd_token_conexao char(6)
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result record;
begin
  select *
    into v_result
  from public.rpc_solicitar_conexao_por_codigo(p_cd_token_conexao)
  limit 1;

  return jsonb_build_object(
    'solicitacao_id', v_result.solicitacao_id,
    'usuario_destino_id', v_result.usuario_destino_id,
    'workspace_id', v_result.workspace_id,
    'tp_status', v_result.tp_status
  );
end;
$$;

grant select on public.fato_solicitacao_workspace to authenticated;
revoke insert, update, delete on public.fato_solicitacao_workspace from authenticated;

revoke insert, update, delete on public.rel_workspace_usuario from authenticated;

grant execute on function public.rpc_obter_meu_codigo_conexao() to authenticated;
grant execute on function public.rpc_solicitar_conexao_por_codigo(char(6)) to authenticated;
grant execute on function public.rpc_listar_solicitacoes_workspace_pendentes() to authenticated;
grant execute on function public.rpc_responder_solicitacao_workspace(uuid, boolean) to authenticated;
grant execute on function public.rpc_conectar_usuario_por_token(char(6)) to authenticated;
