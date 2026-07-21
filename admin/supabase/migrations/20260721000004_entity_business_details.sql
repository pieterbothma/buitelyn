-- The workspace's OWN business identity (appears on invoices) + terms.
alter table entity_settings
  add column if not exists maatskappy text,
  add column if not exists reg_nr text,
  add column if not exists btw_nr text,
  add column if not exists adres text,
  add column if not exists terme text;
