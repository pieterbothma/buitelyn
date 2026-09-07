import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { supabaseService } from "@/lib/supabase/service";
import { bouCsv, vensterVanaf, sastTyd, type Intekenaar } from "@/lib/nuusbrief-opsom";

/* Nagtelike opsomming van nuwe nuusbrief-intekenare, 20:00 SAST.
   Op 'n nag sonder nuwe inskrywings stuur ons NIKS — 'n e-pos wat elke aand
   "geen" sê, leer 'n mens om die e-pos te ignoreer, en dan mis jy die aand
   wat dit wel iets sê. */

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ fout: "verbode" }, { status: 401 });
  }

  const vanaf = vensterVanaf(new Date());
  const sb = supabaseService();
  const { data, error } = await sb
    .from("nuusbrief_intekenare")
    .select("epos, geskep_at, bron")
    .gte("geskep_at", vanaf)
    .order("geskep_at", { ascending: true });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  const rye = (data ?? []) as Intekenaar[];
  if (rye.length === 0) return NextResponse.json({ ok: true, nuwe: 0, gestuur: false });

  const sleutel = process.env.RESEND_API_KEY;
  if (!sleutel) return NextResponse.json({ fout: "RESEND_API_KEY ontbreek" }, { status: 500 });

  const datum = sastTyd(new Date().toISOString()).slice(0, 10);
  const lys = rye.map((r) => `• ${r.epos}  (${sastTyd(r.geskep_at)})`).join("\n");
  const meervoud = rye.length === 1 ? "een nuwe intekenaar" : `${rye.length} nuwe intekenare`;

  const resend = new Resend(sleutel);
  const { error: stuurFout } = await resend.emails.send({
    /* aitsa.tech is Resend-geverifieer. NOOIT onboarding@resend.dev nie — dié
       lewer net aan die rekeninghouer af en gee 403 vir enigiemand anders. */
    from: "Buitelyn <piet@aitsa.tech>",
    to: "apduplessis@gmail.com",
    subject: `Buitelyn-nuusbrief: ${meervoud}`,
    text: `Sedert gisteraand 20:00 het ${meervoud} op buitelyn.com ingeteken:\n\n${lys}\n\nDie aangehegte CSV is reg vir Substack se invoer — net 'n email-kolom, niks om eers uit te vee nie.\n\n— outomaties gestuur deur AP HQ`,
    attachments: [
      {
        filename: `buitelyn-substack-${datum}.csv`,
        content: Buffer.from(bouCsv(rye), "utf8").toString("base64"),
      },
    ],
  });
  if (stuurFout) return NextResponse.json({ fout: `Resend: ${stuurFout.message}` }, { status: 500 });

  return NextResponse.json({ ok: true, nuwe: rye.length, gestuur: true });
}
