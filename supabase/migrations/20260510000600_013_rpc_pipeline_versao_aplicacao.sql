-- RPCs administrativas para versionamento automatico de producao via CI.

create or replace function public.fn_requisicao_service_role()
returns boolean
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  v_claims_text text;
  v_claims jsonb;
begin
  if auth.role() = 'service_role' then
    return true;
  end if;

  v_claims_text := current_setting('request.jwt.claims', true);

  if v_claims_text is null or trim(v_claims_text) = '' then
    return false;
  end if;

  begin
    v_claims := v_claims_text::jsonb;
  exception
    when others then
      return false;
  end;

  return coalesce(v_claims ->> 'role', '') = 'service_role';
end;
$$;

create or replace function public.rpc_reservar_versao_aplicacao(
  p_ds_versao text default null
)
returns table (
  cd_versao text,
  ds_versao text,
  fl_versao_atual boolean,
  fl_bloqueia_versoes_antigas boolean,
  dt_publicacao timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_data text;
  v_sequencial int;
  v_cd_versao text;
begin
  if not public.fn_requisicao_service_role() then
    raise exception 'ACESSO_NEGADO_ADMIN';
  end if;

  v_data := to_char(timezone('America/Sao_Paulo', now()), 'YYYYMMDD');

  perform pg_advisory_xact_lock(hashtext('duocal_version_' || v_data)::bigint);

  select coalesce(max(split_part(v.cd_versao, '.', 2)::int), 0) + 1
    into v_sequencial
  from public.dim_versao_aplicacao v
  where v.cd_versao ~ ('^' || v_data || '\.[0-9]{3}$');

  if v_sequencial > 999 then
    raise exception 'LIMITE_VERSAO_DIARIA_ATINGIDO';
  end if;

  v_cd_versao := v_data || '.' || lpad(v_sequencial::text, 3, '0');

  insert into public.dim_versao_aplicacao (
    cd_versao,
    ds_versao,
    fl_versao_atual,
    fl_bloqueia_versoes_antigas,
    dt_publicacao
  )
  values (
    v_cd_versao,
    nullif(trim(p_ds_versao), ''),
    false,
    true,
    now()
  );

  return query
  select
    v.cd_versao,
    v.ds_versao,
    v.fl_versao_atual,
    v.fl_bloqueia_versoes_antigas,
    v.dt_publicacao
  from public.dim_versao_aplicacao v
  where v.cd_versao = v_cd_versao;
end;
$$;

create or replace function public.rpc_ativar_versao_aplicacao(
  p_cd_versao text,
  p_ds_versao text default null,
  p_fl_bloqueia_versoes_antigas boolean default true
)
returns table (
  cd_versao text,
  ds_versao text,
  fl_versao_atual boolean,
  fl_bloqueia_versoes_antigas boolean,
  dt_publicacao timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cd_versao text;
begin
  if not public.fn_requisicao_service_role() then
    raise exception 'ACESSO_NEGADO_ADMIN';
  end if;

  v_cd_versao := nullif(trim(p_cd_versao), '');

  if v_cd_versao is null then
    raise exception 'VERSAO_INVALIDA';
  end if;

  if not exists (
    select 1
    from public.dim_versao_aplicacao v
    where v.cd_versao = v_cd_versao
  ) then
    raise exception 'VERSAO_NAO_RESERVADA';
  end if;

  update public.dim_versao_aplicacao as v
  set fl_versao_atual = false
  where v.fl_versao_atual = true;

  update public.dim_versao_aplicacao as v
  set
    ds_versao = coalesce(nullif(trim(p_ds_versao), ''), v.ds_versao),
    fl_versao_atual = true,
    fl_bloqueia_versoes_antigas = coalesce(p_fl_bloqueia_versoes_antigas, true),
    dt_publicacao = now()
  where v.cd_versao = v_cd_versao;

  return query
  select
    v.cd_versao,
    v.ds_versao,
    v.fl_versao_atual,
    v.fl_bloqueia_versoes_antigas,
    v.dt_publicacao
  from public.dim_versao_aplicacao v
  where v.cd_versao = v_cd_versao;
end;
$$;

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
  if public.fn_requisicao_service_role() then
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

revoke all on function public.fn_requisicao_service_role() from public, anon, authenticated;
revoke all on function public.rpc_reservar_versao_aplicacao(text) from public, anon, authenticated;
revoke all on function public.rpc_ativar_versao_aplicacao(text, text, boolean) from public, anon, authenticated;

grant execute on function public.fn_requisicao_service_role() to service_role;
grant execute on function public.rpc_reservar_versao_aplicacao(text) to service_role;
grant execute on function public.rpc_ativar_versao_aplicacao(text, text, boolean) to service_role;

grant execute on function public.fn_validar_versao_requisicao() to authenticated, service_role;
