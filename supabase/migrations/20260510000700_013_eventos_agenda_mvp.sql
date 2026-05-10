-- RPC: Listar membros de um workspace
create or replace function public.rpc_listar_membros_workspace(
  p_workspace_id uuid
)
returns table (
  usuario_id  uuid,
  nm_usuario  text,
  ds_email    text,
  tp_papel    text,
  dt_entrada  timestamptz
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
    r.dt_entrada
  from public.rel_workspace_usuario r
  join public.dim_usuario u on u.id = r.usuario_id
  where r.workspace_id = p_workspace_id
    and r.fl_ativo = true
  order by r.dt_entrada;
end;
$$;

-- RPC: Listar categorias de um workspace (auto-semeia padrões se vazio)
create or replace function public.rpc_listar_categorias_workspace(
  p_workspace_id uuid
)
returns table (
  id           uuid,
  nm_categoria text,
  cd_cor       text,
  cd_icone     text,
  fl_padrao    boolean
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_usuario_id uuid;
  v_count      int;
begin
  v_usuario_id := public.fn_usuario_atual_id();

  if v_usuario_id is null then
    raise exception 'NAO_AUTENTICADO' using hint = 'auth';
  end if;

  if not public.fn_usuario_membro_workspace(p_workspace_id) then
    raise exception 'SEM_PERMISSAO' using hint = 'workspace';
  end if;

  select count(*) into v_count
  from public.dim_categoria_evento
  where workspace_id = p_workspace_id
    and fl_ativo = true;

  if v_count = 0 then
    insert into public.dim_categoria_evento (
      workspace_id, nm_categoria, cd_cor, cd_icone, fl_padrao, criado_por
    )
    select
      p_workspace_id,
      a.nm_categoria,
      a.cd_cor,
      a.cd_icone,
      true,
      v_usuario_id
    from public.aux_categoria_evento_padrao a
    where a.fl_ativo = true
    on conflict (workspace_id, nm_categoria) do nothing;
  end if;

  return query
  select
    c.id,
    c.nm_categoria,
    c.cd_cor,
    c.cd_icone,
    c.fl_padrao
  from public.dim_categoria_evento c
  where c.workspace_id = p_workspace_id
    and c.fl_ativo = true
  order by c.nm_categoria;
end;
$$;

-- RPC: Criar evento com participantes e recorrência opcional
create or replace function public.rpc_criar_evento(
  p_workspace_id       uuid,
  p_nm_evento          text,
  p_dt_inicio          timestamptz,
  p_dt_fim             timestamptz,
  p_participantes      uuid[],
  p_ds_evento          text      default null,
  p_categoria_id       uuid      default null,
  p_fl_dia_todo        boolean   default false,
  p_fl_bloqueia_horario boolean  default true,
  p_fl_recorrente      boolean   default false,
  p_tp_frequencia      text      default null,
  p_intervalo          int       default 1,
  p_dias_semana        int[]     default null,
  p_dt_fim_recorrencia date      default null
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_usuario_id    uuid;
  v_evento_id     uuid;
  v_tp_participacao text;
  v_part_id       uuid;
  v_is_first      boolean := true;
  v_result        json;
begin
  v_usuario_id := public.fn_usuario_atual_id();

  if v_usuario_id is null then
    raise exception 'NAO_AUTENTICADO' using hint = 'auth';
  end if;

  if not public.fn_usuario_membro_workspace(p_workspace_id) then
    raise exception 'SEM_PERMISSAO' using hint = 'workspace';
  end if;

  if p_nm_evento is null or trim(p_nm_evento) = '' then
    raise exception 'TITULO_OBRIGATORIO' using hint = 'validation';
  end if;

  if p_dt_inicio is null then
    raise exception 'DATA_INICIO_OBRIGATORIA' using hint = 'validation';
  end if;

  if p_dt_fim is null then
    raise exception 'DATA_FIM_OBRIGATORIA' using hint = 'validation';
  end if;

  if p_dt_fim <= p_dt_inicio then
    raise exception 'DATA_FIM_DEVE_SER_MAIOR_QUE_INICIO' using hint = 'validation';
  end if;

  if p_participantes is null or array_length(p_participantes, 1) is null then
    raise exception 'PARTICIPANTE_OBRIGATORIO' using hint = 'validation';
  end if;

  insert into public.fato_evento (
    workspace_id,
    categoria_id,
    nm_evento,
    ds_evento,
    dt_inicio,
    dt_fim,
    fl_dia_todo,
    fl_bloqueia_horario,
    fl_recorrente,
    criado_por
  )
  values (
    p_workspace_id,
    p_categoria_id,
    trim(p_nm_evento),
    p_ds_evento,
    p_dt_inicio,
    p_dt_fim,
    coalesce(p_fl_dia_todo, false),
    coalesce(p_fl_bloqueia_horario, true),
    coalesce(p_fl_recorrente, false),
    v_usuario_id
  )
  returning id into v_evento_id;

  v_tp_participacao := case
    when array_length(p_participantes, 1) > 1 then 'CASAL'
    else 'RESPONSAVEL'
  end;

  foreach v_part_id in array p_participantes loop
    insert into public.rel_evento_usuario (
      workspace_id,
      evento_id,
      usuario_id,
      tp_participacao,
      fl_responsavel_principal
    )
    values (
      p_workspace_id,
      v_evento_id,
      v_part_id,
      v_tp_participacao,
      v_is_first
    )
    on conflict (evento_id, usuario_id) do nothing;

    v_is_first := false;
  end loop;

  if coalesce(p_fl_recorrente, false) and p_tp_frequencia is not null then
    insert into public.dim_recorrencia_evento (
      workspace_id,
      evento_id,
      tp_frequencia,
      intervalo,
      dias_semana,
      dt_fim_recorrencia
    )
    values (
      p_workspace_id,
      v_evento_id,
      p_tp_frequencia,
      coalesce(p_intervalo, 1),
      p_dias_semana,
      p_dt_fim_recorrencia
    );
  end if;

  select json_build_object(
    'id',                 e.id,
    'workspace_id',       e.workspace_id,
    'nm_evento',          e.nm_evento,
    'ds_evento',          e.ds_evento,
    'dt_inicio',          e.dt_inicio,
    'dt_fim',             e.dt_fim,
    'fl_dia_todo',        e.fl_dia_todo,
    'fl_bloqueia_horario',e.fl_bloqueia_horario,
    'fl_recorrente',      e.fl_recorrente,
    'categoria_id',       e.categoria_id,
    'created_at',         e.created_at
  ) into v_result
  from public.fato_evento e
  where e.id = v_evento_id;

  return v_result;
end;
$$;

-- RPC: Listar eventos do workspace em um intervalo de datas
create or replace function public.rpc_listar_eventos_workspace(
  p_workspace_id uuid,
  p_dt_inicio    timestamptz,
  p_dt_fim       timestamptz
)
returns table (
  id                   uuid,
  workspace_id         uuid,
  nm_evento            text,
  ds_evento            text,
  dt_inicio            timestamptz,
  dt_fim               timestamptz,
  fl_dia_todo          boolean,
  fl_bloqueia_horario  boolean,
  fl_recorrente        boolean,
  tp_status            text,
  categoria_id         uuid,
  nm_categoria         text,
  cd_cor_categoria     text,
  cd_icone_categoria   text,
  participantes        json
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
    e.id,
    e.workspace_id,
    e.nm_evento,
    e.ds_evento,
    e.dt_inicio,
    e.dt_fim,
    e.fl_dia_todo,
    e.fl_bloqueia_horario,
    e.fl_recorrente,
    e.tp_status,
    e.categoria_id,
    c.nm_categoria,
    c.cd_cor       as cd_cor_categoria,
    c.cd_icone     as cd_icone_categoria,
    (
      select json_agg(
        json_build_object(
          'usuario_id',             u.id,
          'nm_usuario',             u.nm_usuario,
          'tp_participacao',        r.tp_participacao,
          'fl_responsavel_principal', r.fl_responsavel_principal
        )
        order by r.fl_responsavel_principal desc, u.nm_usuario
      )
      from public.rel_evento_usuario r
      join public.dim_usuario u on u.id = r.usuario_id
      where r.evento_id = e.id
    ) as participantes
  from public.fato_evento e
  left join public.dim_categoria_evento c on c.id = e.categoria_id
  where e.workspace_id = p_workspace_id
    and e.tp_status = 'ATIVO'
    and e.dt_inicio < p_dt_fim
    and e.dt_fim > p_dt_inicio
  order by e.dt_inicio;
end;
$$;

-- Grants
revoke all on function public.rpc_listar_membros_workspace(uuid) from public;
revoke all on function public.rpc_listar_categorias_workspace(uuid) from public;
revoke all on function public.rpc_criar_evento(uuid, text, timestamptz, timestamptz, uuid[], text, uuid, boolean, boolean, boolean, text, int, int[], date) from public;
revoke all on function public.rpc_listar_eventos_workspace(uuid, timestamptz, timestamptz) from public;

grant execute on function public.rpc_listar_membros_workspace(uuid) to authenticated;
grant execute on function public.rpc_listar_categorias_workspace(uuid) to authenticated;
grant execute on function public.rpc_criar_evento(uuid, text, timestamptz, timestamptz, uuid[], text, uuid, boolean, boolean, boolean, text, int, int[], date) to authenticated;
grant execute on function public.rpc_listar_eventos_workspace(uuid, timestamptz, timestamptz) to authenticated;
