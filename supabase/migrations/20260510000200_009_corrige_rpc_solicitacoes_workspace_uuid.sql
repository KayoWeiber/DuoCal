-- Corrige as RPCs de solicitacao para nao usar min(uuid), que nao existe no PostgreSQL.

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

  select
    count(*),
    (array_agg(r.workspace_id order by r.dt_entrada, r.workspace_id))[1]
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

  select
    count(*),
    (array_agg(r.workspace_id order by r.dt_entrada, r.workspace_id))[1]
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

grant execute on function public.rpc_solicitar_conexao_por_codigo(char(6)) to authenticated;
grant execute on function public.rpc_responder_solicitacao_workspace(uuid, boolean) to authenticated;
