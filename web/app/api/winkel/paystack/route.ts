import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { webhookGeldig } from "@/lib/winkel/paystack";
import { stuurBestellingEposse, stuurEienaarWaarskuwing, type BestellingRy } from "@/lib/winkel/epos";

export const runtime = "nodejs";

/* Die webhook is die enigste skrywer van "betaal". 'n Koper wat sy blaaier
   toemaak vóór die redirect het steeds betaal — net hierdie roete weet dit
   betroubaar. Idempotensie leef in winkel_betaal (SQL): 'n herspeelde
   gebeurtenis kry klaar_verwerk=true en stuur niks weer nie. */
export async function POST(request: NextRequest) {
  const rou = await request.text();
  const geheim = process.env.PAYSTACK_SECRET_KEY ?? "";
  /* 'n Leë geheim sou beteken enige HMAC "geldig" lyk — weier eerder skoon. */
  if (!geheim) return NextResponse.json({ fout: "konfigurasie" }, { status: 503 });
  if (!webhookGeldig(rou, request.headers.get("x-paystack-signature"), geheim))
    return NextResponse.json({ fout: "ongeldige handtekening" }, { status: 401 });

  let gebeurtenis: { event?: string; data?: { reference?: string; amount?: number; currency?: string } };
  try { gebeurtenis = JSON.parse(rou); } catch { return NextResponse.json({ ok: true }); }
  if (gebeurtenis.event !== "charge.success") return NextResponse.json({ ok: true });

  const verwysing = gebeurtenis.data?.reference ?? "";
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  /* Verifieer die BEDRAG teen ons bestelling voor ons enigiets merk — 'n
     gemanipuleerde kliënt kon 'n kleiner bedrag betaal het. */
  const { data: bestelling } = await sb.from("winkel_bestellings")
    .select("totaal_sent, status").eq("verwysing", verwysing).single();
  if (!bestelling) {
    console.error(`winkel: webhook vir onbekende ${verwysing}`);
    await stuurEienaarWaarskuwing(
      `Winkel-waarskuwing: ${verwysing}`,
      `<p>Paystack het 'n suksesvolle betaling gestuur vir verwysing <strong>${verwysing}</strong>,
       maar ons het geen bestelling met dié verwysing nie. Gaan self in Paystack se
       dashboard na of geld ontvang is.</p>`
    );
    return NextResponse.json({ ok: true });
  }
  if (gebeurtenis.data?.amount !== bestelling.totaal_sent || gebeurtenis.data?.currency !== "ZAR") {
    console.error(`winkel: BEDRAG-WANVERHOUDING ${verwysing}: ${gebeurtenis.data?.amount} vs ${bestelling.totaal_sent}`);
    await stuurEienaarWaarskuwing(
      `Winkel-waarskuwing: ${verwysing}`,
      `<p>Die bedrag wat Paystack vir verwysing <strong>${verwysing}</strong> gestuur het, stem nie ooreen
       met die bestelling se totaal nie. Paystack: ${gebeurtenis.data?.amount ?? "—"} ${gebeurtenis.data?.currency ?? ""}
       teenoor bestelling: ${bestelling.totaal_sent} ZAR. Gaan self na voor jy hierdie bestelling as betaal merk.</p>`
    );
    return NextResponse.json({ ok: true });
  }

  const { data: uitslag, error } = await sb.rpc("winkel_betaal", { p_verwysing: verwysing });
  if (error) { console.error("winkel: winkel_betaal het misluk", error); return NextResponse.json({ fout: "db" }, { status: 500 }); }
  if (!uitslag?.klaar_verwerk && uitslag?.bestelling) {
    await stuurBestellingEposse(uitslag.bestelling as BestellingRy);
  }
  return NextResponse.json({ ok: true });
}
