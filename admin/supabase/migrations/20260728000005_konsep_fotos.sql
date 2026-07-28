-- Nuusbrief-foto's: gpt-image-genererde beelde per dag, publiek bedien
-- sodat AP hulle direk kan aflaai/insleep.
insert into storage.buckets (id, name, public) values ('konsep-fotos', 'konsep-fotos', true)
on conflict (id) do nothing;
