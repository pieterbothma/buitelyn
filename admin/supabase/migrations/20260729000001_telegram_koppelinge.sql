-- Telegram-koppelinge: een ry per gebruiker; chat_id word deur die webhook
-- (service role) gestel wanneer die koppel-kode by die bot opdaag.
create table if not exists public.telegram_koppelinge (
  user_id uuid primary key references auth.users (id) on delete cascade,
  chat_id bigint unique,
  koppel_kode text unique,
  kode_verval timestamptz,
  oggend boolean not null default true,
  middag boolean not null default false,
  aand boolean not null default true,
  skuiwers boolean not null default true,
  geskep_at timestamptz not null default now(),
  gekoppel_at timestamptz
);

alter table public.telegram_koppelinge enable row level security;

create policy telegram_koppelinge_eie on public.telegram_koppelinge
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
