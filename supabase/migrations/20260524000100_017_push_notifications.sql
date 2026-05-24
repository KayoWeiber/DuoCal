BEGIN;
SET search_path TO public;

-- Base para Web Push usando a central interna existente: public.fato_notificacao.
ALTER TABLE public.fato_notificacao
  ADD COLUMN IF NOT EXISTS ds_url_destino text null,
  ADD COLUMN IF NOT EXISTS js_metadata jsonb not null default '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fl_push_habilitada boolean not null default true;

CREATE INDEX IF NOT EXISTS idx_fato_notificacao_push_pendente
  ON public.fato_notificacao (dt_agendada)
  WHERE workspace_id IS NOT NULL
    AND dt_enviada IS NULL
    AND fl_push_habilitada = true;

CREATE TABLE IF NOT EXISTS public.rel_push_subscription (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  usuario_id uuid not null references public.dim_usuario(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  ds_dispositivo text null,
  ds_user_agent text null,
  ds_platform text null,
  fl_ativo boolean not null default true,
  dt_ultimo_uso timestamptz null,
  criado_por uuid null references public.dim_usuario(id),
  atualizado_por uuid null references public.dim_usuario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_rel_push_subscription_endpoint unique (endpoint),
  constraint uq_rel_push_subscription_id_workspace_usuario
    unique (id, workspace_id, usuario_id),
  constraint fk_rel_push_subscription_membro_workspace
    foreign key (workspace_id, usuario_id)
    references public.rel_workspace_usuario(workspace_id, usuario_id)
    on delete cascade
);

CREATE TABLE IF NOT EXISTS public.cfg_preferencia_notificacao_push (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  usuario_id uuid not null references public.dim_usuario(id) on delete cascade,
  push_subscription_id uuid not null,
  fl_eventos boolean not null default true,
  fl_lembretes boolean not null default true,
  fl_convites boolean not null default true,
  fl_alteracoes_agenda boolean not null default true,
  nr_minutos_antes_evento int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_cfg_preferencia_push_subscription
    foreign key (push_subscription_id, workspace_id, usuario_id)
    references public.rel_push_subscription(id, workspace_id, usuario_id)
    on update cascade
    on delete cascade,
  constraint uq_cfg_preferencia_notificacao_push_device
    unique (workspace_id, usuario_id, push_subscription_id),
  constraint chk_cfg_preferencia_notificacao_push_minutos
    check (nr_minutos_antes_evento between 5 and 1440)
);

CREATE TABLE IF NOT EXISTS public.fato_notificacao_push_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  notificacao_id uuid null references public.fato_notificacao(id) on delete set null,
  push_subscription_id uuid null references public.rel_push_subscription(id) on delete set null,
  tp_status text not null,
  http_status int null,
  ds_erro text null,
  js_payload jsonb null,
  created_at timestamptz not null default now(),
  constraint chk_fato_notificacao_push_log_status
    check (tp_status in ('ENVIADO', 'ERRO', 'IGNORADO'))
);

CREATE INDEX IF NOT EXISTS idx_rel_push_subscription_workspace_usuario_ativo
  ON public.rel_push_subscription (workspace_id, usuario_id)
  WHERE fl_ativo = true;

CREATE INDEX IF NOT EXISTS idx_rel_push_subscription_workspace_ativo
  ON public.rel_push_subscription (workspace_id)
  WHERE fl_ativo = true;

CREATE INDEX IF NOT EXISTS idx_cfg_preferencia_notificacao_push_subscription
  ON public.cfg_preferencia_notificacao_push (push_subscription_id);

CREATE INDEX IF NOT EXISTS idx_fato_notificacao_push_log_notificacao
  ON public.fato_notificacao_push_log (notificacao_id);

CREATE INDEX IF NOT EXISTS idx_fato_notificacao_push_log_workspace_created
  ON public.fato_notificacao_push_log (workspace_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_rel_push_subscription_set_updated_at
ON public.rel_push_subscription;

CREATE TRIGGER trg_rel_push_subscription_set_updated_at
BEFORE UPDATE ON public.rel_push_subscription
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_cfg_preferencia_notificacao_push_set_updated_at
ON public.cfg_preferencia_notificacao_push;

CREATE TRIGGER trg_cfg_preferencia_notificacao_push_set_updated_at
BEFORE UPDATE ON public.cfg_preferencia_notificacao_push
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

ALTER TABLE public.rel_push_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfg_preferencia_notificacao_push ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fato_notificacao_push_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.rel_push_subscription TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cfg_preferencia_notificacao_push TO authenticated;
GRANT SELECT ON public.fato_notificacao_push_log TO authenticated;

DROP POLICY IF EXISTS pol_rel_push_subscription_select_proprio
ON public.rel_push_subscription;

CREATE POLICY pol_rel_push_subscription_select_proprio
ON public.rel_push_subscription
FOR SELECT
TO authenticated
USING (
  usuario_id = public.fn_usuario_atual_id()
  AND public.fn_usuario_membro_workspace(workspace_id)
);

DROP POLICY IF EXISTS pol_rel_push_subscription_insert_proprio
ON public.rel_push_subscription;

CREATE POLICY pol_rel_push_subscription_insert_proprio
ON public.rel_push_subscription
FOR INSERT
TO authenticated
WITH CHECK (
  usuario_id = public.fn_usuario_atual_id()
  AND public.fn_usuario_membro_workspace(workspace_id)
);

DROP POLICY IF EXISTS pol_rel_push_subscription_update_proprio
ON public.rel_push_subscription;

CREATE POLICY pol_rel_push_subscription_update_proprio
ON public.rel_push_subscription
FOR UPDATE
TO authenticated
USING (
  usuario_id = public.fn_usuario_atual_id()
  AND public.fn_usuario_membro_workspace(workspace_id)
)
WITH CHECK (
  usuario_id = public.fn_usuario_atual_id()
  AND public.fn_usuario_membro_workspace(workspace_id)
);

DROP POLICY IF EXISTS pol_cfg_preferencia_push_select_proprio
ON public.cfg_preferencia_notificacao_push;

CREATE POLICY pol_cfg_preferencia_push_select_proprio
ON public.cfg_preferencia_notificacao_push
FOR SELECT
TO authenticated
USING (
  usuario_id = public.fn_usuario_atual_id()
  AND public.fn_usuario_membro_workspace(workspace_id)
);

DROP POLICY IF EXISTS pol_cfg_preferencia_push_insert_proprio
ON public.cfg_preferencia_notificacao_push;

CREATE POLICY pol_cfg_preferencia_push_insert_proprio
ON public.cfg_preferencia_notificacao_push
FOR INSERT
TO authenticated
WITH CHECK (
  usuario_id = public.fn_usuario_atual_id()
  AND public.fn_usuario_membro_workspace(workspace_id)
);

DROP POLICY IF EXISTS pol_cfg_preferencia_push_update_proprio
ON public.cfg_preferencia_notificacao_push;

CREATE POLICY pol_cfg_preferencia_push_update_proprio
ON public.cfg_preferencia_notificacao_push
FOR UPDATE
TO authenticated
USING (
  usuario_id = public.fn_usuario_atual_id()
  AND public.fn_usuario_membro_workspace(workspace_id)
)
WITH CHECK (
  usuario_id = public.fn_usuario_atual_id()
  AND public.fn_usuario_membro_workspace(workspace_id)
);

DROP POLICY IF EXISTS pol_fato_notificacao_push_log_select
ON public.fato_notificacao_push_log;

CREATE POLICY pol_fato_notificacao_push_log_select
ON public.fato_notificacao_push_log
FOR SELECT
TO authenticated
USING (
  public.fn_usuario_admin_workspace(workspace_id)
  OR EXISTS (
    SELECT 1
    FROM public.rel_push_subscription s
    WHERE s.id = push_subscription_id
      AND s.usuario_id = public.fn_usuario_atual_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.fato_notificacao n
    WHERE n.id = notificacao_id
      AND n.usuario_destino_id = public.fn_usuario_atual_id()
  )
);

CREATE OR REPLACE FUNCTION public.rpc_obter_status_push_dispositivo(
  p_workspace_id uuid,
  p_endpoint text default null
)
RETURNS TABLE (
  push_subscription_id uuid,
  fl_ativo boolean,
  dt_ultimo_uso timestamptz,
  fl_eventos boolean,
  fl_lembretes boolean,
  fl_convites boolean,
  fl_alteracoes_agenda boolean,
  nr_minutos_antes_evento int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id uuid;
  v_endpoint text;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();
  v_endpoint := nullif(btrim(p_endpoint), '');

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  IF v_endpoint IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.fl_ativo,
    s.dt_ultimo_uso,
    COALESCE(p.fl_eventos, true),
    COALESCE(p.fl_lembretes, true),
    COALESCE(p.fl_convites, true),
    COALESCE(p.fl_alteracoes_agenda, true),
    COALESCE(p.nr_minutos_antes_evento, 30)
  FROM public.rel_push_subscription s
  LEFT JOIN public.cfg_preferencia_notificacao_push p
    ON p.push_subscription_id = s.id
   AND p.workspace_id = s.workspace_id
   AND p.usuario_id = s.usuario_id
  WHERE s.workspace_id = p_workspace_id
    AND s.usuario_id = v_usuario_id
    AND s.endpoint = v_endpoint
  ORDER BY s.updated_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_salvar_push_subscription(
  p_workspace_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_ds_dispositivo text default null,
  p_ds_user_agent text default null,
  p_ds_platform text default null
)
RETURNS TABLE (
  push_subscription_id uuid,
  fl_ativo boolean,
  dt_ultimo_uso timestamptz,
  fl_eventos boolean,
  fl_lembretes boolean,
  fl_convites boolean,
  fl_alteracoes_agenda boolean,
  nr_minutos_antes_evento int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id uuid;
  v_subscription_id uuid;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  IF nullif(btrim(p_endpoint), '') IS NULL
     OR nullif(btrim(p_p256dh), '') IS NULL
     OR nullif(btrim(p_auth), '') IS NULL THEN
    RAISE EXCEPTION 'PUSH_SUBSCRIPTION_INVALIDA' USING HINT = 'validation';
  END IF;

  INSERT INTO public.rel_push_subscription (
    workspace_id,
    usuario_id,
    endpoint,
    p256dh,
    auth,
    ds_dispositivo,
    ds_user_agent,
    ds_platform,
    fl_ativo,
    dt_ultimo_uso,
    criado_por,
    atualizado_por
  )
  VALUES (
    p_workspace_id,
    v_usuario_id,
    btrim(p_endpoint),
    btrim(p_p256dh),
    btrim(p_auth),
    nullif(btrim(p_ds_dispositivo), ''),
    nullif(btrim(p_ds_user_agent), ''),
    nullif(btrim(p_ds_platform), ''),
    true,
    now(),
    v_usuario_id,
    v_usuario_id
  )
  ON CONFLICT ON CONSTRAINT uq_rel_push_subscription_endpoint
  DO UPDATE SET
    workspace_id = excluded.workspace_id,
    usuario_id = excluded.usuario_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    ds_dispositivo = excluded.ds_dispositivo,
    ds_user_agent = excluded.ds_user_agent,
    ds_platform = excluded.ds_platform,
    fl_ativo = true,
    dt_ultimo_uso = now(),
    atualizado_por = excluded.atualizado_por,
    updated_at = now()
  RETURNING id INTO v_subscription_id;

  INSERT INTO public.cfg_preferencia_notificacao_push (
    workspace_id,
    usuario_id,
    push_subscription_id
  )
  VALUES (
    p_workspace_id,
    v_usuario_id,
    v_subscription_id
  )
  ON CONFLICT ON CONSTRAINT uq_cfg_preferencia_notificacao_push_device
  DO NOTHING;

  RETURN QUERY
  SELECT *
  FROM public.rpc_obter_status_push_dispositivo(p_workspace_id, p_endpoint);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_desativar_push_subscription(
  p_workspace_id uuid,
  p_endpoint text
)
RETURNS TABLE (
  push_subscription_id uuid,
  fl_ativo boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id uuid;
  v_endpoint text;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();
  v_endpoint := nullif(btrim(p_endpoint), '');

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  IF v_endpoint IS NULL THEN
    RAISE EXCEPTION 'PUSH_SUBSCRIPTION_INVALIDA' USING HINT = 'validation';
  END IF;

  RETURN QUERY
  UPDATE public.rel_push_subscription s
  SET
    fl_ativo = false,
    atualizado_por = v_usuario_id,
    updated_at = now()
  WHERE s.workspace_id = p_workspace_id
    AND s.usuario_id = v_usuario_id
    AND s.endpoint = v_endpoint
  RETURNING s.id, s.fl_ativo;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_atualizar_preferencia_notificacao_push(
  p_workspace_id uuid,
  p_push_subscription_id uuid,
  p_fl_eventos boolean,
  p_fl_lembretes boolean,
  p_fl_convites boolean,
  p_fl_alteracoes_agenda boolean,
  p_nr_minutos_antes_evento int
)
RETURNS TABLE (
  push_subscription_id uuid,
  fl_ativo boolean,
  dt_ultimo_uso timestamptz,
  fl_eventos boolean,
  fl_lembretes boolean,
  fl_convites boolean,
  fl_alteracoes_agenda boolean,
  nr_minutos_antes_evento int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_usuario_id uuid;
  v_endpoint text;
  v_minutos int;
BEGIN
  v_usuario_id := public.fn_usuario_atual_id();
  v_minutos := greatest(5, least(coalesce(p_nr_minutos_antes_evento, 30), 1440));

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO' USING HINT = 'auth';
  END IF;

  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING HINT = 'workspace';
  END IF;

  SELECT s.endpoint
    INTO v_endpoint
  FROM public.rel_push_subscription s
  WHERE s.id = p_push_subscription_id
    AND s.workspace_id = p_workspace_id
    AND s.usuario_id = v_usuario_id;

  IF v_endpoint IS NULL THEN
    RAISE EXCEPTION 'PUSH_SUBSCRIPTION_NAO_ENCONTRADA' USING HINT = 'not_found';
  END IF;

  INSERT INTO public.cfg_preferencia_notificacao_push (
    workspace_id,
    usuario_id,
    push_subscription_id,
    fl_eventos,
    fl_lembretes,
    fl_convites,
    fl_alteracoes_agenda,
    nr_minutos_antes_evento
  )
  VALUES (
    p_workspace_id,
    v_usuario_id,
    p_push_subscription_id,
    coalesce(p_fl_eventos, true),
    coalesce(p_fl_lembretes, true),
    coalesce(p_fl_convites, true),
    coalesce(p_fl_alteracoes_agenda, true),
    v_minutos
  )
  ON CONFLICT ON CONSTRAINT uq_cfg_preferencia_notificacao_push_device
  DO UPDATE SET
    fl_eventos = excluded.fl_eventos,
    fl_lembretes = excluded.fl_lembretes,
    fl_convites = excluded.fl_convites,
    fl_alteracoes_agenda = excluded.fl_alteracoes_agenda,
    nr_minutos_antes_evento = excluded.nr_minutos_antes_evento,
    updated_at = now();

  RETURN QUERY
  SELECT *
  FROM public.rpc_obter_status_push_dispositivo(p_workspace_id, v_endpoint);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_obter_status_push_dispositivo(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.rpc_salvar_push_subscription(uuid, text, text, text, text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.rpc_desativar_push_subscription(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.rpc_atualizar_preferencia_notificacao_push(uuid, uuid, boolean, boolean, boolean, boolean, int) FROM public;

GRANT EXECUTE ON FUNCTION public.rpc_obter_status_push_dispositivo(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_salvar_push_subscription(uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_desativar_push_subscription(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_atualizar_preferencia_notificacao_push(uuid, uuid, boolean, boolean, boolean, boolean, int) TO authenticated;

COMMIT;
