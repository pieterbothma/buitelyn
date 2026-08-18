-- Die verwerkte oudio-skrip — die een met ElevenLabs se v3-etikette soos
-- [energetic] en [sighs] — hoort by die dag se oorsig, maar het tot nou net
-- in React-toestand geleef. 'n Herlaai of 'n datumwissel het AP se handgestelde
-- etikette weggegooi, en die enigste pad terug was om "Verwerk teks vir audio"
-- weer te druk, wat Gemini van vooraf laat skryf en die fyn werk uitvee.
--
-- Nullable, want nie elke dag se oorsig word in oudio omgesit nie.
alter table public.studio_oorsigte add column if not exists oudio_teks text;
