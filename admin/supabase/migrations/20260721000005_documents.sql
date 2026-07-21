-- Per-workspace document space: virtual folders + files. Sent invoices are
-- auto-filed into the "Fakture" folder (rows point at their source bucket).
create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  vouer text not null default 'Algemeen',
  naam text not null,
  bucket text not null default 'dokumente',
  path text not null,
  geskep_at timestamptz not null default now()
);
create index documents_ws_vouer_idx on documents (workspace_id, vouer, geskep_at desc);

alter table documents enable row level security;
create policy documents_allowlist on documents
  for all to authenticated using (is_allowlisted()) with check (is_allowlisted());

insert into storage.buckets (id, name, public) values ('dokumente', 'dokumente', false)
on conflict (id) do nothing;
