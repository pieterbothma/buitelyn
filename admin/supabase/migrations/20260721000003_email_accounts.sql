create table email_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id text unique not null,
  provider text,
  epos text,
  geskep_at timestamptz not null default now()
);

alter table email_accounts enable row level security;
create policy email_accounts_allowlist on email_accounts
  for all to authenticated using (is_allowlisted()) with check (is_allowlisted());
