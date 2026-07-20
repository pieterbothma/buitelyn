import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  const { titel, teks, bron_url } = (await request.json()) as {
    titel: string;
    teks: string;
    bron_url?: string;
  };
  if (!teks?.trim()) return NextResponse.json({ fout: "geen teks" }, { status: 400 });
  if (teks.length > 40_000)
    return NextResponse.json({ fout: "teks te lank (>40k karakters)" }, { status: 400 });

  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const sleutel = process.env.ELEVENLABS_API_KEY;
  if (!voiceId || !sleutel)
    return NextResponse.json(
      { fout: "ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID ontbreek" },
      { status: 500 }
    );

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": sleutel, "content-type": "application/json" },
    body: JSON.stringify({
      text: teks,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ fout: `ElevenLabs ${res.status}: ${detail.slice(0, 200)}` }, { status: 502 });
  }
  const mp3 = Buffer.from(await res.arrayBuffer());

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
