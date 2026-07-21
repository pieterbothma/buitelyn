-- Client company/registration details + per-workspace logo storage.
alter table clients
  add column if not exists maatskappy text,
  add column if not exists reg_nr text,
  add column if not exists btw_nr text;

insert into storage.buckets (id, name, public) values ('logos', 'logos', false)
on conflict (id) do nothing;
