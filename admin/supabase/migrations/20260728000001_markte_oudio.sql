-- Daaglikse oudiobriefing: publieke bucket vir die MP3 + URL op die oorsig.
insert into storage.buckets (id, name, public) values ('markte-oudio', 'markte-oudio', true)
on conflict (id) do nothing;

alter table markte_oorsigte add column oudio_url text;
