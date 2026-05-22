BEGIN;
SET search_path TO public;

-- ─── RPCs de gerenciamento de categorias ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_criar_categoria(
  p_workspace_id uuid,
  p_nm_categoria text,
  p_cd_cor       text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id uuid;
  v_id         uuid;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  IF p_nm_categoria IS NULL OR trim(p_nm_categoria) = '' THEN
    RAISE EXCEPTION 'NOME_OBRIGATORIO' USING HINT = 'validation';
  END IF;

  IF p_cd_cor !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'COR_INVALIDA' USING HINT = 'validation';
  END IF;

  INSERT INTO public.dim_categoria_evento (
    workspace_id,
    nm_categoria,
    cd_cor,
    fl_padrao,
    fl_ativo,
    criado_por
  )
  VALUES (
    p_workspace_id,
    trim(p_nm_categoria),
    p_cd_cor,
    false,
    true,
    v_usuario_id
  )
  RETURNING id INTO v_id;

  RETURN json_build_object(
    'id',           v_id,
    'nm_categoria', trim(p_nm_categoria),
    'cd_cor',       p_cd_cor,
    'fl_padrao',    false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_atualizar_categoria(
  p_categoria_id uuid,
  p_nm_categoria text,
  p_cd_cor       text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id   uuid;
  v_workspace_id uuid;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM public.dim_categoria_evento
  WHERE id = p_categoria_id AND fl_ativo = true;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'CATEGORIA_NAO_ENCONTRADA' USING HINT = 'not_found';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(v_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  IF p_nm_categoria IS NULL OR trim(p_nm_categoria) = '' THEN
    RAISE EXCEPTION 'NOME_OBRIGATORIO' USING HINT = 'validation';
  END IF;

  IF p_cd_cor !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'COR_INVALIDA' USING HINT = 'validation';
  END IF;

  UPDATE public.dim_categoria_evento
  SET
    nm_categoria   = trim(p_nm_categoria),
    cd_cor         = p_cd_cor,
    atualizado_por = v_usuario_id,
    updated_at     = NOW()
  WHERE id = p_categoria_id;

  RETURN json_build_object(
    'id',           p_categoria_id,
    'nm_categoria', trim(p_nm_categoria),
    'cd_cor',       p_cd_cor
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_desativar_categoria(
  p_categoria_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id   uuid;
  v_workspace_id uuid;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM public.dim_categoria_evento
  WHERE id = p_categoria_id AND fl_ativo = true;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'CATEGORIA_NAO_ENCONTRADA' USING HINT = 'not_found';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(v_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  UPDATE public.dim_categoria_evento
  SET
    fl_ativo       = false,
    atualizado_por = v_usuario_id,
    updated_at     = NOW()
  WHERE id = p_categoria_id;
END;
$$;

-- ─── rpc_listar_eventos_workspace: expande instâncias de eventos recorrentes ──
-- Eventos não recorrentes são retornados normalmente.
-- Eventos recorrentes são expandidos via generate_series(0, 365) com offset de
-- intervalo, limitando a ~365 repetições por evento (suficiente para MVP).

CREATE OR REPLACE FUNCTION public.rpc_listar_eventos_workspace(
  p_workspace_id uuid,
  p_dt_inicio    timestamptz,
  p_dt_fim       timestamptz
)
RETURNS TABLE (
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id uuid;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  RETURN QUERY
  WITH participantes_json AS (
    SELECT
      r.evento_id,
      json_agg(
        json_build_object(
          'usuario_id',               u.id,
          'nm_usuario',               u.nm_usuario,
          'tp_participacao',          r.tp_participacao,
          'fl_responsavel_principal', r.fl_responsavel_principal
        )
        ORDER BY r.fl_responsavel_principal DESC, u.nm_usuario
      ) AS participantes
    FROM public.rel_evento_usuario r
    JOIN public.dim_usuario u ON u.id = r.usuario_id
    WHERE r.workspace_id = p_workspace_id
    GROUP BY r.evento_id
  ),
  -- Instâncias geradas para eventos recorrentes.
  -- O offset_interval é calculado uma vez por LATERAL e reutilizado nas condições.
  instancias AS (
    SELECT
      e.id,
      e.workspace_id,
      e.nm_evento,
      e.ds_evento,
      (e.dt_inicio + oc.offset_interval)  AS inst_inicio,
      (e.dt_fim    + oc.offset_interval)  AS inst_fim,
      e.fl_dia_todo,
      e.fl_bloqueia_horario,
      e.fl_recorrente,
      e.tp_status,
      e.categoria_id,
      c.nm_categoria,
      c.cd_cor   AS cd_cor_categoria,
      c.cd_icone AS cd_icone_categoria,
      pj.participantes
    FROM public.fato_evento e
    JOIN public.dim_recorrencia_evento r ON r.evento_id = e.id
    LEFT JOIN public.dim_categoria_evento c ON c.id = e.categoria_id
    LEFT JOIN participantes_json pj ON pj.evento_id = e.id
    CROSS JOIN generate_series(0, 365) AS s(n)
    CROSS JOIN LATERAL (
      SELECT CASE r.tp_frequencia
        WHEN 'DIARIA'  THEN make_interval(days   := r.intervalo * s.n)
        WHEN 'SEMANAL' THEN make_interval(weeks  := r.intervalo * s.n)
        WHEN 'MENSAL'  THEN make_interval(months := r.intervalo * s.n)
        ELSE make_interval()
      END AS offset_interval
    ) AS oc
    WHERE e.workspace_id = p_workspace_id
      AND e.tp_status    = 'ATIVO'
      AND e.fl_recorrente = true
      AND (e.dt_inicio + oc.offset_interval) < p_dt_fim
      AND (e.dt_fim    + oc.offset_interval) > p_dt_inicio
      AND (
        r.dt_fim_recorrencia IS NULL
        OR (e.dt_inicio + oc.offset_interval)::date <= r.dt_fim_recorrencia
      )
  )
  -- Instâncias de eventos recorrentes
  SELECT
    i.id,
    i.workspace_id,
    i.nm_evento,
    i.ds_evento,
    i.inst_inicio AS dt_inicio,
    i.inst_fim    AS dt_fim,
    i.fl_dia_todo,
    i.fl_bloqueia_horario,
    i.fl_recorrente,
    i.tp_status,
    i.categoria_id,
    i.nm_categoria,
    i.cd_cor_categoria,
    i.cd_icone_categoria,
    i.participantes
  FROM instancias i

  UNION ALL

  -- Eventos não recorrentes no período
  SELECT
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
    c.cd_cor   AS cd_cor_categoria,
    c.cd_icone AS cd_icone_categoria,
    pj.participantes
  FROM public.fato_evento e
  LEFT JOIN public.dim_categoria_evento c  ON c.id = e.categoria_id
  LEFT JOIN participantes_json pj ON pj.evento_id = e.id
  WHERE e.workspace_id = p_workspace_id
    AND e.tp_status    = 'ATIVO'
    AND e.fl_recorrente = false
    AND e.dt_inicio < p_dt_fim
    AND e.dt_fim    > p_dt_inicio

  ORDER BY dt_inicio;
END;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.rpc_criar_categoria(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.rpc_atualizar_categoria(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.rpc_desativar_categoria(uuid) FROM public;

GRANT EXECUTE ON FUNCTION public.rpc_criar_categoria(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_atualizar_categoria(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_desativar_categoria(uuid) TO authenticated;

COMMIT;
