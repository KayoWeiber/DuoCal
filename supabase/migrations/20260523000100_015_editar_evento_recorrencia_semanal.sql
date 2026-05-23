BEGIN;
SET search_path TO public;

-- ─── rpc_listar_eventos_workspace: refatorado para suportar dias_semana em
-- recorrência semanal e retornar campos de recorrência para a UI de edição.
--
-- Estratégia:
--   • Eventos recorrentes SEMANAL com dias_semana → gera um candidato por dia no
--     intervalo consultado e filtra pelo dia-da-semana (EXTRACT DOW).
--   • Eventos recorrentes DIARIA / MENSAL / SEMANAL sem dias_semana → usa
--     generate_series(0..365) com make_interval, igual à versão anterior.
--   • Eventos não recorrentes → retornados diretamente.
--
-- Todos os ramos retornam tp_frequencia, intervalo, dias_semana e
-- dt_fim_recorrencia para que a UI preencha o formulário de edição.

DROP FUNCTION IF EXISTS public.rpc_listar_eventos_workspace(
  uuid,
  timestamptz,
  timestamptz
);

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
  participantes        json,
  tp_frequencia        text,
  intervalo            int,
  dias_semana          int[],
  dt_fim_recorrencia   date
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

  -- ── Ramo 1: SEMANAL com dias_semana explícitos ───────────────────────────
  -- Gera um candidato por dia no intervalo e filtra pelo dia-da-semana.
  -- O horário do evento original é preservado via subtração de offset desde
  -- a meia-noite do dt_inicio original (funciona com timestamptz em UTC).
  semanal_por_dia AS (
    SELECT
      e.id,
      e.workspace_id,
      e.nm_evento,
      e.ds_evento,
      oc.inst_inicio,
      oc.inst_fim,
      e.fl_dia_todo,
      e.fl_bloqueia_horario,
      e.fl_recorrente,
      e.tp_status,
      e.categoria_id,
      c.nm_categoria,
      c.cd_cor   AS cd_cor_categoria,
      c.cd_icone AS cd_icone_categoria,
      pj.participantes,
      r.tp_frequencia,
      r.intervalo,
      r.dias_semana,
      r.dt_fim_recorrencia
    FROM public.fato_evento e
    JOIN public.dim_recorrencia_evento r ON r.evento_id = e.id
    LEFT JOIN public.dim_categoria_evento c ON c.id = e.categoria_id
    LEFT JOIN participantes_json pj ON pj.evento_id = e.id
    -- Itera cada dia do intervalo consultado
    CROSS JOIN generate_series(p_dt_inicio::date, p_dt_fim::date, '1 day'::interval) AS d(candidate_date)
    -- Calcula horário do evento naquele dia preservando o time-of-day original
    CROSS JOIN LATERAL (
      SELECT
        d.candidate_date::timestamptz + (e.dt_inicio - date_trunc('day', e.dt_inicio)) AS inst_inicio,
        d.candidate_date::timestamptz + (e.dt_fim    - date_trunc('day', e.dt_inicio)) AS inst_fim
    ) AS oc
    WHERE e.workspace_id = p_workspace_id
      AND e.tp_status     = 'ATIVO'
      AND e.fl_recorrente = true
      AND r.tp_frequencia = 'SEMANAL'
      AND r.dias_semana IS NOT NULL
      AND array_length(r.dias_semana, 1) > 0
      -- Filtra pelo dia-da-semana (0 = Dom … 6 = Sáb)
      AND EXTRACT(DOW FROM d.candidate_date)::int = ANY(r.dias_semana)
      -- Não gera ocorrências antes do evento original
      AND d.candidate_date >= e.dt_inicio::date
      -- Respeita data de fim da recorrência
      AND (r.dt_fim_recorrencia IS NULL OR d.candidate_date <= r.dt_fim_recorrencia)
      -- A instância precisa cruzar o intervalo consultado
      AND oc.inst_inicio < p_dt_fim
      AND oc.inst_fim    > p_dt_inicio
  ),

  -- ── Ramo 2: DIARIA / MENSAL / SEMANAL sem dias_semana ───────────────────
  -- Usa generate_series(0..365) e make_interval, igual à versão anterior.
  por_intervalo AS (
    SELECT
      e.id,
      e.workspace_id,
      e.nm_evento,
      e.ds_evento,
      (e.dt_inicio + oc.offset_interval) AS inst_inicio,
      (e.dt_fim    + oc.offset_interval) AS inst_fim,
      e.fl_dia_todo,
      e.fl_bloqueia_horario,
      e.fl_recorrente,
      e.tp_status,
      e.categoria_id,
      c.nm_categoria,
      c.cd_cor   AS cd_cor_categoria,
      c.cd_icone AS cd_icone_categoria,
      pj.participantes,
      r.tp_frequencia,
      r.intervalo,
      r.dias_semana,
      r.dt_fim_recorrencia
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
      AND e.tp_status     = 'ATIVO'
      AND e.fl_recorrente = true
      -- Exclui eventos já cobertos pelo ramo semanal_por_dia
      AND NOT (
        r.tp_frequencia = 'SEMANAL'
        AND r.dias_semana IS NOT NULL
        AND array_length(r.dias_semana, 1) > 0
      )
      AND (e.dt_inicio + oc.offset_interval) < p_dt_fim
      AND (e.dt_fim    + oc.offset_interval) > p_dt_inicio
      AND (
        r.dt_fim_recorrencia IS NULL
        OR (e.dt_inicio + oc.offset_interval)::date <= r.dt_fim_recorrencia
      )
  )

  -- ── Resultado final ──────────────────────────────────────────────────────
  SELECT
    s.id, s.workspace_id, s.nm_evento, s.ds_evento,
    s.inst_inicio AS dt_inicio, s.inst_fim AS dt_fim,
    s.fl_dia_todo, s.fl_bloqueia_horario, s.fl_recorrente, s.tp_status,
    s.categoria_id, s.nm_categoria, s.cd_cor_categoria, s.cd_icone_categoria,
    s.participantes, s.tp_frequencia, s.intervalo, s.dias_semana, s.dt_fim_recorrencia
  FROM semanal_por_dia s

  UNION ALL

  SELECT
    p.id, p.workspace_id, p.nm_evento, p.ds_evento,
    p.inst_inicio AS dt_inicio, p.inst_fim AS dt_fim,
    p.fl_dia_todo, p.fl_bloqueia_horario, p.fl_recorrente, p.tp_status,
    p.categoria_id, p.nm_categoria, p.cd_cor_categoria, p.cd_icone_categoria,
    p.participantes, p.tp_frequencia, p.intervalo, p.dias_semana, p.dt_fim_recorrencia
  FROM por_intervalo p

  UNION ALL

  SELECT
    e.id, e.workspace_id, e.nm_evento, e.ds_evento,
    e.dt_inicio, e.dt_fim,
    e.fl_dia_todo, e.fl_bloqueia_horario, e.fl_recorrente, e.tp_status,
    e.categoria_id, c.nm_categoria, c.cd_cor AS cd_cor_categoria, c.cd_icone AS cd_icone_categoria,
    pj.participantes,
    NULL::text   AS tp_frequencia,
    NULL::int    AS intervalo,
    NULL::int[]  AS dias_semana,
    NULL::date   AS dt_fim_recorrencia
  FROM public.fato_evento e
  LEFT JOIN public.dim_categoria_evento c ON c.id = e.categoria_id
  LEFT JOIN participantes_json pj ON pj.evento_id = e.id
  WHERE e.workspace_id = p_workspace_id
    AND e.tp_status     = 'ATIVO'
    AND e.fl_recorrente = false
    AND e.dt_inicio < p_dt_fim
    AND e.dt_fim    > p_dt_inicio

  ORDER BY dt_inicio;
END;
$$;

-- ─── rpc_buscar_evento ────────────────────────────────────────────────────────
-- Retorna os dados completos e originais de um evento (sem expansão de
-- recorrência), incluindo participantes e configuração de recorrência.
-- Usado pela UI do formulário de edição para pré-preencher os campos com os
-- dados originais do evento-base (não da instância expandida).

CREATE OR REPLACE FUNCTION public.rpc_buscar_evento(
  p_evento_id    uuid,
  p_workspace_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id uuid;
  v_result     json;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  SELECT json_build_object(
    'id',                  e.id,
    'workspace_id',        e.workspace_id,
    'nm_evento',           e.nm_evento,
    'ds_evento',           e.ds_evento,
    'dt_inicio',           e.dt_inicio,
    'dt_fim',              e.dt_fim,
    'fl_dia_todo',         e.fl_dia_todo,
    'fl_bloqueia_horario', e.fl_bloqueia_horario,
    'fl_recorrente',       e.fl_recorrente,
    'tp_status',           e.tp_status,
    'categoria_id',        e.categoria_id,
    'nm_categoria',        cat.nm_categoria,
    'cd_cor_categoria',    cat.cd_cor,
    'cd_icone_categoria',  cat.cd_icone,
    'participantes', (
      SELECT json_agg(
        json_build_object(
          'usuario_id',               u.id,
          'nm_usuario',               u.nm_usuario,
          'tp_participacao',          r.tp_participacao,
          'fl_responsavel_principal', r.fl_responsavel_principal
        )
        ORDER BY r.fl_responsavel_principal DESC, u.nm_usuario
      )
      FROM public.rel_evento_usuario r
      JOIN public.dim_usuario u ON u.id = r.usuario_id
      WHERE r.evento_id = e.id
    ),
    'tp_frequencia',       rec.tp_frequencia,
    'intervalo',           rec.intervalo,
    'dias_semana',         rec.dias_semana,
    'dt_fim_recorrencia',  rec.dt_fim_recorrencia
  )
  INTO v_result
  FROM public.fato_evento e
  LEFT JOIN public.dim_categoria_evento cat ON cat.id = e.categoria_id
  LEFT JOIN public.dim_recorrencia_evento rec ON rec.evento_id = e.id
  WHERE e.id = p_evento_id
    AND e.workspace_id = p_workspace_id
    AND e.tp_status = 'ATIVO';

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'EVENTO_NAO_ENCONTRADO' USING HINT = 'not_found';
  END IF;

  RETURN v_result;
END;
$$;

-- ─── rpc_atualizar_evento ─────────────────────────────────────────────────────
-- Atualiza um evento existente verificando que o usuário é membro ativo do
-- workspace que contém o evento. Substitui participantes e configuração de
-- recorrência por completo.

CREATE OR REPLACE FUNCTION public.rpc_atualizar_evento(
  p_evento_id           uuid,
  p_workspace_id        uuid,
  p_nm_evento           text,
  p_dt_inicio           timestamptz,
  p_dt_fim              timestamptz,
  p_participantes       uuid[],
  p_ds_evento           text      DEFAULT NULL,
  p_categoria_id        uuid      DEFAULT NULL,
  p_fl_dia_todo         boolean   DEFAULT false,
  p_fl_bloqueia_horario boolean   DEFAULT true,
  p_fl_recorrente       boolean   DEFAULT false,
  p_tp_frequencia       text      DEFAULT NULL,
  p_intervalo           int       DEFAULT 1,
  p_dias_semana         int[]     DEFAULT NULL,
  p_dt_fim_recorrencia  date      DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id       uuid;
  v_evento_workspace uuid;
  v_tp_participacao  text;
  v_part_id          uuid;
  v_is_first         boolean := true;
  v_result           json;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  -- Garante que o evento pertence ao workspace informado
  SELECT workspace_id INTO v_evento_workspace
  FROM public.fato_evento
  WHERE id = p_evento_id AND tp_status = 'ATIVO';

  IF v_evento_workspace IS NULL OR v_evento_workspace != p_workspace_id THEN
    RAISE EXCEPTION 'EVENTO_NAO_ENCONTRADO' USING HINT = 'not_found';
  END IF;

  -- Validações básicas
  IF p_nm_evento IS NULL OR trim(p_nm_evento) = '' THEN
    RAISE EXCEPTION 'TITULO_OBRIGATORIO' USING HINT = 'validation';
  END IF;

  IF p_dt_inicio IS NULL OR p_dt_fim IS NULL THEN
    RAISE EXCEPTION 'DATA_OBRIGATORIA' USING HINT = 'validation';
  END IF;

  IF p_dt_fim <= p_dt_inicio THEN
    RAISE EXCEPTION 'DATA_FIM_DEVE_SER_MAIOR_QUE_INICIO' USING HINT = 'validation';
  END IF;

  IF p_participantes IS NULL OR array_length(p_participantes, 1) IS NULL THEN
    RAISE EXCEPTION 'PARTICIPANTE_OBRIGATORIO' USING HINT = 'validation';
  END IF;

  -- Atualiza dados principais do evento
  UPDATE public.fato_evento
  SET
    nm_evento           = trim(p_nm_evento),
    ds_evento           = p_ds_evento,
    dt_inicio           = p_dt_inicio,
    dt_fim              = p_dt_fim,
    categoria_id        = p_categoria_id,
    fl_dia_todo         = COALESCE(p_fl_dia_todo, false),
    fl_bloqueia_horario = COALESCE(p_fl_bloqueia_horario, true),
    fl_recorrente       = COALESCE(p_fl_recorrente, false),
    atualizado_por      = v_usuario_id,
    updated_at          = NOW()
  WHERE id = p_evento_id;

  -- Substitui participantes completamente
  DELETE FROM public.rel_evento_usuario WHERE evento_id = p_evento_id;

  v_tp_participacao := CASE
    WHEN array_length(p_participantes, 1) > 1 THEN 'CASAL'
    ELSE 'RESPONSAVEL'
  END;

  FOREACH v_part_id IN ARRAY p_participantes LOOP
    INSERT INTO public.rel_evento_usuario (
      workspace_id, evento_id, usuario_id, tp_participacao, fl_responsavel_principal
    )
    VALUES (
      p_workspace_id, p_evento_id, v_part_id, v_tp_participacao, v_is_first
    )
    ON CONFLICT (evento_id, usuario_id) DO NOTHING;

    v_is_first := false;
  END LOOP;

  -- Atualiza recorrência
  IF COALESCE(p_fl_recorrente, false) AND p_tp_frequencia IS NOT NULL THEN
    INSERT INTO public.dim_recorrencia_evento (
      workspace_id, evento_id, tp_frequencia, intervalo, dias_semana, dt_fim_recorrencia
    )
    VALUES (
      p_workspace_id, p_evento_id,
      p_tp_frequencia, COALESCE(p_intervalo, 1), p_dias_semana, p_dt_fim_recorrencia
    )
    ON CONFLICT (evento_id) DO UPDATE SET
      tp_frequencia      = EXCLUDED.tp_frequencia,
      intervalo          = EXCLUDED.intervalo,
      dias_semana        = EXCLUDED.dias_semana,
      dt_fim_recorrencia = EXCLUDED.dt_fim_recorrencia,
      updated_at         = NOW();
  ELSE
    -- Remove recorrência se o evento deixou de ser recorrente
    DELETE FROM public.dim_recorrencia_evento WHERE evento_id = p_evento_id;
  END IF;

  -- Retorna o evento atualizado
  SELECT json_build_object(
    'id',                  e.id,
    'workspace_id',        e.workspace_id,
    'nm_evento',           e.nm_evento,
    'ds_evento',           e.ds_evento,
    'dt_inicio',           e.dt_inicio,
    'dt_fim',              e.dt_fim,
    'fl_dia_todo',         e.fl_dia_todo,
    'fl_bloqueia_horario', e.fl_bloqueia_horario,
    'fl_recorrente',       e.fl_recorrente,
    'categoria_id',        e.categoria_id,
    'updated_at',          e.updated_at
  ) INTO v_result
  FROM public.fato_evento e
  WHERE e.id = p_evento_id;

  RETURN v_result;
END;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.rpc_listar_eventos_workspace(uuid, timestamptz, timestamptz) FROM public;
REVOKE ALL ON FUNCTION public.rpc_buscar_evento(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.rpc_atualizar_evento(uuid, uuid, text, timestamptz, timestamptz, uuid[], text, uuid, boolean, boolean, boolean, text, int, int[], date) FROM public;

GRANT EXECUTE ON FUNCTION public.rpc_listar_eventos_workspace(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_buscar_evento(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_atualizar_evento(uuid, uuid, text, timestamptz, timestamptz, uuid[], text, uuid, boolean, boolean, boolean, text, int, int[], date) TO authenticated;

COMMIT;
