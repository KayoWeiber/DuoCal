create table public.aux_categoria_evento_padrao (
  id uuid primary key default gen_random_uuid(),
  nm_categoria text not null,
  cd_cor text not null,
  cd_icone text null,
  nr_ordem int not null,
  fl_ativo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint uq_aux_categoria_evento_padrao_nome unique (nm_categoria),
  constraint uq_aux_categoria_evento_padrao_ordem unique (nr_ordem),
  constraint chk_aux_categoria_evento_padrao_cor check (cd_cor ~ '^#[0-9A-Fa-f]{6}$')
);

insert into public.aux_categoria_evento_padrao (
  nm_categoria,
  cd_cor,
  cd_icone,
  nr_ordem
)
values
  ('Trabalho', '#2563EB', 'briefcase', 10),
  ('Faculdade', '#7C3AED', 'graduation-cap', 20),
  ('Casal', '#DB2777', 'heart', 30),
  ('Saúde', '#16A34A', 'heart-pulse', 40),
  ('Finanças', '#CA8A04', 'wallet', 50),
  ('Casa', '#EA580C', 'home', 60);

create table public.dim_categoria_evento (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  nm_categoria text not null,
  cd_cor text not null,
  cd_icone text null,
  fl_padrao boolean not null default false,
  fl_ativo boolean not null default true,
  criado_por uuid null references public.dim_usuario(id),
  atualizado_por uuid null references public.dim_usuario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_dim_categoria_evento_workspace_nome unique (workspace_id, nm_categoria),
  constraint uq_dim_categoria_evento_id_workspace unique (id, workspace_id),
  constraint chk_dim_categoria_evento_cor check (cd_cor ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.fato_evento (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  categoria_id uuid null,
  nm_evento text not null,
  ds_evento text null,
  dt_inicio timestamptz not null,
  dt_fim timestamptz not null,
  fl_dia_todo boolean not null default false,
  fl_bloqueia_horario boolean not null default true,
  fl_recorrente boolean not null default false,
  tp_status text not null default 'ATIVO',
  criado_por uuid null references public.dim_usuario(id),
  atualizado_por uuid null references public.dim_usuario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_fato_evento_id_workspace unique (id, workspace_id),
  constraint fk_fato_evento_categoria_workspace
    foreign key (categoria_id, workspace_id)
    references public.dim_categoria_evento(id, workspace_id),
  constraint chk_fato_evento_periodo check (dt_fim > dt_inicio),
  constraint chk_fato_evento_status
    check (tp_status in ('ATIVO', 'CANCELADO', 'CONCLUIDO'))
);

create table public.rel_evento_usuario (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  evento_id uuid not null,
  usuario_id uuid not null references public.dim_usuario(id) on delete cascade,
  tp_participacao text not null default 'PARTICIPANTE',
  fl_responsavel_principal boolean not null default false,
  created_at timestamptz not null default now(),
  constraint fk_rel_evento_usuario_evento_workspace
    foreign key (evento_id, workspace_id)
    references public.fato_evento(id, workspace_id)
    on delete cascade,
  constraint fk_rel_evento_usuario_membro_workspace
    foreign key (workspace_id, usuario_id)
    references public.rel_workspace_usuario(workspace_id, usuario_id)
    on delete cascade,
  constraint uq_rel_evento_usuario_evento_usuario unique (evento_id, usuario_id),
  constraint chk_rel_evento_usuario_participacao
    check (tp_participacao in ('RESPONSAVEL', 'PARTICIPANTE', 'CASAL'))
);

create table public.dim_recorrencia_evento (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  evento_id uuid not null,
  tp_frequencia text not null,
  intervalo int not null default 1,
  dias_semana int[] null,
  dt_fim_recorrencia date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_dim_recorrencia_evento_evento_workspace
    foreign key (evento_id, workspace_id)
    references public.fato_evento(id, workspace_id)
    on delete cascade,
  constraint uq_dim_recorrencia_evento_evento unique (evento_id),
  constraint chk_dim_recorrencia_evento_frequencia
    check (tp_frequencia in ('DIARIA', 'SEMANAL', 'MENSAL')),
  constraint chk_dim_recorrencia_evento_intervalo check (intervalo > 0),
  constraint chk_dim_recorrencia_evento_dias_semana
    check (dias_semana is null or dias_semana <@ array[0, 1, 2, 3, 4, 5, 6])
);

create table public.fato_notificacao (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dim_workspace(id) on delete cascade,
  usuario_destino_id uuid not null references public.dim_usuario(id) on delete cascade,
  tp_notificacao text not null,
  nm_titulo text not null,
  ds_mensagem text not null,
  tp_entidade text null,
  entidade_id uuid null,
  fl_lida boolean not null default false,
  dt_lida timestamptz null,
  dt_agendada timestamptz null,
  dt_enviada timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_fato_notificacao_membro_workspace
    foreign key (workspace_id, usuario_destino_id)
    references public.rel_workspace_usuario(workspace_id, usuario_id)
    on delete cascade,
  constraint chk_fato_notificacao_tipo
    check (
      tp_notificacao in (
        'EVENTO_CRIADO',
        'EVENTO_ALTERADO',
        'EVENTO_CANCELADO',
        'TAREFA_CRIADA',
        'TAREFA_ALTERADA',
        'CONVITE_WORKSPACE',
        'LEMBRETE_EVENTO',
        'SISTEMA'
      )
    )
);

create trigger trg_dim_categoria_evento_set_updated_at
before update on public.dim_categoria_evento
for each row
execute function public.fn_set_updated_at();

create trigger trg_fato_evento_set_updated_at
before update on public.fato_evento
for each row
execute function public.fn_set_updated_at();

create trigger trg_dim_recorrencia_evento_set_updated_at
before update on public.dim_recorrencia_evento
for each row
execute function public.fn_set_updated_at();

create trigger trg_fato_notificacao_set_updated_at
before update on public.fato_notificacao
for each row
execute function public.fn_set_updated_at();

create unique index uq_rel_evento_usuario_responsavel_principal
  on public.rel_evento_usuario (evento_id)
  where fl_responsavel_principal = true;

create index idx_dim_categoria_evento_workspace_id
  on public.dim_categoria_evento (workspace_id);

create index idx_dim_categoria_evento_fl_ativo
  on public.dim_categoria_evento (fl_ativo);

create index idx_fato_evento_workspace_id
  on public.fato_evento (workspace_id);

create index idx_fato_evento_categoria_id
  on public.fato_evento (categoria_id);

create index idx_fato_evento_status
  on public.fato_evento (tp_status);

create index idx_fato_evento_dt_inicio
  on public.fato_evento (dt_inicio);

create index idx_fato_evento_dt_fim
  on public.fato_evento (dt_fim);

create index idx_fato_evento_criado_por
  on public.fato_evento (criado_por);

create index idx_rel_evento_usuario_workspace_id
  on public.rel_evento_usuario (workspace_id);

create index idx_rel_evento_usuario_evento_id
  on public.rel_evento_usuario (evento_id);

create index idx_rel_evento_usuario_usuario_id
  on public.rel_evento_usuario (usuario_id);

create index idx_dim_recorrencia_evento_workspace_id
  on public.dim_recorrencia_evento (workspace_id);

create index idx_dim_recorrencia_evento_evento_id
  on public.dim_recorrencia_evento (evento_id);

create index idx_fato_notificacao_workspace_id
  on public.fato_notificacao (workspace_id);

create index idx_fato_notificacao_usuario_destino_id
  on public.fato_notificacao (usuario_destino_id);

create index idx_fato_notificacao_tipo
  on public.fato_notificacao (tp_notificacao);

create index idx_fato_notificacao_lida
  on public.fato_notificacao (fl_lida);

create index idx_fato_notificacao_dt_agendada
  on public.fato_notificacao (dt_agendada);

create index idx_fato_notificacao_dt_enviada
  on public.fato_notificacao (dt_enviada);
