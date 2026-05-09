create table public.dim_versao_aplicacao (
  id uuid primary key default gen_random_uuid(),
  cd_versao text not null,
  ds_versao text null,
  fl_versao_atual boolean not null default false,
  fl_bloqueia_versoes_antigas boolean not null default true,
  dt_publicacao timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_dim_versao_aplicacao_cd_versao unique (cd_versao)
);

create unique index uq_dim_versao_aplicacao_atual
  on public.dim_versao_aplicacao (fl_versao_atual)
  where fl_versao_atual = true;

insert into public.dim_versao_aplicacao (
  cd_versao,
  ds_versao,
  fl_versao_atual,
  fl_bloqueia_versoes_antigas
)
values (
  '20260508.001',
  'Versão inicial do DuoCal',
  true,
  true
);

create or replace function public.fn_validar_versao_requisicao()
returns void
language plpgsql
security definer
stable
set search_path = public, auth, extensions
as $$
declare
  v_headers_text text;
  v_headers jsonb := '{}'::jsonb;
  v_versao_cliente text;
  v_versao_atual record;
begin
  if auth.role() = 'service_role' then
    return;
  end if;

  v_headers_text := current_setting('request.headers', true);

  if v_headers_text is not null and v_headers_text <> '' then
    begin
      v_headers := v_headers_text::jsonb;
    exception
      when others then
        v_headers := '{}'::jsonb;
    end;
  end if;

  v_versao_cliente := nullif(v_headers ->> 'x-duocal-version', '');

  select v.cd_versao,
         v.fl_bloqueia_versoes_antigas
  into v_versao_atual
  from public.dim_versao_aplicacao v
  where v.fl_versao_atual = true
  order by v.dt_publicacao desc
  limit 1;

  if v_versao_atual.cd_versao is null then
    raise exception 'VERSAO_APLICACAO_NAO_CONFIGURADA'
      using errcode = 'P0001';
  end if;

  if v_versao_cliente is null then
    raise exception 'Sua versão do DuoCal está desatualizada. Atualize o aplicativo para continuar.'
      using
        errcode = 'P0001',
        detail = 'VERSAO_CLIENTE_OBSOLETA';
  end if;

  if v_versao_atual.fl_bloqueia_versoes_antigas
     and v_versao_cliente <> v_versao_atual.cd_versao then
    raise exception 'Sua versão do DuoCal está desatualizada. Atualize o aplicativo para continuar.'
      using
        errcode = 'P0001',
        detail = 'VERSAO_CLIENTE_OBSOLETA';
  end if;
end;
$$;

comment on function public.fn_validar_versao_requisicao() is
  'Preparada para pgrst.db_pre_request. Em Supabase/PostgREST, validar no ambiente e configurar como public.fn_validar_versao_requisicao para exigir o header x-duocal-version nas chamadas REST/RPC.';

alter table public.dim_versao_aplicacao enable row level security;

grant select on public.dim_versao_aplicacao to authenticated;

create policy pol_dim_versao_aplicacao_select_atual
on public.dim_versao_aplicacao
for select
to authenticated
using (fl_versao_atual = true);

revoke all on function public.fn_validar_versao_requisicao() from public;
grant execute on function public.fn_validar_versao_requisicao() to authenticated;
