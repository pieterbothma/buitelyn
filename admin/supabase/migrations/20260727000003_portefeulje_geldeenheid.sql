-- Koopprys kan in 'n ander geldeenheid aangegee word; waardes word live
-- na rand omgereken op die blad.
alter table portefeuljes add column geldeenheid text not null default 'ZAR';
