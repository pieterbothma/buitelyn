import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { kiesStem } from "@/lib/stemme";

export const maxDuration = 300;

/* Selfde Afrikaans-truuk as die markte-briefing: warm-up-frase anker die
   taal, en ons sny dit met die timestamps presies uit. */
const WARMUP = "Ek praat Afrikaans. ";

function snyMp3(mp3: Buffer, sekondes: number): Buffer {
  let pos = 0;
  if (mp3.length > 10 && mp3.toString("latin1", 0, 3) === "ID3") {
    const g = ((mp3[6] & 0x7f) << 21) | ((mp3[7] & 0x7f) << 14) | ((mp3[8] & 0x7f) << 7) | (mp3[9] & 0x7f);
    pos = 10 + g;
  }
  const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const RATES = [44100, 48000, 32000];
  let tyd = 0;
  while (pos + 4 <= mp3.length) {
    if (mp3[pos] !== 0xff || (mp3[pos + 1] & 0xe0) !== 0xe0) { pos++; continue; }
    const bitrate = BITRATES[(mp3[pos + 2] >> 4) & 0x0f];
    const rate = RATES[(mp3[pos + 2] >> 2) & 0x03];
    if (!bitrate || !rate) { pos++; continue; }
    const padding = (mp3[pos + 2] >> 1) & 0x01;
    const raam = Math.floor((144 * bitrate * 1000) / rate) + padding;
    if (tyd >= sekondes) return mp3.subarray(pos);
    tyd += 1152 / rate;
    pos += raam;
  }
  return mp3;
}

export async function POST(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  const { titel, teks, bron_url, stem } = (await request.json()) as {
    titel: string;
    teks: string;
    bron_url?: string;
    stem?: string;
  };
  if (!teks?.trim()) return NextResponse.json({ fout: "geen teks" }, { status: 400 });
  if (teks.length > 40_000)
    return NextResponse.json({ fout: "teks te lank (>40k karakters)" }, { status: 400 });

  /* Geen `stem` → Alida, presies soos voorheen. Die oorsig-studio, die
     oudio-blad en die crons stuur niks en werk dus onveranderd voort. */
  const voiceId = kiesStem(stem);
  const sleutel = process.env.ELEVENLABS_API_KEY;
  if (!voiceId || !sleutel)
    return NextResponse.json(
      { fout: "ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID ontbreek" },
      { status: 500 }
    );

  /* v3 klink verreweg die beste maar het 'n teksperk (±3k) — dus verdeel ons
     lang tekste by paragraaf-grense en las die MP3's aanmekaar; elke stuk kry
     sy eie warm-up wat presies uitgesny word. */
  const stukke: string[] = [];
  let huidige = "";
  for (const para of teks.split(/\n\n+/)) {
    if ((huidige + "\n\n" + para).length > 2500 && huidige) {
      stukke.push(huidige);
      huidige = para;
    } else {
      huidige = huidige ? huidige + "\n\n" + para : para;
    }
  }
  if (huidige) stukke.push(huidige);

  const dele: Buffer[] = [];
  for (const stuk of stukke) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": sleutel, "content-type": "application/json" },
        body: JSON.stringify({
          text: WARMUP + stuk,
          model_id: "eleven_v3",
          voice_settings: { stability: 0.5 },
        }),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ fout: `ElevenLabs ${res.status}: ${detail.slice(0, 200)}` }, { status: 502 });
    }
    const ttsData = (await res.json()) as {
      audio_base64: string;
      alignment?: { characters: string[]; character_start_times_seconds: number[] };
    };
    let deel: Buffer = Buffer.from(ttsData.audio_base64, "base64");
    const al = ttsData.alignment;
    if (al) {
      const vol = al.characters.join("");
      const begin = vol.indexOf(stuk.slice(0, 12));
      const sny = begin > 0 ? al.character_start_times_seconds[begin] : al.character_start_times_seconds[WARMUP.length] ?? 0;
      if (sny > 0.2) deel = snyMp3(deel, Math.max(0, sny - 0.08));
    }
    dele.push(deel);
  }
  const mp3: Buffer = Buffer.concat(dele);

  const svc = supabaseService();
  const pad = `${Date.now()}-${titel.toLowerCase().replace(/[^\w]+/g, "-").slice(0, 60)}.mp3`;
  const { error: stoorFout } = await svc.storage.from("audio-episodes").upload(pad, mp3, {
    contentType: "audio/mpeg",
  });
  if (stoorFout) return NextResponse.json({ fout: stoorFout.message }, { status: 500 });

  await svc.from("audio_episodes").insert({
    bron_url: bron_url ?? null,
    titel,
    teks,
    voice_id: voiceId,
    mp3_path: pad,
  });

  const { data: skakel } = await svc.storage.from("audio-episodes").createSignedUrl(pad, 86_400);
  return NextResponse.json({ ok: true, mp3: skakel?.signedUrl });
}
