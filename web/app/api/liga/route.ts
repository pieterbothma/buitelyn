import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/markets/source";
import { isGeldigeSimbool } from "@/lib/markets/boards";

export const dynamic = "force-dynamic";

/* Buitelyn Liga-spel-API. Alle skrywe loop deur die service-klient sodat
   niemand sy eie kontant kan redigeer nie; die sessie bewys net wie jy is.
   Pryse = die terminal se (±15 min vertraagde) kwotasies — JSE-aandele net. */

const BEGIN_KONTANT = 100000;

function service() {
  return createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

async function gebruiker() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

/** GET: my liga-stand + volle ranglys (live waardasie). */
export async function GET() {
  const user = await gebruiker();
  if (!user) return NextResponse.json({ fout: "nie aangemeld" }, { status: 401 });
  const sb = service();
  const [{ data: spelers }, { data: houdings }, { data: profiele }] = await Promise.all([
    sb.from("liga_spelers").select("user_id, nommer, naam, kontant"),
    sb.from("liga_houdings").select("user_id, simbool, naam, aantal, koopprys"),
    sb.from("profiele").select("user_id, avatar_url"),
  ]);
  if (!spelers?.length) return NextResponse.json({ ek: null, ranglys: [] });

  const simbole = [...new Set((houdings ?? []).map((h) => h.simbool))];
  const kwotasies = simbole.length ? await getQuotes(simbole) : [];
  const prys = new Map(kwotasies.map((k) => [k.simbool, k.prys]));
  const avatars = new Map((profiele ?? []).map((p) => [p.user_id, p.avatar_url]));

  const ranglys = spelers
    .map((s) => {
      const myne = (houdings ?? []).filter((h) => h.user_id === s.user_id);
      const waarde =
        Number(s.kontant) +
        myne.reduce((tot, h) => tot + (prys.get(h.simbool) ?? Number(h.koopprys)) * Number(h.aantal), 0);
      return {
        nommer: s.nommer,
        naam: s.naam,
        avatar: avatars.get(s.user_id) ?? null,
        waarde,
        opbrengs: ((waarde - BEGIN_KONTANT) / BEGIN_KONTANT) * 100,
        ek: s.user_id === user.id,
      };
    })
    .sort((a, b) => b.waarde - a.waarde)
    .map((s, i) => ({ ...s, posisie: i + 1 }));

  const ek = spelers.find((s) => s.user_id === user.id);
  const myHoudings = ek
    ? (houdings ?? [])
        .filter((h) => h.user_id === user.id)
        .map((h) => ({
          simbool: h.simbool,
          naam: h.naam,
          aantal: Number(h.aantal),
          koopprys: Number(h.koopprys),
          prys: prys.get(h.simbool) ?? null,
        }))
    : [];
  return NextResponse.json({
    ek: ek ? { nommer: ek.nommer, naam: ek.naam, kontant: Number(ek.kontant), houdings: myHoudings } : null,
    ranglys,
  });
}

/** POST: sluit aan / koop / verkoop. */
export async function POST(request: NextRequest) {
  const user = await gebruiker();
  if (!user) return NextResponse.json({ fout: "nie aangemeld" }, { status: 401 });
  const sb = service();
  const body = (await request.json().catch(() => ({}))) as {
    aksie?: string;
    naam?: string;
    simbool?: string;
    aandeelNaam?: string;
    aantal?: number;
  };

  if (body.aksie === "sluit_aan") {
    const naam = (body.naam ?? "").trim().slice(0, 40);
    if (naam.length < 2) return NextResponse.json({ fout: "kies 'n naam" }, { status: 400 });
    const { data, error } = await sb
      .from("liga_spelers")
      .insert({ user_id: user.id, naam, kontant: BEGIN_KONTANT })
      .select("nommer")
      .single();
    if (error) {
      return NextResponse.json(
        { fout: error.code === "23505" ? "jy is reeds in die Liga" : error.message },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, nommer: data.nommer });
  }

  const simbool = (body.simbool ?? "").toUpperCase();
  const aantal = Math.floor(Number(body.aantal) || 0);
  if (body.aksie === "koop" || body.aksie === "verkoop") {
    if (!simbool.endsWith(".JO") || !isGeldigeSimbool(simbool)) {
      return NextResponse.json({ fout: "net JSE-aandele (.JO) in die Liga" }, { status: 400 });
    }
    if (aantal < 1) return NextResponse.json({ fout: "ongeldige aantal" }, { status: 400 });
    const { data: speler } = await sb.from("liga_spelers").select("kontant").eq("user_id", user.id).maybeSingle();
    if (!speler) return NextResponse.json({ fout: "sluit eers aan" }, { status: 400 });
    const [kwotasie] = await getQuotes([simbool]);
    if (!kwotasie || kwotasie.geldeenheid !== "ZAR") {
      return NextResponse.json({ fout: "geen prys beskikbaar nie — probeer weer" }, { status: 502 });
    }
    const prys = kwotasie.prys;

    if (body.aksie === "koop") {
      const koste = prys * aantal;
      if (koste > Number(speler.kontant)) {
        return NextResponse.json({ fout: `te duur — jy het R ${Number(speler.kontant).toFixed(0)} oor` }, { status: 400 });
      }
      const { data: bestaande } = await sb
        .from("liga_houdings")
        .select("aantal, koopprys")
        .eq("user_id", user.id)
        .eq("simbool", simbool)
        .maybeSingle();
      const nuweAantal = (Number(bestaande?.aantal) || 0) + aantal;
      const gemKoopprys = bestaande
        ? (Number(bestaande.koopprys) * Number(bestaande.aantal) + koste) / nuweAantal
        : prys;
      await sb.from("liga_houdings").upsert(
        { user_id: user.id, simbool, naam: body.aandeelNaam?.slice(0, 60) ?? simbool, aantal: nuweAantal, koopprys: gemKoopprys },
        { onConflict: "user_id,simbool" }
      );
      await sb.from("liga_spelers").update({ kontant: Number(speler.kontant) - koste }).eq("user_id", user.id);
      return NextResponse.json({ ok: true, prys, koste });
    }

    // verkoop
    const { data: houding } = await sb
      .from("liga_houdings")
      .select("aantal")
      .eq("user_id", user.id)
      .eq("simbool", simbool)
      .maybeSingle();
    if (!houding || Number(houding.aantal) < aantal) {
      return NextResponse.json({ fout: "jy besit nie soveel nie" }, { status: 400 });
    }
    const oor = Number(houding.aantal) - aantal;
    if (oor > 0) {
      await sb.from("liga_houdings").update({ aantal: oor }).eq("user_id", user.id).eq("simbool", simbool);
    } else {
      await sb.from("liga_houdings").delete().eq("user_id", user.id).eq("simbool", simbool);
    }
    const { data: speler2 } = await sb.from("liga_spelers").select("kontant").eq("user_id", user.id).single();
    await sb.from("liga_spelers").update({ kontant: Number(speler2!.kontant) + prys * aantal }).eq("user_id", user.id);
    return NextResponse.json({ ok: true, prys, opbrengs: prys * aantal });
  }

  return NextResponse.json({ fout: "onbekende aksie" }, { status: 400 });
}
