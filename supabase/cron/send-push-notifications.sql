-- Template operacional para agendar o envio de Web Push no Supabase.
-- Execute no SQL Editor depois de configurar PUSH_CRON_SECRET.
--
-- Requisitos:
--   create extension if not exists pg_cron with schema extensions;
--   create extension if not exists pg_net with schema extensions;
--   create extension if not exists supabase_vault with schema vault;
--
-- Antes de agendar, salve o segredo no Vault:
--   select vault.create_secret('SEU_PUSH_CRON_SECRET', 'duocal_push_cron_secret');
--
-- Substitua:
--   SEU_PROJECT_REF pelo project ref do Supabase.

select cron.schedule(
  'duocal-send-push-notifications',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/send-push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'duocal_push_cron_secret'
      )
    ),
    body := jsonb_build_object(
      'source', 'cron',
      'limit', 100
    )
  );
  $$
);

-- Para remover o agendamento:
-- select cron.unschedule('duocal-send-push-notifications');
