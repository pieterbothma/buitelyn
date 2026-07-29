-- Publieke /aandele-blaaie: een keer gegenereerde Afrikaanse profiel-prosa
-- (Gemini, mens-hersienbaar) + brand-styl illustrasie per aandeel.
create table if not exists public.aandeel_profiele (
  slug text primary key,
  simbool text not null,
  naam text not null,
  profiel_teks text,
  beeld_url text,
  geskep_at timestamptz not null default now(),
  opgedateer_at timestamptz not null default now()
);

alter table public.aandeel_profiele enable row level security;

insert into storage.buckets (id, name, public)
values ('aandele-beelde', 'aandele-beelde', true)
on conflict (id) do nothing;

create policy "aandele-beelde publiek" on storage.objects
  for select using (bucket_id = 'aandele-beelde');
