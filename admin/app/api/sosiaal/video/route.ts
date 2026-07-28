import { NextResponse, type NextRequest } from "next/server";
import { Sandbox } from "@vercel/sandbox";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { parseerKonsepStories } from "@/lib/konsep-stories";
import { renderKaartPng } from "@/lib/kaart-render";

export const maxDuration = 300;

/* Audiogram in 'n Vercel Sandbox: die dag se briefing-MP3 oor die
   voorbladkaart met 'n rooi golfvorm — ffmpeg (statiese build) in 'n
   kortstondige VM, MP4 na die konsep-fotos-bucket. */
export async function POST(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
    new Date()
  );
  const svcLees = supabaseService();
  const vorm = await request.formData().catch(() => null);
  const bron = String(vorm?.get("bron") ?? "briefing");
  const formaat = String(vorm?.get("formaat") ?? "reels"); // reels (9:16) of vierkant
  const kaartIndeks = Math.max(0, Number(vorm?.get("kaart") ?? 0) || 0);

  // Klankbron: dagoorsig-briefing, jongste nuusbrief-audio, of eie oplaai
  let klank: Buffer;
  if (bron === "oplaai") {
    const leer = vorm?.get("leer") as File | null;
    if (!leer || leer.size === 0)
      return NextResponse.json({ fout: "geen audio-lêer opgelaai nie" }, { status: 400 });
    if (leer.size > 20_000_000)
      return NextResponse.json({ fout: "lêer te groot (>20MB)" }, { status: 400 });
    klank = Buffer.from(await leer.arrayBuffer());
  } else if (bron === "nuusbrief") {
    const { data: ep } = await sb
      .from("audio_episodes")
      .select("mp3_path")
      .order("geskep_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ep?.mp3_path)
      return NextResponse.json({ fout: "geen nuusbrief-audio nie — genereer eers een" }, { status: 404 });
    const { data: af, error: afFout } = await svcLees.storage
      .from("audio-episodes")
      .download(ep.mp3_path);
    if (afFout || !af) return NextResponse.json({ fout: "kon nie episode haal nie" }, { status: 502 });
    klank = Buffer.from(await af.arrayBuffer());
  } else {
    const { data: oorsig } = await svcLees
      .from("markte_oorsigte")
      .select("oudio_url")
      .eq("datum", datum)
      .maybeSingle();
    if (!oorsig?.oudio_url)
      return NextResponse.json({ fout: "geen briefing-audio vir vandag nie" }, { status: 404 });
    const klankRes = await fetch(oorsig.oudio_url);
    if (!klankRes.ok) return NextResponse.json({ fout: "kon nie audio haal nie" }, { status: 502 });
    klank = Buffer.from(await klankRes.arrayBuffer());
  }

  // Selfde kaartbron as die poskaarte: opgelaaide nuusbrief eerste, dan konsep
  const { data: opgelaai } = await sb
    .from("sosiaal_stukke")
    .select("stukke")
    .eq("datum", datum)
    .maybeSingle();
  let stuk: { kop: string; byskrif: string } = { kop: "Vandag op die markte", byskrif: "" };
  if (opgelaai?.stukke) {
    const lys = opgelaai.stukke as { kop: string; opsomming: string }[];
    const s0 = lys[kaartIndeks] ?? lys[0];
    if (s0) stuk = { kop: s0.kop, byskrif: s0.opsomming };
  } else {
    const { data: konsep } = await sb
      .from("nuusbrief_konsepte")
      .select("teks")
      .eq("datum", datum)
      .maybeSingle();
    const lys = konsep?.teks ? parseerKonsepStories(konsep.teks) : [];
    const k = lys[kaartIndeks] ?? lys[0];
    if (k) stuk = { kop: k.kop, byskrif: "" };
  }
  const isReels = formaat !== "vierkant";
  const kaart = await renderKaartPng(stuk, datum, isReels);

  let sandbox: Sandbox | null = null;
  try {
    sandbox = await Sandbox.create({ timeout: 240_000 });
    await sandbox.writeFiles([
      { path: "kaart.png", content: kaart },
      { path: "klank.mp3", content: klank },
    ]);
    const aflaai = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        "(sudo dnf install -y -q xz || dnf install -y -q xz) && curl -sL https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz -o ff.tar.xz && tar -xJf ff.tar.xz --strip-components=2 --wildcards '*/bin/ffmpeg' && ./ffmpeg -version | head -1",
      ],
    });
    if (aflaai.exitCode !== 0) {
      const foutTeks = await aflaai.stderr();
      return NextResponse.json(
        { fout: `ffmpeg-aflaai het misluk: ${foutTeks.slice(-250)}` },
        { status: 502 }
      );
    }

    // Reels: 1080x1920 — die 4:5-kaart op papier-agtergrond met golfvorm onder
    const filter = isReels
      ? "[0:v]scale=1080:1350,pad=1080:1920:0:220:color=0xF7F6F2[bg];[1:a]showwaves=s=952x170:mode=cline:colors=0xF03028:rate=25[w];[bg][w]overlay=64:1680:format=auto[v]"
      : "[1:a]showwaves=s=952x140:mode=cline:colors=0xF03028:rate=25[w];[0:v]scale=1080:1080[bg];[bg][w]overlay=64:870:format=auto[v]";
    const render = await sandbox.runCommand({
      cmd: "./ffmpeg",
      args: [
        "-loop", "1", "-i", "kaart.png",
        "-i", "klank.mp3",
        "-filter_complex", filter,
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest", "-movflags", "+faststart",
        "uit.mp4",
      ],
    });
    if (render.exitCode !== 0) {
      const fout = await render.stderr();
      return NextResponse.json({ fout: `ffmpeg: ${fout.slice(-300)}` }, { status: 502 });
    }

    const lees = await sandbox.readFile({ path: "uit.mp4" });
    if (!lees) return NextResponse.json({ fout: "geen uitset-lêer nie" }, { status: 502 });
    const stukke: Buffer[] = [];
    for await (const deel of lees) stukke.push(Buffer.from(deel));
    const mp4 = Buffer.concat(stukke);

    const svc = supabaseService();
    const pad = `${datum}/audiogram-${Date.now()}.mp4`;
    const { error } = await svc.storage
      .from("konsep-fotos")
      .upload(pad, mp4, { contentType: "video/mp4" });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsep-fotos/${pad}`;
    return NextResponse.json({ ok: true, url, grootte: mp4.length });
  } catch (fout) {
    return NextResponse.json(
      { fout: `sandbox: ${fout instanceof Error ? fout.message : String(fout)}` },
      { status: 502 }
    );
  } finally {
    await sandbox?.stop().catch(() => {});
  }
}
