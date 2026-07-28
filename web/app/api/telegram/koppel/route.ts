import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* Die sessie-klient werk vir eie rye (RLS), maar die kode-opruim en
   chat_id-lees gebeur konsekwent via die service-klient soos die webhook. */
function service() {
  return createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

async function huidigeGebruiker() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

/** GET: koppel-status + voorkeure vir die aangemelde gebruiker. */
export async function GET() {
  const user = await huidigeGebruiker();
  if (!user) return NextResponse.json({ fout: "nie aangemeld" }, { status: 401 });
  const { data } = await service()
    .from("telegram_koppelinge")
    .select("chat_id, koppel_kode, kode_verval, oggend, middag, aand, skuiwers, portefeulje")
    .eq("user_id", user.id)
    .maybeSingle();
  const kodeGeldig = data?.kode_verval && new Date(data.kode_verval) > new Date();
  return NextResponse.json({
    gekoppel: Boolean(data?.chat_id),
    kode: !data?.chat_id && kodeGeldig ? data?.koppel_kode : null,
    voorkeure: data
      ? { oggend: data.oggend, middag: data.middag, aand: data.aand, skuiwers: data.skuiwers, portefeulje: data.portefeulje }
      : null,
  });
}

/** POST: genereer 'n vars eenmalige koppel-kode (15 min geldig). */
export async function POST() {
  const user = await huidigeGebruiker();
  if (!user) return NextResponse.json({ fout: "nie aangemeld" }, { status: 401 });
  const kode = `BL${Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32])
    .join("")}`;
  const { error } = await service()
    .from("telegram_koppelinge")
    .upsert(
      {
        user_id: user.id,
        koppel_kode: kode,
        kode_verval: new Date(Date.now() + 15 * 60_000).toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ kode, bot: "buitelynbot" });
}

/** PATCH: werk uitgawe-voorkeure by. */
export async function PATCH(request: NextRequest) {
  const user = await huidigeGebruiker();
  if (!user) return NextResponse.json({ fout: "nie aangemeld" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const velde: Record<string, boolean> = {};
  for (const v of ["oggend", "middag", "aand", "skuiwers", "portefeulje"] as const) {
    if (typeof body[v] === "boolean") velde[v] = body[v];
  }
  if (!Object.keys(velde).length) return NextResponse.json({ fout: "geen velde" }, { status: 400 });
  const { error } = await service().from("telegram_koppelinge").update(velde).eq("user_id", user.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE: ontkoppel — hou die ry (voorkeure), maak net die chat los. */
export async function DELETE() {
  const user = await huidigeGebruiker();
  if (!user) return NextResponse.json({ fout: "nie aangemeld" }, { status: 401 });
  const { error } = await service()
    .from("telegram_koppelinge")
    .update({ chat_id: null, gekoppel_at: null, koppel_kode: null, kode_verval: null })
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
