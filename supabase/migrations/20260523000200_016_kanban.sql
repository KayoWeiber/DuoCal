BEGIN;
SET search_path TO public;

-- ─── Tabela de tarefas Kanban ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fato_tarefa_kanban (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id   UUID        NOT NULL REFERENCES public.dim_workspace(id) ON DELETE CASCADE,
  titulo         TEXT        NOT NULL,
  descricao      TEXT,
  status         TEXT        NOT NULL DEFAULT 'A_FAZER'
                               CHECK (status IN ('A_FAZER', 'EM_ANDAMENTO', 'PLANEJADO', 'CONCLUIDO')),
  prioridade     TEXT        NOT NULL DEFAULT 'MEDIA'
                               CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA')),
  categoria_id   UUID        REFERENCES public.dim_categoria_evento(id) ON DELETE SET NULL,
  responsavel_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  dt_prazo       TIMESTAMPTZ,
  dt_conclusao   TIMESTAMPTZ,
  created_by     UUID        REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tarefa_kanban_workspace
  ON public.fato_tarefa_kanban (workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tarefa_kanban_status
  ON public.fato_tarefa_kanban (workspace_id, status)
  WHERE deleted_at IS NULL;

-- Trigger para updated_at automático
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_tarefa_kanban_updated_at'
  ) THEN
    CREATE TRIGGER trg_tarefa_kanban_updated_at
      BEFORE UPDATE ON public.fato_tarefa_kanban
      FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
  END IF;
END$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.fato_tarefa_kanban ENABLE ROW LEVEL SECURITY;

CREATE POLICY pol_tarefa_kanban_select ON public.fato_tarefa_kanban
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.fn_usuario_membro_workspace(workspace_id)
  );

CREATE POLICY pol_tarefa_kanban_insert ON public.fato_tarefa_kanban
  FOR INSERT
  WITH CHECK (
    public.fn_usuario_membro_workspace(workspace_id)
  );

CREATE POLICY pol_tarefa_kanban_update ON public.fato_tarefa_kanban
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND public.fn_usuario_membro_workspace(workspace_id)
  );

-- ─── RPCs ─────────────────────────────────────────────────────────────────────

-- Listar tarefas do workspace (soft-delete aware)
CREATE OR REPLACE FUNCTION public.rpc_listar_tarefas_kanban(
  p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'Acesso negado ao workspace.';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',               t.id,
      'workspace_id',     t.workspace_id,
      'titulo',           t.titulo,
      'descricao',        t.descricao,
      'status',           t.status,
      'prioridade',       t.prioridade,
      'categoria_id',     t.categoria_id,
      'nm_categoria',     c.nm_categoria,
      'cd_cor_categoria', c.cd_cor,
      'responsavel_id',   t.responsavel_id,
      'nm_responsavel',   u.nm_usuario,
      'dt_prazo',         t.dt_prazo,
      'dt_conclusao',     t.dt_conclusao,
      'created_by',       t.created_by,
      'created_at',       t.created_at,
      'updated_at',       t.updated_at
    ) ORDER BY
      CASE t.status
        WHEN 'EM_ANDAMENTO' THEN 1
        WHEN 'A_FAZER'      THEN 2
        WHEN 'PLANEJADO'    THEN 3
        WHEN 'CONCLUIDO'    THEN 4
      END,
      CASE t.prioridade
        WHEN 'ALTA'  THEN 1
        WHEN 'MEDIA' THEN 2
        WHEN 'BAIXA' THEN 3
      END,
      t.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.fato_tarefa_kanban t
  LEFT JOIN public.dim_categoria_evento c ON c.id = t.categoria_id
  LEFT JOIN public.dim_usuario u ON u.id = t.responsavel_id
  WHERE t.workspace_id = p_workspace_id
    AND t.deleted_at IS NULL;

  RETURN v_result;
END;
$$;

-- Criar tarefa
CREATE OR REPLACE FUNCTION public.rpc_criar_tarefa_kanban(
  p_workspace_id   UUID,
  p_titulo         TEXT,
  p_descricao      TEXT        DEFAULT NULL,
  p_status         TEXT        DEFAULT 'A_FAZER',
  p_prioridade     TEXT        DEFAULT 'MEDIA',
  p_categoria_id   UUID        DEFAULT NULL,
  p_responsavel_id UUID        DEFAULT NULL,
  p_dt_prazo       TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'Acesso negado ao workspace.';
  END IF;

  IF p_titulo IS NULL OR trim(p_titulo) = '' THEN
    RAISE EXCEPTION 'O título da tarefa é obrigatório.';
  END IF;

  INSERT INTO public.fato_tarefa_kanban (
    workspace_id, titulo, descricao, status, prioridade,
    categoria_id, responsavel_id, dt_prazo, created_by
  ) VALUES (
    p_workspace_id, trim(p_titulo), p_descricao, p_status, p_prioridade,
    p_categoria_id, p_responsavel_id, p_dt_prazo, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

-- Atualizar tarefa
CREATE OR REPLACE FUNCTION public.rpc_atualizar_tarefa_kanban(
  p_tarefa_id      UUID,
  p_workspace_id   UUID,
  p_titulo         TEXT,
  p_descricao      TEXT        DEFAULT NULL,
  p_status         TEXT        DEFAULT 'A_FAZER',
  p_prioridade     TEXT        DEFAULT 'MEDIA',
  p_categoria_id   UUID        DEFAULT NULL,
  p_responsavel_id UUID        DEFAULT NULL,
  p_dt_prazo       TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'Acesso negado ao workspace.';
  END IF;

  UPDATE public.fato_tarefa_kanban
  SET
    titulo         = trim(p_titulo),
    descricao      = p_descricao,
    status         = p_status,
    prioridade     = p_prioridade,
    categoria_id   = p_categoria_id,
    responsavel_id = p_responsavel_id,
    dt_prazo       = p_dt_prazo,
    dt_conclusao   = CASE
                       WHEN p_status = 'CONCLUIDO' AND dt_conclusao IS NULL THEN NOW()
                       ELSE dt_conclusao
                     END
  WHERE id = p_tarefa_id
    AND workspace_id = p_workspace_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Alterar status da tarefa
CREATE OR REPLACE FUNCTION public.rpc_alterar_status_tarefa_kanban(
  p_tarefa_id    UUID,
  p_workspace_id UUID,
  p_status       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'Acesso negado ao workspace.';
  END IF;

  UPDATE public.fato_tarefa_kanban
  SET
    status       = p_status,
    dt_conclusao = CASE
                     WHEN p_status = 'CONCLUIDO' AND dt_conclusao IS NULL THEN NOW()
                     ELSE dt_conclusao
                   END
  WHERE id = p_tarefa_id
    AND workspace_id = p_workspace_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Excluir tarefa (soft delete)
CREATE OR REPLACE FUNCTION public.rpc_excluir_tarefa_kanban(
  p_tarefa_id    UUID,
  p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fn_usuario_membro_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'Acesso negado ao workspace.';
  END IF;

  UPDATE public.fato_tarefa_kanban
  SET deleted_at = NOW()
  WHERE id = p_tarefa_id
    AND workspace_id = p_workspace_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMIT;
