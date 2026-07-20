# AP HQ (Buitelyn Admin) — Design

**Date:** 2026-07-20
**Status:** Approved (grilling session with Piet; AP's brief quoted in repo history)
**Reference apps:** onemanband (workspace pattern), PietHQ (Telegram agent pattern), nuuspod (Gemini transcription + ElevenLabs)

## Goal

A private small-business dashboard for André-Pierre du Plessis: one login, five
switchable workspaces, six modules, and a Telegram agent. "Almost a workspace
like onemanband, but more streamlined."

## Locked decisions (from grilling)

- **Shape:** new `admin/` Next.js app inside the buitelyn repo; own Vercel project (private URL); public site untouched.
- **Auth:** AP ONLY. Supabase magic-link, email allowlist of one (Piet debugs via Supabase dashboard / service key, not a login).
- **Workspaces (5):** Buitelyn (formats: Nuusbrief, YouTube-show) · Ei-Aai · Die Tweede Trump · African Future News Academy (AFNA) · Promenader. Uniform module set per workspace; small per-workspace accent colour in UI.
- **Skedule = content pipeline:** recurring rules generate cards with due datetimes; stages **Beplan → In produksie → Gereed → Gepubliseer** (+ Gemis for lapsed). Seed rules: Buitelyn Nuusbrief weekdae 09:00; Buitelyn YouTube weekdae 12:00; Ei-Aai Maandae; Die Tweede Trump Vrydae (times for the last two: AP to confirm; default 09:00).
- **Idees:** global quick-add (title, note/link, workspace tag, format tag for Buitelyn); filterable; promote-to-pipeline-card in one click. Telegram is the second capture channel (below).
- **Kliënte & fakture:** per-workspace clients; invoices = line items, ZAR, per-entity numbering (`BUI-`, `EIA-`, `TWT-`, `AFNA-`, `PRO-` + year + seq), entity-branded PDF, email via Resend, statuses **Konsep → Gestuur → Betaal** (manual mark-paid). No VAT engine, no payment links, no ledger in v1.
- **Stories (Promenader):** intake list — title, source/contact, notes, links, file attachments (Supabase storage), status **Nuut → Oorweeg → In produksie → Afgehandel/Afgekeur**.
- **Nuusbrief → Oudio (Buitelyn):** list recent Substack posts via the existing RSS parser (`web/lib/feed.ts` logic, full `content:encoded`), pick one, edit text in a textarea, generate MP3 via ElevenLabs (voice: AP to choose; different from nuuspod), store in Supabase storage with download button. History of generated episodes.
- **Telegram-agent:** dedicated BotFather bot, locked to AP's Telegram user ID. Voicenote → Gemini transcription (Afrikaans) → agent. Text → agent. Agent = Claude (claude-sonnet-5) with tool-calling, narrow v1 toolset: `stoor_idee`, `skep_faktuur_konsep`, `lys_vandag`, `lys_onbetaal`, `merk_gepubliseer`. Idea filing offers inline workspace buttons; unfiled → "Inkassie". **Invoices: agent only drafts; sending requires explicit inline-button confirm.** Voicenote audio stored and linked on the idea.
- **Dashboard home "Vandag":** cross-workspace — due today, overdue, unpaid invoices, newest ideas, Inkassie count.
- **UI:** Afrikaans; Buitelyn paper/ink editorial system (League Spartan, flat, square, hairlines) with shadcn components; per-workspace accent.

## Out of scope v1

Payment links/gateways, VAT calculations, WhatsApp capture, AFNA
journalist-CRM or course tooling (AFNA = standard workspace + Skool link
card), multi-user/roles, auto-publish of audio, accounting/ledger.

## Architecture

- `admin/` Next.js App Router + Tailwind v4 + shadcn; deployed as Vercel project `ap-hq` (or similar), NOT linked to the public site's project.
- **Supabase** (new dedicated project): Postgres + Auth (magic link) + Storage (buckets: `stories`, `voicenotes`, `audio-episodes`, `invoice-pdfs`). RLS: single-user policies (authenticated user's email must equal allowlisted email); service-role key used by webhook/cron routes.
- **Routes:** app pages per module; API routes: `/api/telegram` (webhook, verified via secret path token), `/api/audio/generate` (ElevenLabs), `/api/invoices/[id]/send` (Resend + PDF), `/api/cron/generate-cards` (Vercel cron, daily 05:00 SAST — materialises pipeline cards from recurring rules).
- **PDF:** `@react-pdf/renderer` server-side.
- **Transcription:** Gemini API (existing key/pattern from nuuspod).
- **Agent:** Claude API tool-use loop inside the Telegram webhook route; tools call the same server actions the UI uses.

## Data model (tables)

- `workspaces` (id, slug, naam, accent, invoice_prefix) — seeded 5 rows.
- `formats` (id, workspace_id, naam) — seeded: Nuusbrief, YouTube (Buitelyn).
- `recurring_rules` (id, workspace_id, format_id?, naam, rrule text, tyd, aktief).
- `cards` (id, workspace_id, format_id?, titel, status beplan|produksie|gereed|gepubliseer|gemis, due_at, idea_id?, notas).
- `ideas` (id, workspace_id nullable ⇒ Inkassie, format_id?, titel, nota, bron in_app|telegram_stem|telegram_teks, voicenote_path?, geskep_at).
- `clients` (id, workspace_id, naam, epos, kontak, adres).
- `invoices` (id, workspace_id, client_id, nommer, status konsep|gestuur|betaal, uitgereik_op, betaal_op?, notas, pdf_path?).
- `invoice_lines` (id, invoice_id, beskrywing, aantal, eenheidsprys_sent int).
- `stories` (id, titel, bron_naam, bron_kontak, notas, status, geskep_at) + `story_files` (id, story_id, path, naam).
- `audio_episodes` (id, bron_url, titel, teks, voice_id, mp3_path, geskep_at).
- `entity_settings` (workspace_id, bank_besonderhede, faktuur_epos_from, logo_path?) — filled as AP supplies.
- `telegram_state` (chat_id, pending_action jsonb) — for confirm-button flows.

## Open items (AP must supply; none block the build)

1. Banking details per entity; VAT registered ja/nee.
2. Invoice sending domain/email (verify in Resend — not aitsa.tech).
3. ElevenLabs voice choice for nuusbrief-oudio.
4. Login email; Telegram: tap Start on the bot (captures his user ID).
5. Publish times for Ei-Aai (Maandae) and Tweede Trump (Vrydae); confirm pipeline stage names.
6. AFNA Skool.com community URL.

## Verification

Per milestone: vitest unit tests on pure logic (invoice numbering, rrule
card generation, feed pickup); real-browser screenshots desktop+mobile per
module; Telegram flows tested end-to-end with a real bot in a test chat;
invoice PDF eyeballed; final: AP walkthrough.

## Milestones

- **M0** Scaffold: admin app, Supabase project, auth allowlist, workspace shell + switcher, Vandag skeleton, deploy (private).
- **M1** Pipeline: tables, seed rules, daily card cron, board UI, Vandag wired.
- **M2** Idees: quick-add, list/filter, promote-to-card.
- **M3** Kliënte & Fakture: CRUD, numbering, PDF, Resend send, statuses.
- **M4** Stories (Promenader) + attachments.
- **M5** Nuusbrief → Oudio (feed pick, ElevenLabs, storage).
- **M6** Telegram-agent: webhook, Gemini voicenotes, Claude tool loop, inline-button filing + invoice confirm flow.
