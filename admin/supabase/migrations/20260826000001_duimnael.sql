-- Duimnaels: KI-agtergronde en klaar duimnaels, publiek bedien sodat satori
-- hulle by render-tyd kan haal en AP hulle direk kan aflaai.
insert into storage.buckets (id, name, public) values ('duimnael', 'duimnael', true)
on conflict (id) do nothing;

-- Die reaksie-biblioteek: deursigtige PNG-uitknipsels van AP. Apart van
-- 'duimnael' omdat dit langlewend is — dit word gesaai, nie per episode
-- weggegooi nie.
insert into storage.buckets (id, name, public) values ('duimnael-reaksies', 'duimnael-reaksies', true)
on conflict (id) do nothing;
