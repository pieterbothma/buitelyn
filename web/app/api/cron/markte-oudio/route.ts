import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

/* Die stem sukkel soms met Afrikaans as dit koud begin; 'n warm-up-frase
   anker die taal, en ons sny dit voor publikasie uit (Piet se truuk). */
const WARMUP = "Ek praat Afrikaans. ";

/* Uitspraak-reëls: spel woorde soos die stem hulle rég moet sê — geld net
   vir die TTS-teks, nooit vir enigiets geskrewe nie. Brei gerus uit. */
const UITSPRAAK: [RegExp, string][] = [
  [/\bru[- ]?olie\b/gi, "rie-olie"],
];

function virStem(teks: string): string {
  return UITSPRAAK.reduce((t, [patroon, se]) => t.replace(patroon, se), teks);
}

/** Sny 'n CBR MP3 by ~sekondes: loop MPEG-raamkoppe en laat val volledige
 *  rame vóór die snypunt (ID3v2-kop word behou-oorgeslaan). */
function snyMp3(mp3: Buffer, sekondes: number): Buffer {
  let pos = 0;
  if (mp3.length > 10 && mp3.toString("latin1", 0, 3) === "ID3") {
    const grootte = ((mp3[6] & 0x7f) << 21) | ((mp3[7] & 0x7f) << 14) | ((mp3[8] & 0x7f) << 7) | (mp3[9] & 0x7f);
    pos = 10 + grootte;
  }
  const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const RATES = [44100, 48000, 32000];
  let tyd = 0;
  while (pos + 4 <= mp3.length) {
    if (mp3[pos] !== 0xff || (mp3[pos + 1] & 0xe0) !== 0xe0) {
      pos++;
      continue;
    }
    const bitrate = BITRATES[(mp3[pos + 2] >> 4) & 0x0f];
    const rate = RATES[(mp3[pos + 2] >> 2) & 0x03];
    if (!bitrate || !rate) {
      pos++;
      continue;
    }
    const padding = (mp3[pos + 2] >> 1) & 0x01;
    const raamGrootte = Math.floor((144 * bitrate * 1000) / rate) + padding;
    const raamTyd = 1152 / rate;
    if (tyd >= sekondes) return mp3.subarray(pos);
    tyd += raamTyd;
    pos += raamGrootte;
  }
  return mp3; // kon nie sny nie — gee alles terug
}

/* Daaglikse oudiobriefing (06:50 SAST): lees die oggend se dagoorsig,
   ElevenLabs praat dit in Afrikaans, MP3 na publieke Storage, URL op die
   oorsig-ry, en (indien opgestel) uitsaai na die Telegram-kanaal. */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ fout: "verbode" }, { status: 401 });
  }

  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const { data: oorsig } = await sb
    .from("markte_oorsigte")
    .select("teks")
    .eq("datum", datum)
    .maybeSingle();
  if (!oorsig?.teks) return NextResponse.json({ fout: "geen oorsig vir vandag nie" }, { status: 404 });

  const datumWoorde = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  /* Drie uitgawes per dag, elk met sy eie groet en invalshoek. */
  const uur = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "numeric", hour12: false }).format(new Date())
  );
  const uitgawe = uur < 11 ? "oggend" : uur < 16 ? "middag" : "aand";
  const groet =
    uitgawe === "oggend"
      ? "Goeiemôre, Suid-Afrika!"
      : uitgawe === "middag"
        ? "Goeiemiddag, Suid-Afrika!"
        : "Goeienaand, Suid-Afrika!";
  const invalshoek =
    uitgawe === "oggend"
      ? "dit is die oggendbriefing — wat die markdag inwag"
      : uitgawe === "middag"
        ? "dit is die middaguitgawe — hoe die dag tot dusver verloop"
        : "dit is die aanduitgawe ná JSE-sluiting — hoe die dag geëindig het";
  const slotGroet =
    uitgawe === "oggend"
      ? "sê iets soos 'ons praat weer vanmiddag' — NIE 'tot môre' nie, daar kom nog uitgawes vandag"
      : uitgawe === "middag"
        ? "sê iets soos 'ons praat weer ná sluitingstyd' — NIE 'tot môre' nie, die dagopsomming kom nog vanaand"
        : "'tot môre' is hier gepas — dit is die laaste uitgawe van die dag";

  /* Gemini herskryf die geskrewe oorsig as 'n gesproke skrip: syfers in
     mensetaal (nie "+1,08%" nie) en ElevenLabs v3-oudio-etikette vir toon. */
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Herskryf hierdie geskrewe markoorsig as 'n GESPROKE oggendbriefing-skrip vir 'n Afrikaanse radiostem (Buitelyn se stem: helder, warm, bietjie speels).

Reëls:
- Begin met [energetic] ${groet} en 'n verwysing na ${datumWoorde}; ${invalshoek}.
- Syfers in mensetaal: nooit "+1,08%" nie — sê "net oor een persent sterker"; rond bedrae af ("sowat sestien rand sewentig teen die dollar"). Geen simbole, hakies of afkortings wat vreemd klink as dit gelees word nie.
- Strooi 4-6 oudio-etikette uit hierdie palet op natuurlike plekke in: [energetic] [announcing] [thoughtful] [serious] [optimistic] [amused]. Op 'n af-dag mag een [sighs]. Etikette staan op hul eie voor die sin wat die toon kry.
- Sluit af met [optimistic] en verwys luisteraars na buitelyn punt com slash markte; ${slotGroet}.
- Skryf suiwer hedendaagse Afrikaans — NOOIT Nederlandse, Vlaamse of Duitse woorde nie (bv. 'achtbaan' is Nederlands). As jy twyfel of 'n woord regte Afrikaans is, gebruik eerder die Engelse leenwoord (bv. 'rollercoaster') of 'n gewone Afrikaanse alternatief.
- Lengte: 120-160 woorde. Geen opskrifte, geen plekhouers. Antwoord NET met die skrip.

Geskrewe oorsig:
${oorsig.teks}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.6 },
      }),
    }
  );
  const geminiData = await geminiRes.json();
  const rouSkrip: string | undefined = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!rouSkrip) return NextResponse.json({ fout: "Gemini het geen skrip geskryf nie" }, { status: 502 });
  const skrip = virStem(rouSkrip);

  const tts = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "content-type": "application/json" },
      body: JSON.stringify({
        text: WARMUP + skrip,
        model_id: "eleven_v3", // v3 verstaan die [energetic]-etikette
        voice_settings: { stability: 0.5 },
      }),
    }
  );
  if (!tts.ok) {
    return NextResponse.json({ fout: `ElevenLabs ${tts.status}: ${(await tts.text()).slice(0, 200)}` }, { status: 502 });
  }
  const ttsData = (await tts.json()) as {
    audio_base64: string;
    alignment?: { characters: string[]; character_start_times_seconds: number[] };
  };
  const volMp3: Buffer = Buffer.from(ttsData.audio_base64, "base64");

  // Sny die warm-up uit: eerste karakter ná die warm-up se starttyd
  let mp3: Buffer = volMp3;
  const al = ttsData.alignment;
  if (al) {
    const teks = al.characters.join("");
    const begin = teks.indexOf(skrip.slice(0, 12));
    const snypunt = begin > 0 ? al.character_start_times_seconds[begin] : al.character_start_times_seconds[WARMUP.length] ?? 0;
    if (snypunt > 0.2) mp3 = snyMp3(volMp3, Math.max(0, snypunt - 0.08));
  }

  const pad = `${datum}-${uitgawe}.mp3`;
  const { error: stoorFout } = await sb.storage
    .from("markte-oudio")
    .upload(pad, mp3, { contentType: "audio/mpeg", upsert: true, cacheControl: "60" });
  if (stoorFout) return NextResponse.json({ fout: stoorFout.message }, { status: 500 });
  // ?v= bust ou kas-kopieë (selfde pad, nuwe inhoud) by blaaiers én CDN
  const oudioUrl = `${process.env.APHQ_SUPABASE_URL}/storage/v1/object/public/markte-oudio/${pad}?v=${Date.now()}`;
  await sb.from("markte_oorsigte").update({ oudio_url: oudioUrl }).eq("datum", datum);

  // Telegram-uitsaai: opsionele kanaal + alle gekoppelde gebruikers wat
  // hierdie uitgawe gekies het. Die eerste sendAudio laai die MP3 op;
  // daarna hergebruik ons Telegram se file_id (geen heroplaai per persoon).
  let telegram = "oorgeslaan";
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const byskrif = `🔴 ${groet.replace("!", "")} — jou Buitelyn markte-oorsig (${uitgawe}uitgawe) vir ${datumWoorde}.\nVolle terminal: buitelyn.com/markte`;
    const titel = `Markte-oorsig ${datumWoorde}`;
    let fileId: string | null = null;

    const stuurAudio = async (chatId: string | number): Promise<boolean> => {
      const api = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendAudio`;
      let res: Response;
      if (fileId) {
        res = await fetch(api, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, audio: fileId, caption: byskrif, title: titel, performer: "Buitelyn" }),
        });
      } else {
        const vorm = new FormData();
        vorm.append("chat_id", String(chatId));
        vorm.append("audio", new Blob([new Uint8Array(mp3)], { type: "audio/mpeg" }), `buitelyn-markte-${datum}-${uitgawe}.mp3`);
        vorm.append("title", titel);
        vorm.append("performer", "Buitelyn");
        vorm.append("caption", byskrif);
        res = await fetch(api, { method: "POST", body: vorm });
      }
      if (res.ok && !fileId) {
        const data = (await res.json()) as { result?: { audio?: { file_id?: string } } };
        fileId = data.result?.audio?.file_id ?? null;
      }
      return res.ok;
    };

    let gestuur = 0;
    let misluk = 0;
    if (process.env.TELEGRAM_KANAAL) {
      (await stuurAudio(process.env.TELEGRAM_KANAAL)) ? gestuur++ : misluk++;
    }
    const { data: koppelinge } = await sb
      .from("telegram_koppelinge")
      .select("chat_id")
      .not("chat_id", "is", null)
      .eq(uitgawe, true);
    for (const k of koppelinge ?? []) {
      (await stuurAudio(k.chat_id as number)) ? gestuur++ : misluk++;
    }
    telegram = `${gestuur} gestuur${misluk ? `, ${misluk} misluk` : ""}`;
  }

  return NextResponse.json({ ok: true, datum, uitgawe, grootte: mp3.length, oudioUrl, telegram });
}
