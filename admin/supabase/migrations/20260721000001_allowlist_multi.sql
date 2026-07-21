-- Allowlist becomes a list (Piet's two emails now; AP's appended at handover).
alter table app_config add column if not exists allowlisted_emails text[] not null default '{}';

update app_config
set allowlisted_emails = array_remove(
  array[allowlisted_email, 'piet@welovekruger.com', 'bothma.pj@gmail.com'],
  'CHANGE_ME@example.com'
);

create or replace function is_allowlisted() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (auth.jwt() ->> 'email') = any(allowlisted_emails) from app_config),
    false
  );
$$;
