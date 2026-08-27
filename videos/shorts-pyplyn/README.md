# Buitelyn-shorts-pyplyn

Van 'n volle YouTube-episode na vertikale shorts met karaoke-onderskrifte en 'n
Buitelyn-uitro. Gebou op 26 Augustus 2026 vir die Naspers/handelsoorlog/Dolly-episode.

## Loop dit

Werk in 'n leë gids per episode — die skripte kas hulle werk daar.

```bash
mkdir -p ~/werk/buitelyn-<datum> && cd $_
export $(grep -E '^(GEMINI|OPENAI)_API_KEY=' "$HOME/die buitelyn/admin/.env.local" | xargs)
P="$HOME/die buitelyn/videos/shorts-pyplyn"

# 0. Laai die episode af
yt-dlp -f "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b" --merge-output-format mp4 \
  -o "episode.%(ext)s" "<youtube-url>"

# 1. Klank uit, mono 16k — dis wat die transkripsie en die woordtye lees
ffmpeg -v error -i episode.mp4 -vn -ac 1 -ar 16000 -q:a 4 audio.mp3 -y

# 2. Transkribeer (Gemini, gestuk)          -> transkripsie-sekondes.json
node "$P/transkribeer.mjs"

# 3. Skoot-kaart: waar is AP, oomblik vir oomblik  -> skoot-kaart.json
node "$P/skoot-kaart.mjs" episode.mp4

# 4. Kies short-kandidate                   -> shorts.json
node "$P/kies-shorts.mjs"

# 5. Sny hulle                              -> shorts/*.mp4
cp "$P/woordtye.py" .          # karaoke.py voer dit langs hom in
python3 "$P/karaoke.py" episode.mp4          # almal
python3 "$P/karaoke.py" episode.mp4 2 4      # of net dié indekse
```

## Wat elke stuk doen, en hoekom dit so is

**`transkribeer.mjs`** — Gemini, maar in vensters van 30s met 2s oorvleueling.
Een oproep oor die hele lêer dryf: gemeet -0,2s by 7s en +8,7s by 299s. Gemini
skat tydstempels deur te luister; oor 'n kort venster met 'n BEKENDE begintyd
kan die fout nie opbou nie. Elke venster se uitslag word gekas, want Gemini is
nie-deterministies en 'n volle herlopie ruil net een defek vir 'n ander.

**`skoot-kaart.mjs`** — vra Gemini per raam (elke 5s) watter uitleg dit is en
waar AP horisontaal sit. Die episode het drie uitlegte, en hulle vra
verskillende snitte:

| uitleg | % van die episode | AP se x | 9:16-snit |
|---|---|---|---|
| `solo` | 53% | 0,50 | middel |
| `split` | 33% | 0,25 | links |
| `broll` | 14% | — | geen AP |

**`kies-shorts.mjs`** — Gemini kies 8 oomblikke uit die transkripsie, en die
skoot-kaart word langsaan gesit sodat 'n kandidaat wat oor 'n uitleg-grens val
gemerk word.

**`woordtye.py`** — die woordtye vir die karaoke. Nie 'n suiwer skatting nie en
nie 'n suiwer meting nie:

- Suiwer skatting (duur eweredig oor die woorde) dryf binne 'n segment en spring
  reg by die volgende — presies "dit verloor sync, dan tel dit weer op". Die
  spreektempo wissel 0,15s tot 0,59s per woord tussen segmente, 3,9x.
- Suiwer meting (kies die n-1 stilste rame) is erger. In een segment van 16
  woorde is daar net 13 stil stukkies, en die meeste is 30-90ms — dit is
  plofklanke BINNE woorde. Spraak loop aanmekaar; dwing jy 15 grense af, versin
  jy gapings wat nie bestaan nie.

Dit anker dus by pouses langer as 150ms (regte grense) en skat tussenin. Op een
short het dit die ankers van 14 na 36 gebring.

**`karaoke.py`** — sny 16:9 na 9:16 met AP se gesig VOL in die raam, teken die
onderskrifte as PNG's, en plak die uitro agteraan.

## Dinge wat jou sal byt

**Geen libass op hierdie masjien nie.** `ffmpeg -filters` het nie `subtitles`
of `ass` nie. Daarom word die onderskrifte as PNG's geteken en as EEN
deursigtige QTRLE-baan oorgelê. Dit is boonop beter vir die handelsmerk: ons
beheer League Spartan en die rand presies.

**Monstertempo moet pas.** Die bron is 44,1kHz. 'n Uitro met `anullsrc=r=48000`
oorleef die `-c copy`-saamvoeg nie: concat hersample nie, dit plak net, en die
klank rek met 1,088. Die video was 51,7s en die klank 56,3s. `karaoke.py` lees
nou die kern se tempo met ffprobe en pas die uitro daarby aan.

**Split-skote kan nie heeltemal reg gesny word nie.** Die bron se eie oorlegsels
sit op x 72-585 (logo bo-links, borg-blok onder-links). Om hulle uit te sluit
moet die snit by x >= 599 begin — maar in 'n split-skoot sit AP op x ~ 480. 'n
9:16-snit kan dus AP wys OF die oorlegsels uitsluit, nooit albei nie. Dit is nie
'n fout in die kode nie; die raam is vir 16:9 gekomponeer.

> **Die permanente oplossing lê in die 16:9-sjabloon**: skuif die logo en die
> borg-blok na regs of na die middel, en elke toekomstige episode word ten volle
> snybaar, ook die split-skote.

**CRF 23, nie 19 nie.** 'n 52s-short op CRF 19 is 32MB; elke platform herkodeer
in elk geval. CRF 23 gee 19MB wat ná hulle herkodering presies dieselfde lyk.

## Nog oop

- Die reaksie-uitknipsels vir die duimnael-gereedskap is ~1,8MB elk en satori
  haal hulle by ELKE render weer af. Saampers sal die voorskou vinniger maak.
- `REGSTELLINGS` in `transkribeer.mjs` skryf steeds "E Media" op twee reëls,
  terwyl die borg volgens die e-posadresse Seepunt Media is. Piet moet besleg
  of "E Media" 'n aparte maatskappy is en of daardie twee reëls verkeerd is.
