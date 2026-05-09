create or replace function public.fn_usuario_atual_id()
returns uuid
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select u.id
  from public.dim_usuario u
  where u.auth_user_id = auth.uid()
    and u.fl_ativo = true
  limit 1;
$$;

create or replace function public.fn_usuario_membro_workspace(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select exists (
    select 1
    from public.rel_workspace_usuario r
    join public.dim_workspace w on w.id = r.workspace_id
    where r.workspace_id = p_workspace_id
      and r.usuario_id = public.fn_usuario_atual_id()
      and r.fl_ativo = true
      and w.fl_ativo = true
  );
$$;

create or replace function public.fn_usuario_admin_workspace(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select exists (
    select 1
    from public.rel_workspace_usuario r
    join public.dim_workspace w on w.id = r.workspace_id
    where r.workspace_id = p_workspace_id
      and r.usuario_id = public.fn_usuario_atual_id()
      and r.tp_papel = 'ADMIN'
      and r.fl_ativo = true
      and w.fl_ativo = true
  );
$$;

alter table public.dim_usuario enable row level security;
alter table public.dim_workspace enable row level security;
alter table public.rel_workspace_usuario enable row level security;
alter table public.cfg_workspace enable row level security;
alter table public.fato_convite_workspace enable row level security;
alter table public.aux_categoria_evento_padrao enable row level security;
alter table public.dim_categoria_evento enable row level security;
alter table public.fato_evento enable row level security;
alter table public.rel_evento_usuario enable row level security;
alter table public.dim_recorrencia_evento enable row level security;
alter table public.fato_notificacao enable row level security;

grant usage on schema public to authenticated;

grant select, insert, update on public.dim_usuario to authenticated;
grant select, update on public.dim_workspace to authenticated;
grant select, insert, update on public.rel_workspace_usuario to authenticated;
grant select, insert, update on public.cfg_workspace to authenticated;
grant select on public.fato_convite_workspace to authenticated;
grant select on public.aux_categoria_evento_padrao to authenticated;
grant select, insert, update on public.dim_categoria_evento to authenticated;
grant select, insert, update on public.fato_evento to authenticated;
grant select, insert, update, delete on public.rel_evento_usuario to authenticated;
grant select, insert, update, delete on public.dim_recorrencia_evento to authenticated;
grant select on public.fato_notificacao to authenticated;
grant update (fl_lida, dt_lida) on public.fato_notificacao to authenticated;

create policy pol_dim_usuario_select_proprio
on public.dim_usuario
for select
to authenticated
using (auth_user_id = auth.uid());

create policy pol_dim_usuario_insert_proprio
on public.dim_usuario
for insert
to authenticated
with check (
  auth.uid() is not null
  and auth_user_id = auth.uid()
);

create policy pol_dim_usuario_update_proprio
on public.dim_usuario
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy pol_dim_workspace_select_membro
on public.dim_workspace
for select
to authenticated
using (public.fn_usuario_membro_workspace(id));

create policy pol_dim_workspace_update_admin
on public.dim_workspace
for update
to authenticated
using (public.fn_usuario_admin_workspace(id))
with check (public.fn_usuario_admin_workspace(id));

create policy pol_rel_workspace_usuario_select_membro
on public.rel_workspace_usuario
for select
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_rel_workspace_usuario_insert_admin
on public.rel_workspace_usuario
for insert
to authenticated
with check (public.fn_usuario_admin_workspace(workspace_id));

create policy pol_rel_workspace_usuario_update_admin
on public.rel_workspace_usuario
for update
to authenticated
using (public.fn_usuario_admin_workspace(workspace_id))
with check (public.fn_usuario_admin_workspace(workspace_id));

create policy pol_cfg_workspace_select_membro
on public.cfg_workspace
for select
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_cfg_workspace_insert_admin
on public.cfg_workspace
for insert
to authenticated
with check (public.fn_usuario_admin_workspace(workspace_id));

create policy pol_cfg_workspace_update_admin
on public.cfg_workspace
for update
to authenticated
using (public.fn_usuario_admin_workspace(workspace_id))
with check (public.fn_usuario_admin_workspace(workspace_id));

create policy pol_fato_convite_workspace_select_participante
on public.fato_convite_workspace
for select
to authenticated
using (
  usuario_origem_id = public.fn_usuario_atual_id()
  or usuario_destino_id = public.fn_usuario_atual_id()
);

create policy pol_aux_categoria_evento_padrao_select_autenticado
on public.aux_categoria_evento_padrao
for select
to authenticated
using (auth.uid() is not null);

create policy pol_dim_categoria_evento_select_membro
on public.dim_categoria_evento
for select
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_dim_categoria_evento_insert_membro
on public.dim_categoria_evento
for insert
to authenticated
with check (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_dim_categoria_evento_update_membro
on public.dim_categoria_evento
for update
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id))
with check (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_fato_evento_select_membro
on public.fato_evento
for select
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_fato_evento_insert_membro
on public.fato_evento
for insert
to authenticated
with check (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_fato_evento_update_membro
on public.fato_evento
for update
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id))
with check (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_rel_evento_usuario_select_membro
on public.rel_evento_usuario
for select
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_rel_evento_usuario_insert_membro
on public.rel_evento_usuario
for insert
to authenticated
with check (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_rel_evento_usuario_update_membro
on public.rel_evento_usuario
for update
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id))
with check (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_rel_evento_usuario_delete_membro
on public.rel_evento_usuario
for delete
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_dim_recorrencia_evento_select_membro
on public.dim_recorrencia_evento
for select
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_dim_recorrencia_evento_insert_membro
on public.dim_recorrencia_evento
for insert
to authenticated
with check (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_dim_recorrencia_evento_update_membro
on public.dim_recorrencia_evento
for update
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id))
with check (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_dim_recorrencia_evento_delete_membro
on public.dim_recorrencia_evento
for delete
to authenticated
using (public.fn_usuario_membro_workspace(workspace_id));

create policy pol_fato_notificacao_select_destino_ou_admin
on public.fato_notificacao
for select
to authenticated
using (
  usuario_destino_id = public.fn_usuario_atual_id()
  or public.fn_usuario_admin_workspace(workspace_id)
);

create policy pol_fato_notificacao_update_destino
on public.fato_notificacao
for update
to authenticated
using (usuario_destino_id = public.fn_usuario_atual_id())
with check (usuario_destino_id = public.fn_usuario_atual_id());

revoke all on function public.fn_usuario_atual_id() from public;
revoke all on function public.fn_usuario_membro_workspace(uuid) from public;
revoke all on function public.fn_usuario_admin_workspace(uuid) from public;

grant execute on function public.fn_usuario_atual_id() to authenticated;
grant execute on function public.fn_usuario_membro_workspace(uuid) to authenticated;
grant execute on function public.fn_usuario_admin_workspace(uuid) to authenticated;
