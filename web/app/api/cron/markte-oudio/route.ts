import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

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
  const skrip = `Goeiemôre! Hier is Buitelyn se markte-oorsig vir ${datumWoorde}. ... ${oorsig.teks} ... Dis dit vir nou — al die syfers, jou portefeulje en Vra Buitelyn wag by buitelyn punt com slash markte. Lekker dag!`;

  const tts = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "content-type": "application/json" },
      body: JSON.stringify({
        text: skrip,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!tts.ok) {
    return NextResponse.json({ fout: `ElevenLabs ${tts.status}: ${(await tts.text()).slice(0, 200)}` }, { status: 502 });
  }
  const mp3 = Buffer.from(await tts.arrayBuffer());

  const pad = `${datum}.mp3`;
  const { error: stoorFout } = await sb.storage
    .from("markte-oudio")
    .upload(pad, mp3, { contentType: "audio/mpeg", upsert: true });
  if (stoorFout) return NextResponse.json({ fout: stoorFout.message }, { status: 500 });
  const oudioUrl = `${process.env.APHQ_SUPABASE_URL}/storage/v1/object/public/markte-oudio/${pad}`;
  await sb.from("markte_oorsigte").update({ oudio_url: oudioUrl }).eq("datum", datum);

  // Telegram-kanaal-uitsaai (opsioneel — aktiveer met env)
  let telegram = "oorgeslaan";
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_KANAAL) {
    const vorm = new FormData();
    vorm.append("chat_id", process.env.TELEGRAM_KANAAL);
    vorm.append("audio", new Blob([new Uint8Array(mp3)], { type: "audio/mpeg" }), `buitelyn-markte-${datum}.mp3`);
    vorm.append("title", `Markte-oorsig ${datumWoorde}`);
    vorm.append("performer", "Buitelyn");
    vorm.append(
      "caption",
      `🔴 Goeiemôre — jou Buitelyn markte-oorsig vir ${datumWoorde}.\nVolle terminal: buitelyn.com/markte`
    );
    const tg = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendAudio`, {
      method: "POST",
      body: vorm,
    });
    telegram = tg.ok ? "gestuur" : `fout ${tg.status}`;
  }

  return NextResponse.json({ ok: true, datum, grootte: mp3.length, oudioUrl, telegram });
}
