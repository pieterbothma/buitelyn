# /markte — Innovasie-navorsing en produkpad

*Multi-agent navorsing (5 lense, 62 bevindings) + sintese + kritiek — 2026-07-28.*

## Visie

Buitelyn /markte word die plek waar Afrikaanssprekendes elke dag hul geld verstáán — nie net syfers sien nie. Die noordster: elke koers, grafiek en SENS-aankondiging kry 'n Afrikaanse storie in die Buitelyn-stem, en die insig kom na die gebruiker toe (e-pos, Telegram, oudio, WhatsApp) in plaas daarvan dat hy moet onthou om te kyk. Die onregverdige voordeel is nie data nie — dis Afrikaans, Suzaan en André-Pierre se persoonlikhede, en 'n reeds-betaalde KI-pyplyn; elke feature moet dié drie versterk. Show en terminal voed mekaar in 'n lus: die terminal maak die show daagliks relevant, en die show maak die terminal menslik.

## Vinnige wenne (dae se werk, bestaande boustene)

### 1. 'Hoekom beweeg dit?' + Grootste Skuiwers-bord

**Wat:** Wanneer 'n JSE-aandeel meer as ±3% beweeg, genereer een Afrikaanse paragraaf ('Sasol +6%: olieprys styg ná OPEC-besluit') met bronskakels, gewys as kaartjie op die aandeel en as kol op die sparkline. Dieselfde kas voer 'n 'Grootste Skuiwers'-bord: top-5 wenners/verloorders met KI-eenreëls.

**Hoekom dit wen:** Robinhood Cortex se gewildste feature ooit (95% tevredenheid) — dit beantwoord dié een vraag wat elke kleinbelegger by elke grafiek het, en niemand doen dit in Afrikaans nie. Dit maak die syfer 'n storie, presies Buitelyn se redaksionele DNA.

**Bou-plan:** Hergebruik die VRA BUITELYN-agent (GPT-5.4 + nuus-tools) met 'n vaste prompt; kas per ticker per dag in Supabase sodat een klik vir almal betaal; uurlikse cron doen net die top-10 skuiwers. 1–2 dae; lopende koste: ~10 KI-oproepe per uur gedurende marktyd.

### 2. @buitelyn_bot: pryswaarskuwings + /prys via Telegram en e-pos

**Wat:** Gebruiker stel drempels op dophoulys/portefeulje-items ('NPN onder R3 000', 'USD/ZAR bo R19'); 'n 15-min-cron vergelyk met die bestaande Yahoo-haal en stoot 'n Afrikaanse boodskap via Telegram en/of Resend. Die bot beantwoord ook /prys NPN en /oorsig, en koppel aan die Supabase-rekening met 'n eenmalige kode.

**Hoekom dit wen:** Die enkele sterkste terugkeer-meganisme in fintech (tot 3x hoër retensie; push-oopmaakkoerse 50–60%): die produk kontak jóú wanneer iets gebeur. Gebruiker-gestelde drempels is per definisie relevant, en die 15-min-vertraging maak vir alarms geen saak nie. Die bot-patroon is reeds twee keer gebou (BakkieBot, PietHQ).

**Bou-plan:** Nuwe Supabase-tabel alerts (user, ticker, rigting, drempel); Vercel-webhook vir die bot; 15-min-cron hergebruik die Yahoo-klient. 2 dae insluitend dophoulys-UI; lopende koste: nul (Telegram gratis, Resend vry vlak).

### 3. ~~'Luister: Vandag op die markte'~~ — GEBOU 2026-07-28 — daaglikse Afrikaanse oudiobriefing

**Wat:** Cron om 06:45: die bestaande Gemini-dagoorsig word deur ElevenLabs as 2–3 minute Afrikaanse oudio gelewer, MP3 in Supabase Storage, speelknoppie boaan /markte, dieselfde lêer na die Substack.

**Hoekom dit wen:** RSG Geldsake bewys die groot, lojale Afrikaanse geld-oudiogehoor — maar dit is 'n vaste 18:10-radioblok; Buitelyn maak dit op-aanvraag. Skrip-eers (Gemini skryf, TTS lees) vermy die WaPo-feitefout-slaggat. Geen mededinger het 'n daaglikse Afrikaanse markte-oudio nie, en dit dra die show se stem-identiteit die terminal in.

**Bou-plan:** Albei bene bestaan reeds (dagoorsig-teks + ElevenLabs-nuusbriefpatroon); net die cron, Storage-stoor en audio-speler-komponent is nuut. 4–8 ure; lopende koste: sente per dag.

### 4. ~~Persoonlike oggend-e-pos~~ — GESKRAP (2026-07-28: Substack dek die oggend-e-pos; ons dupliseer nie AP se nuusbrief nie): 'Jou Markte-oggendpos'

**Wat:** Opt-in cron om 07:00 per gebruiker: (1) die dagoorsig, (2) jou portefeulje-P/L sedert gister ('Jou portefeulje is R1 240 op'), (3) dophoulys-skuiwe, (4) top-3 nuusopskrifte oor jóú aandele — via Resend vanaf die geverifieerde buitelyn.com-domein. Later dieselfde templaat as Sondag-weekverslag met 'n Gemini-narratief.

**Hoekom dit wen:** Die Morning Brew-les: 'n kort, persoonlike daaglikse digest kry die hoogste oopmaaksyfers in finansiële media, en gepersonaliseerde e-pos lig oopmaakkoerse tot 400%. Dit is die natuurlike voorloper van die betaalde vlak — en alles (Supabase-data, nuus-opsommings, Resend) loop reeds; dis hoofsaaklik 'n saamvoeg-cron.

**Bou-plan:** E-pos-templaat + cron wat per gebruiker portefeulje/dophoulys/nuus uit bestaande tabelle trek; opt-in-skakelaar in die profiel. 1–2 dae; Resend vry vlak dek ~3 000 e-posse/maand.

### 5. ~~Konteks-bewuste chat~~ — GEBOU 2026-07-28: 'Vra oor Sasol'-knoppies + vervolgvrae onder nuus

**Wat:** Elke aandeelkaart kry 'n knoppie wat VRA BUITELYN voorlaai met daardie ticker se kwotasie en reeks (TradingView Chart Copilot-patroon), en onder elke NUUS-opsomming genereer Gemini twee klikbare vervolgvrae ('Hoe raak dit die rand?') wat die chat oopmaak (Yahoo Scout-patroon).

**Hoekom dit wen:** Die chat bestaan reeds maar gebruikers moet dit gaan soek — hierdie twee brûe maak dit dramaties nuttiger teen amper geen bykoste en verhoog chat-gebruik sonder enige ontdekbaarheidswerk. 'Die KI weet waarna jy kyk' is die 2026-standaard.

**Bou-plan:** Stuur oop bord/ticker + portefeulje-posisies as stelselkonteks na die bestaande GPT-5.4-agent; vervolgvrae word saam met die bestaande nuus-opsomming in dieselfde Gemini-oproep gegenereer (geen ekstra oproepe). 4–6 ure.

### 6. 'Grafiek van die Dag' — een pyplyn, drie kanale

**Wat:** Die dagoorsig-cron kies outomaties die interessantste reeks (grootste beweging in rand/JSE/kripto), teken 'n statiese grafiek, en Gemini skryf drie sinne in die Buitelyn-stem ('Kern in 3'-formaat: wat gebeur het, hoekom dit saak maak, wat om dop te hou). Boaan /markte, in die Substack-konsep, en as sosiale-kaart vir die show.

**Hoekom dit wen:** Die Chartr/Morning Brew-resep: redaksionele beperking — een kurator-gekose grafiek met 'n mensetaal-storie klop 'n dashboard vol data. Dit voer die nuusbrief en sosiale media teen nul ekstra skryfwerk en trek show-kykers terminal toe.

**Bou-plan:** Uitskieter-keuse oor bestaande reeksdata + grafiek-na-PNG (die grootste stuk) + Gemini-teks in die bestaande dagoorsig-cron; Resend stuur die kaart as Substack-konsep aan die span. 1–2 dae; lopende koste: feitlik nul.


## Medium wette (1–2 weke elk)

### 1. SENS Vertaal — JSE-aankondigings in verstaanbare Afrikaans

**Wat:** Skraap die JSE SENS-voer met die bestaande lokale daemon; Gemini klassifiseer elke aankondiging (resultate / dividend / direkteurshandel / transaksie / kennisgewing) en skryf een Afrikaanse paragraaf. Filtreerbare bord op /markte, met dophoulys/portefeulje-aandele boaan en 'n kennisgewing wanneer jóú aandeel 'n aankondiging uitreik.

**Hoekom dit wen:** Moneyweb sluit SENS agter R70/mnd toe; SENS-AI bewys die appetyt vir KI-gedekodeerde aankondigings — en niemand op aarde doen dit in Afrikaans nie. Dit is 'n egte, verdedigbare onderskeidingsfeature (nie 'n fintech-kopie nie) en word later die anker van die premium-vlak. Dit voer ook Vra Buitelyn se dokument-vrae ('verduidelik hierdie handelsverklaring').

**Bou-plan:** Week 1: daemon-taak wat SENS-RSS/blad poll en rou teks in Supabase stoor; Gemini-klassifikasie+opsomming per item (gekas). Week 2: bord-UI met filters, koppeling aan dophoulys, Resend/Telegram-kennisgewing vir eie aandele. Lopende koste: sente per dag Gemini.

### 2. Aandeel-profielblaaie met 'Sleutel-oomblikke' op die grafiek

**Wat:** Dinamiese roete /markte/aandeel/NPN: groter grafiek met tydperke, sleutelstatistieke (markkap, V/W, 52-week-band, dividendopbrengs — alles gratis Yahoo quoteSummary), gefiltreerde nuus, Gemini-maatskappyprofiel (maandeliks gekas), die 'hoekom beweeg'-knoppie, én Google Finance-styl merkers: die 3–5 grootste dagbewegings in die sigbare reeks gekoppel aan nuusitems uit die reeds-gestoorde NUUS-databasis, met een Afrikaanse sin per kol.

**Hoekom dit wen:** Dit gee elke bestaande feature 'n tuiste per aandeel, maak elke naam op elke bord klikbaar, en skep die eerste Afrikaanse aandeelblaaie op die internet — SEO-verkeer wat vanself groei ('Sasol aandeelprys'). Die grafiek word 'n storie in plaas van 'n lyn.

**Bou-plan:** Week 1: Next.js dinamiese roete wat bestaande komponente (sparkline, R-omskakelaar, nuus-filter, KI-knoppie) hersaamstel + quoteSummary-statistieke. Week 2: Sleutel-oomblikke (uitskieter-deteksie op die reeks + datum-passing teen nuus-tabel + Gemini-eenreëls, gekas per ticker) en SEO-metadata. Lopende koste: feitlik nul.

### 3. Kalender-bord: verdienste en dividende in rand

**Wat:** 'n Vooruitkyk-bord: hierdie week/maand se JSE-verdiensteverklarings en dividend-LDT/betaaldatums, met jou eie aandele uitgelig en die dividend in rand beraam ('jy besit 40 SBK — LDR 15 Aug, ±R304 op 8 Sept'). Herinnering 2 dae vooraf via e-pos/Telegram; ná die aankondiging skryf Gemini die Afrikaanse opsomming (die Perplexity Earnings Hub-patroon, sonder live-oproepe).

**Hoekom dit wen:** Die enigste vooruitkyk-element op 'n andersins terugskouende terminal — beleggers wil weet wat kóm. Vir die inkomste-gefokusde SA-belegger (banke, Satrix Divi) is dividende die hoofstorie, en géén plaaslike tool personaliseer dit nie; Moneyweb wys 10 inskrywings gratis. Herinneringe oor jou eie geld is per definisie welkom — retensie-masjien.

**Bou-plan:** Week 1: brei Yahoo-klient uit met calendarEvents/dividendData, daaglikse kas-cron in Supabase, KALENDER-bord-UI. Week 2: rand-beraming uit portefeulje-posisies, herinnerings-cron deur die bestaande alert-kanale, Gemini-nota per gebeurtenis. Lopende koste: nul (selfde gratis Yahoo).

### 4. Die Daaglikse Ritueel: kwis, poll en stil streak

**Wat:** Een pakket: (1) 'Toets jou markkennis' — 3–5 meerkeusevrae per dag, deur Gemini uit die dag se NUUS-bord en dagoorsig gegenereer; (2) een daaglikse poll ('Eindig die rand dié week sterker of swakker?') waarvan die uitslag self inhoud word; (3) 'n stil '12 dae op die markte'-streepteller (NYT-styl, geen konfetti nie) met een vryfpas per maand. Antwoorde word môre saam met die dagoorsig onthul — die volgende besoek is gewaarborg.

**Hoekom dit wen:** Der Spiegel se kwis trek 900k maandelikse gebruikers; NYT se data wys nuus+speletjies is die sterkste retensiekombinasie wat bestaan. Gebruikers is reeds ingeteken (Supabase), so dit is een tabel en een cron. Die kwisvrae en Vrydag-polluitslag ('68% van Buitelyn-lesers was reg') is boonop klaarmaak-inhoud vir die show — die lus wat niemand anders het nie.

**Bou-plan:** Week 1: Supabase-tabelle (vrae, antwoorde, polls, last_checkin), daaglikse Gemini-genereer-cron, merk-teen-slotdata-cron. Week 2: UI-kaarte op /markte, streak-teller, deelbare telling-kaartjie. Lopende koste: een Gemini-oproep per dag.

### 5. Onboarding-reeks + 'terwyl jy weg was'-opvangblok

**Wat:** Definieer die eerste-waarde-oomblik (eerste dophoulys-item of portefeulje-inskrywing) en bou 5 gedrag-getriggerde Resend-e-posse oor 14 dae ('Bou jou portefeulje in 2 minute', 'Vra Buitelyn enigiets oor jou aandele'). Plus: as 'n gebruiker ná 48+ uur terugkom, wys 'n persoonlike opvangblok — portefeulje-delta sedert laaste besoek, die 3 relevantste berigte, een Gemini-paragraaf.

**Hoekom dit wen:** Swak onboarding veroorsaak 40–60% van vroeë churn; gestruktureerde onboarding verhoog retensie met tot 50%. Al die verspreidings- en gewoonte-features hierbo is nutteloos as nuwe aanmeldings nooit by die eerste waarde-oomblik uitkom nie. Alles bestaande boustene — dit is die hoogste-hefboom 'onsigbare' werk op die lys.

**Bou-plan:** Week 1: last_seen_at + onboarding-status in profiel, daaglikse cron wat gedragsvoorwaardes toets en die 5 e-posse stuur. Week 2: opvangblok-komponent (portefeulje-delta uit reeksdata + nuus-filter + Gemini-opsomming, gekas per gebruiker per dag). Lopende koste: feitlik nul.


## Groot wette (strategiese rigtings)

### 1. Buitelyn Goud — die betaalde persoonlike laag (R49–R79/mnd)

**Wat:** Gratis bly: borde, nuus, dagoorsig, chat. Betaald word alles wat persoonlik is: oggend- en week-e-pos oor jóú portefeulje, dividend-kalender in rand, kwartaal-gesondheidskontrole (GPT-5.4-waarnemings oor konsentrasie/geldeenheid-blootstelling, uitdruklik nie advies nie), Offshore-meter ('7% markgroei, 5% randverswakking'), TFSA-teller, en onbeperkte alerts. Moneyweb Insider Gold (R70/mnd) is die bewese plaaslike prysanker; die Substack-basis is die eerste verkoopkanaal.

**Hoekom dit wen:** Die patroon oral (Robinhood Gold, Google, Yahoo+): generies is gratis, persoonlik is betaald. Buitelyn sit reeds op die goue data (portefeulje, dophoulys, per-aandeel koopprys) — die premium-features is almal crons oor bestaande tabelle. Dit is die pad van hobby na besigheid sonder om 'n makelaar te word.

**Risiko:** Te vroeg 'n betaalmuur opsit vermoor groei — bou eers die gratis gewoonte-laag (wenne 1–6) en 'n paar duisend aktiewe gebruikers. Betaalintegrasie (Paystack/Payfast) en Supabase-rolbestuur is nuwe, onbekende bouwerk vir hierdie stack.

### 2. Die Afrikaanse Daily Investor — nuus en data wat inmekaarhaak

**Wat:** Bou die NUUS-bord uit tot 'n volwaardige Afrikaanse finansiële-nuusbestemming: elke storie kry 'n data-kaart (sparkline van die betrokke aandeel), SENS-vertaal voer die stroom, aandeel-profielblaaie vang die SEO-verkeer, en die 'Kern in 3'-formaat (Bloomberg se drie-kolpunt-dissipline) maak die dagoorsig skandeerbaar. Alles Gemini-gegenereer met bronskakels op elke bewering.

**Hoekom dit wen:** Daily Investor het in 2 jaar tot 2,5M lesers gegroei met kort datagedrewe stories — en daar is letterlik géén Afrikaanse ekwivalent nie (Netwerk24 Sake is agter 'n algemene betaalmuur). Buitelyn se nuuspyplyn bestaan reeds; die uitbou is inkrementeel. SEO op 'Naspers aandeelprys' in Afrikaans is 'n onbesette veld.

**Risiko:** KI-nuus op skaal vereis die Perplexity-dissipline: elke syfer terugklikbaar na 'n bron, en 'n vaste 'Data 15 min vertraag'-stempel. Een viral feitefout kan die vertroue-handelsmerk (die show!) beskadig — hou mens-in-die-lus vir alles wat gepubliseer word buite die borde.

### 3. Multikanaal-enjin: skryf een keer, publiseer oral

**Wat:** Een daaglikse pyplyn wat uit dieselfde Gemini-dagoorsig ses uitsette genereer: /markte-bord, oudiobriefing (ElevenLabs), 5-reël WhatsApp-kanaal-boodskap, Telegram-oggendstoot, Vrydag se 'Week in 5 grafieke'-Substack-konsep, en 'n 60-sek Remotion-'markminuut' vir shorts. Plus die 'Op die Show'-bord (transkripsie → tickers met tydstempels, klik en Suzaan praat oor Sasol).

**Hoekom dit wen:** WhatsApp-kanale haal 90% oopmaakkoerse en WhatsApp is dominant in SA; NYT het 12M volgelinge so gebou. Die show en die terminal voed mekaar in albei rigtings — dit is die een ding wat geen fintech kan naboots nie. Elke kanaal is 'n dun adapter oor die reeds-gefinansierde kern.

**Risiko:** Ses kanale beteken ses plekke waar 'n cron stilweg kan breek — bou monitering (die PietHQ-daemon-patroon) van dag een. WhatsApp-kanaal-API-outomatisering is die minste bekende been; begin desnoods handmatig (5 reëls plak vat 2 minute).

### 4. Buitelyn Liga — die gemeenskap met die show as prys

**Wat:** Kwartaallikse fantasie-kompetisie: elke deelnemer R100 000 denkbeeldig, JSE-aandele alleen, openbare ranglys op /markte, privaat ligas ('daag jou boekklub uit'). Die wenner word deur Suzaan op die show genoem en in die Substack-krediete gelys. Later: Morning Brew-styl verwysingsprogram (3 verwysings = vroeë toegang, 25 = shoutout op die show).

**Hoekom dit wen:** Die portefeulje-enjin bestaan reeds — die Liga is 'n vlag, 'n skermnaam en 'n rangskik-cron. EasyEquities bewys gemeenskap+gamifikasie hou SA-beleggers vas, maar hulle het geen menslike stem nie; Buitelyn se prys ('jou naam op die show') kos R0 en is vir 'n lojale gehoor meer werd as kontant. Privaat ligas is 'n ingeboude verwysingslus — die goedkoopste groeimotor wat bestaan.

**Risiko:** 'n Ranglys met 30 deelnemers lyk dood. Loods dit eers wanneer /markte 'n paar honderd weeklikse aktiewe gebruikers het, en kondig dit op die show af sodat die eerste kwartaal klaar massa het. Hou dit weg van 'handel'-taal — dis 'n spel, nie 'n makelaar nie.


## Moenie doen nie

### 1. EODHD/intydse data nou opgradeer

**Rede:** Buitelyn se gehoor is langtermynbeleggers, nie daghandelaars nie — Sharenet bedien daardie klein, prysgevoelige pro-segment reeds. 15-min-vertraagde Yahoo is genoeg vir elke feature op hierdie pad; wees eerder eerlik daaroor ('Data 15 min vertraag' as vertrouenstempel). Betaal die $19,99/mnd eers wanneer gebruikers eksplisiet oor datagehalte kla — nie vooruit nie.

### 2. Per-gebruiker vryloop-KI-podcast (Washington Post-styl)

**Rede:** WaPo se persoonlike AI-podcasts was vol feitefoute en versinde aanhalings — vrylopende twee-stem-improvisasie is 'n vertrouensrisiko wat Buitelyn se grootste bate (die show se geloofwaardigheid) direk bedreig, plus TTS-koste per gebruiker per dag. Hou oudio streng skrip-eers en gedeeld (een dagbriefing vir almal); 'n persoonlike 'Jou aandele vandag'-oudio kan later op-aanvraag as premium kom.

### 3. Volblaas kommentaar-afdeling of forum

**Rede:** Seeking Alpha se 200k kommentare per maand vereis 'n modereringspan; vir 'n span van een is dit 'n regs- en tydsrisiko sonder bokant. Die navorsing wys liggewig-meganismes (polls, kwis, ranglys) lewer dieselfde behoort-gevoel met nul moderering — en die poll-uitslag word self inhoud vir die show.

### 4. Makelaar-funksies, algemene liveblogs of 'n selfstandige mobiele app

**Rede:** Moenie met EasyEquities op transaksies, met Sharenet op data-diepte, of met app-winkels op verspreiding meeding nie — die wen is verstaanbaarheid, Afrikaans en die show. Liveblogs net op 6–10 groot dae per jaar (Begrotingsdag, MPC-besluite), vooraf op die show aangekondig; nie 'n daaglikse verpligting nie. Telegram/WhatsApp gee push-vermoë sonder om 'n app te bou.


## Kritiek — gapings in bogenoemde pad

1. Die gate weerspreek die groeistrategie: /markte is agter Supabase-aanmelding, maar twee groot wette (aandeel-profielblaaie, 'Afrikaanse Daily Investor') staan of val by SEO. Googlebot kan nie gegateerde blaaie indekseer nie. Die roadmap het geen publiek-vs-gegateer-argitektuur nie — aandeelblaaie, nuus en dagoorsig moet publiek wees met die persoonlike laag (portefeulje, alerts, chat) agter die gate, anders is 'Naspers aandeelprys in Afrikaans' 'n onbesette veld wat onbeset bly.
2. Geen meetlaag nie: die roadmap skryf drempels voor ('loods die Liga by 'n paar honderd weeklikse aktiewes', 'betaal EODHD eers wanneer gebruikers kla') maar daar is nul analytics/instrumentering op die lys — geen WAU-telling, aanmeld-funnel, feature-gebruik of churn-koors nie. Sonder dit is elke prioriteitsbesluit op die pad blinde raaiwerk. 'n Dag se PostHog/Vercel Analytics + 'n weeklikse Supabase-telling-cron behoort vinnige wen #0 te wees.
3. Databasis-fondament is wankelrig en die roadmap behandel dit as vas: (a) gratis Yahoo-endpoints is nie-amptelik, breek gereeld en kommersiële gebruik skend die ToS — 'n R79/mnd-betaalvlak bo-op ongeliseensieerde data is 'n kontinuïteits- én regsrisiko; (b) JSE-data-herverspreiding het lisensie-implikasies sodra geld gevra word; (c) JSE-pryse is in sent (ZAc) — 'n klassieke bron van 100x-foute; (d) Yahoo se calendarEvents/dividendData vir JSE-tickers is berug onvolledig, en LDT (laaste dag om te verhandel) is 'n JSE-konsep wat Yahoo glad nie het nie. Die Kalender-bord se bou_plan ('brei Yahoo-klient uit') is dus verkeerd — die eerlike bron vir dividend-datums is SENS, wat beteken SENS Vertaal is 'n harde afhanklikheid vóór die Kalender, nie 'n parallelle medium wet nie.
4. FSCA/FAIS-risiko word met een tussensin ('uitdruklik nie advies nie') afgemaak: GPT-5.4-'waarnemings oor jóú konsentrasie en blootstelling' plus 'n Offshore-meter is presies die grys gebied van finansiële advies in SA-reg. Vir 'n handelsmerk wie se hele bate vertroue is, verdien dit 'n ontwerpte raamwerk (vaste disclaimer-patroon, geen imperatiewe ('koop/verkoop/verskuif') in enige prompt nie, mens-hersiening van die gesondheidskontrole-templaat) vóór die betaalde laag gebou word — nie 'n voetnota nie.
5. Verkeerde kanaal vir die demografie: die vinnige wenne lei met 'n Telegram-bot (die bouer se gunsteling-patroon), maar die Afrikaanse sake-gehoor is 45+ en leef in WhatsApp en e-pos — Telegram-penetrasie daar is dun. E-pos-alerts via die reeds-geverifieerde Resend behoort die eerste alert-been te wees, Telegram tweede. En die 'geen app nie'-besluit slaan 'n middeweg oor: 'n PWA met web-push gee voeg-by-tuisskerm plus stootkennisgewings teen ~2 dae werk — die presiese push-retensie-meganisme wat die roadmap by fintechs aanhaal, sonder app-winkels.
6. Die show en Substack word as klaar-gegewe verspreiding behandel, maar daar is geen konkrete show→terminaal-lus nie: geen plan dat die show se grafika uit /markte kom ('soos gesien op buitelyn.com/markte' as handelsmerk-stempel), geen QR/einde-skerm-CTA in elke episode, geen vaste /markte-blok in elke Substack-uitgawe, geen UTM-meting van watter episode aanmeldings dryf nie. Die goedkoopste groeimotor is die bestaande gehoor — die roadmap bou features vír hulle maar geen brug ná hulle nie.
7. Die betaalvlak beplan Paystack/Payfast + Supabase-rolbestuur as nuwe bouwerk, maar Buitelyn hét reeds 'n betaalinfrastruktuur: Substack se betaalde intekening. 'n Substack-betaalde-vlak wat via e-pos-passing Goud in Supabase ontsluit skrap die hele betaalintegrasie-risiko vir 'n een-man-span, en verkoop boonop op die plek waar die lojale gehoor reeds betaal-gewoond is. Ten minste as v1 oorweeg dit nie eers nie.
8. SA-hoek oorgeslaan: die roadmap is JSE-tickervas, maar die breë Afrikaanse gehoor se daaglikse geldvrae is huishoudelik — petrolprys (maandelikse aanpassing), repokoers/MPC, inflasie, broodmandjie, eiendom. 'n 'Sakgeld'-bord met dié syfers is die mees deelbare, show-vriendelike inhoud denkbaar (elke petrol-aankondiging is 'n gewaarborgde WhatsApp-aanstuur) en trek nie-beleggers in wat later portefeulje-gebruikers word. Ook geen woord oor ETF's/effektetrusts (Satrix-generasie) of RA's nie — die werklike instrumente van die teikenmark.
9. Retensie-gat in die volgorde: onboarding + 'terwyl jy weg was' word self as 'die hoogste-hefboom onsigbare werk' bestempel maar sit agter kwis/streak/Liga in die stapel. Gamifikasie op 'n produk waar nuwe aanmeldings nog nie by die eerste waarde-oomblik uitkom nie, poleer 'n lek emmer. Ruil die prioriteite om. Terselfdertyd ontbreek 'n 'Rapporteer 'n fout'-meganisme op datakaarte — met gratis Yahoo-data gaan daar foute wees, en die vertroue-handelsmerk oorleef dit net as gebruikers dit kan merk en 'n mens dit kan regstel.
10. Bedryfsrealiteit van die lokale daemon: SENS-skraping en die skraper-loop op Piet se eie Mac (launchd) is 'n enkelpunt-mislukking vir 'n produk met betalende gebruikers — masjien slaap, is oorsee, of herbegin. Die roadmap noem monitering by die multikanaal-wet maar nie die migrasiepad (daemon → Vercel cron of goedkoop VPS) vir enigiets waarop 'n premium-feature staatmaak nie.

## As net EEN ding gebou word

Bou 'Jou Markte-oggendpos' — die persoonlike 07:00 Resend-e-pos (dagoorsig + jou portefeulje-delta in rand + dophoulys-skuiwe + top-3 berigte oor jóú aandele) — en sluit die 'Grafiek van die Dag'-beeld boaan in. Hoekom dit bo alles: (1) dit is die enigste feature wat na die gebruiker toe kom in plaas daarvan dat hy moet onthou om na 'n gegateerde blad te gaan — met 'n klein, vars gebruikersbasis is terugkeer-frekwensie die enigste metriek wat nou saak maak, en e-pos is die regte kanaal vir hierdie 45+-demografie (nie Telegram nie); (2) elke bousteen loop reeds (Supabase-tabelle, Gemini-dagoorsig, nuus-opsommings, geverifieerde buitelyn.com-Resend) — dit is letterlik een saamvoeg-cron plus 'n templaat, 1–2 dae werk met byna nul lopende koste; (3) dit is die ruggraat waar elke latere feature inprop: alerts word 'n reël in dieselfde pos, die dividend-kalender 'n blok, die kwartaal-gesondheidskontrole 'n premium-weergawe — die oggendpos ís die gratis voorsmaak van Buitelyn Goud, so elke oggend bemark dit die betaalvlak vanself; (4) dit voed die Substack/show-lus (dieselfde payload word die nuusbrief-konsep) en 'n aangestuurde oggendpos is 'n organiese verwysingsmeganisme. Die 'Hoekom beweeg dit?'-kaartjies is die naaste mededinger, maar dié maak die webwerf beter vir mense wat reeds opdaag — die oggendpos maak dat hulle opdaag.
