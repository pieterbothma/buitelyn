-- Private buckets; access via authenticated allowlisted user or service role.
insert into storage.buckets (id, name, public) values
  ('stories', 'stories', false),
  ('voicenotes', 'voicenotes', false),
  ('audio-episodes', 'audio-episodes', false),
  ('invoice-pdfs', 'invoice-pdfs', false)
on conflict (id) do nothing;

create policy "allowlist read" on storage.objects
  for select to authenticated using (is_allowlisted());
create policy "allowlist write" on storage.objects
  for insert to authenticated with check (is_allowlisted());
create policy "allowlist update" on storage.objects
  for update to authenticated using (is_allowlisted());
create policy "allowlist delete" on storage.objects
  for delete to authenticated using (is_allowlisted());
