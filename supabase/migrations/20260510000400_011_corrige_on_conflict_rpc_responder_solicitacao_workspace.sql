-- Reaplica a RPC corrigindo conflict targets que ainda podiam colidir
-- com os parametros de saida do RETURNS TABLE, especialmente workspace_id.

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
  v_solicitacao_id uuid;
  v_workspace_id uuid;
  v_workspace_existente_id uuid;
  v_usuario_atual_id uuid;
  v_usuario_solicitante_id uuid;
  v_usuario_destino_id uuid;
  v_tp_status text;
  v_nm_workspace text;
  v_tp_workspace text;
  v_solicitante_ativo boolean;
  v_total_workspaces int;
  v_total_membros int;
begin
  if auth.uid() is null then
    raise exception 'USUARIO_NAO_AUTENTICADO';
  end if;

  select du.id
    into v_usuario_atual_id
  from public.dim_usuario du
  where du.auth_user_id = auth.uid()
    and du.fl_ativo = true;

  if v_usuario_atual_id is null then
    raise exception 'PERFIL_NAO_ENCONTRADO';
  end if;

  select
    fsw.id,
    fsw.workspace_id,
    fsw.usuario_solicitante_id,
    fsw.usuario_destino_id,
    fsw.tp_status
    into
      v_solicitacao_id,
      v_workspace_id,
      v_usuario_solicitante_id,
      v_usuario_destino_id,
      v_tp_status
  from public.fato_solicitacao_workspace fsw
  where fsw.id = p_solicitacao_id
  for update;

  if v_solicitacao_id is null then
    raise exception 'SOLICITACAO_NAO_ENCONTRADA';
  end if;

  if v_usuario_destino_id <> v_usuario_atual_id then
    raise exception 'SOLICITACAO_NAO_AUTORIZADA';
  end if;

  if v_tp_status <> 'PENDENTE' then
    raise exception 'SOLICITACAO_JA_RESPONDIDA';
  end if;

  select du.fl_ativo
    into v_solicitante_ativo
  from public.dim_usuario du
  where du.id = v_usuario_solicitante_id;

  if v_solicitante_ativo is not true then
    raise exception 'SOLICITANTE_INATIVO';
  end if;

  if p_aceitar is not true then
    update public.fato_solicitacao_workspace as fsw
    set
      tp_status = 'RECUSADO',
      dt_resposta = now(),
      respondido_por = v_usuario_atual_id,
      updated_at = now()
    where fsw.id = v_solicitacao_id;

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
      v_usuario_solicitante_id,
      'SOLICITACAO_WORKSPACE',
      'Solicitação recusada',
      'Sua solicitação de conexão no DuoCal foi recusada.',
      'SOLICITACAO_WORKSPACE',
      v_solicitacao_id
    );

    update public.fato_notificacao as fn
    set
      fl_lida = true,
      dt_lida = coalesce(fn.dt_lida, now()),
      updated_at = now()
    where fn.usuario_destino_id = v_usuario_atual_id
      and fn.tp_notificacao = 'SOLICITACAO_WORKSPACE'
      and fn.tp_entidade = 'SOLICITACAO_WORKSPACE'
      and fn.entidade_id = v_solicitacao_id;

    return query
    select
      fsw.id as solicitacao_id,
      fsw.workspace_id as workspace_id,
      dw.nm_workspace as nm_workspace,
      fsw.tp_status as tp_status,
      fsw.usuario_solicitante_id as usuario_solicitante_id,
      fsw.usuario_destino_id as usuario_destino_id
    from public.fato_solicitacao_workspace fsw
    left join public.dim_workspace dw
      on dw.id = fsw.workspace_id
    where fsw.id = v_solicitacao_id;

    return;
  end if;

  if exists (
    select 1
    from public.rel_workspace_usuario rwu
    join public.dim_workspace dw
      on dw.id = rwu.workspace_id
    where rwu.usuario_id = v_usuario_solicitante_id
      and rwu.fl_ativo = true
      and dw.fl_ativo = true
  ) then
    raise exception 'SOLICITANTE_JA_POSSUI_WORKSPACE';
  end if;

  select
    count(*)::int,
    (array_agg(rwu.workspace_id order by rwu.dt_entrada, rwu.workspace_id))[1]
    into v_total_workspaces, v_workspace_existente_id
  from public.rel_workspace_usuario rwu
  join public.dim_workspace dw
    on dw.id = rwu.workspace_id
  where rwu.usuario_id = v_usuario_atual_id
    and rwu.fl_ativo = true
    and dw.fl_ativo = true;

  if v_total_workspaces > 1 then
    raise exception 'CONFLITO_WORKSPACE_EXISTENTE';
  end if;

  if v_workspace_existente_id is null then
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
    returning
      id
      into v_workspace_id;

    select
      dw.nm_workspace,
      dw.tp_workspace
      into v_nm_workspace, v_tp_workspace
    from public.dim_workspace dw
    where dw.id = v_workspace_id
      and dw.fl_ativo = true
    for update;
  else
    v_workspace_id := v_workspace_existente_id;

    select
      dw.nm_workspace,
      dw.tp_workspace
      into v_nm_workspace, v_tp_workspace
    from public.dim_workspace dw
    where dw.id = v_workspace_id
      and dw.fl_ativo = true
    for update;

    if v_nm_workspace is null then
      raise exception 'WORKSPACE_NAO_ENCONTRADO';
    end if;
  end if;

  insert into public.cfg_workspace (
    workspace_id
  )
  values (
    v_workspace_id
  )
  on conflict on constraint uq_cfg_workspace_workspace do nothing;

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
  on conflict on constraint uq_rel_workspace_usuario_workspace_usuario do update
  set
    fl_ativo = true,
    tp_papel = 'ADMIN',
    atualizado_por = excluded.atualizado_por,
    updated_at = now();

  select count(*)::int
    into v_total_membros
  from public.rel_workspace_usuario rwu
  where rwu.workspace_id = v_workspace_id
    and rwu.fl_ativo = true;

  if v_tp_workspace = 'CASAL' and v_total_membros >= 2 then
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
    v_usuario_solicitante_id,
    'MEMBRO',
    true,
    v_usuario_atual_id,
    v_usuario_atual_id
  )
  on conflict on constraint uq_rel_workspace_usuario_workspace_usuario do update
  set
    fl_ativo = true,
    tp_papel = 'MEMBRO',
    atualizado_por = excluded.atualizado_por,
    updated_at = now();

  update public.fato_solicitacao_workspace as fsw
  set
    workspace_id = v_workspace_id,
    tp_status = 'ACEITO',
    dt_resposta = now(),
    respondido_por = v_usuario_atual_id,
    updated_at = now()
  where fsw.id = v_solicitacao_id;

  update public.fato_notificacao as fn
  set
    fl_lida = true,
    dt_lida = coalesce(fn.dt_lida, now()),
    updated_at = now()
  where fn.usuario_destino_id = v_usuario_atual_id
    and fn.tp_notificacao = 'SOLICITACAO_WORKSPACE'
    and fn.tp_entidade = 'SOLICITACAO_WORKSPACE'
    and fn.entidade_id = v_solicitacao_id;

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
    v_usuario_solicitante_id,
    'SOLICITACAO_WORKSPACE',
    'Solicitação aceita',
    'Sua solicitação de conexão no DuoCal foi aceita.',
    'SOLICITACAO_WORKSPACE',
    v_solicitacao_id
  );

  return query
  select
    fsw.id as solicitacao_id,
    fsw.workspace_id as workspace_id,
    dw.nm_workspace as nm_workspace,
    fsw.tp_status as tp_status,
    fsw.usuario_solicitante_id as usuario_solicitante_id,
    fsw.usuario_destino_id as usuario_destino_id
  from public.fato_solicitacao_workspace fsw
  join public.dim_workspace dw
    on dw.id = fsw.workspace_id
  where fsw.id = v_solicitacao_id;
end;
$$;

grant execute on function public.rpc_responder_solicitacao_workspace(uuid, boolean) to authenticated;
