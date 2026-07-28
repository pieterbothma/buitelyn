-- E-pos is privaat korrespondensie: koppel elke rekening aan die gebruiker
-- wat dit gekoppel het, en laat net dié gebruiker dit sien/ontkoppel.
-- (Ander HQ-tabelle bly gedeel onder die allowlist — dit is besigheidsdata.)
alter table email_accounts add column user_id uuid references auth.users(id) on delete cascade;

-- Bestaande rekening(e) behoort aan AP (apduplessis@gmail.com)
update email_accounts set user_id = 'f967d8cb-20fd-46ea-ae24-26b0748ccc22' where user_id is null;

drop policy email_accounts_allowlist on email_accounts;
create policy email_accounts_eie on email_accounts
  for all to authenticated
  using (is_allowlisted() and user_id = auth.uid())
  with check (is_allowlisted() and user_id = auth.uid());
