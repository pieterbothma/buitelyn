import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { winkelKlient, rand, type Bestelling, type Variant } from "@/lib/winkel";
import { merkGestuur } from "@/app/actions-winkel";

export const dynamic = "force-dynamic";

const STATUS_NAAM: Record<Bestelling["status"], string> = {
  begin: "Begin",
  betaal: "Betaal",
  gestuur: "Gestuur",
};

function StatusBadge({ status }: { status: Bestelling["status"] }) {
  const klas =
    status === "betaal"
      ? "bg-ink text-offwhite"
      : status === "gestuur"
        ? "border-2 border-ink/30 text-ink/50"
        : "border-2 border-ink/30 text-ink/60";
  return (
    <span className={`px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] ${klas}`}>
      {STATUS_NAAM[status].toUpperCase()}
    </span>
  );
}

export default async function BestellingsBlad({
  searchParams,
}: {
  searchParams: Promise<{ alles?: string }>;
}) {
  const { alles } = await searchParams;
  const wysAlles = alles === "1";

  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");

  const wk = winkelKlient();

  const { data: variante } = await wk
    .from("winkel_variante")
    .select("id, kleur, voorraad")
    .order("kleur")
    .returns<Variant[]>();

  let vraag = wk
    .from("winkel_bestellings")
    .select(
      "id, verwysing, status, modus, item, koper, adres, totaal_sent, geskep_op"
    )
    .order("geskep_op", { ascending: false })
    .limit(200);
  if (!wysAlles) vraag = vraag.eq("modus", "regte");

  const { data: bestellings } = await vraag.returns<Bestelling[]>();

  const datumFmt = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Bestellings</h1>
        <Link
          href={wysAlles ? "/bestellings" : "/bestellings?alles=1"}
          className="text-sm font-semibold underline-offset-2 hover:underline"
        >
          {wysAlles ? "Wys net regte bestellings" : "Wys ook toets-bestellings"}
        </Link>
      </div>

      {/* Voorraad-strook */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(variante ?? []).length === 0 ? (
          <p className="text-sm text-ink/50">Geen variante gevind nie.</p>
        ) : (
          (variante ?? []).map((v) => (
            <div
              key={v.id}
              className="border-2 border-ink bg-offwhite px-3 py-2 text-sm font-semibold"
            >
              {v.kleur}: {v.voorraad} oor
            </div>
          ))
        )}
      </div>

      {/* Bestellings */}
      <ul className="mt-6 divide-y divide-ink/10 border-2 border-ink bg-offwhite">
        {(bestellings ?? []).length === 0 ? (
          <li className="px-4 py-6 text-sm text-ink/50">Nog geen bestellings nie.</li>
        ) : (
          (bestellings ?? []).map((b) => (
            <li key={b.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold">{b.verwysing}</span>
                  <StatusBadge status={b.status} />
                  {b.modus === "toets" ? (
                    <span className="px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-red">
                      TOETS
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-ink/50">{datumFmt.format(new Date(b.geskep_op))}</p>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink/80">
                  {b.koper.naam} {b.koper.van} · {b.item.aantal} x {b.item.kleur}
                </p>
                <p className="text-sm font-semibold">{rand(b.totaal_sent)}</p>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <details className="text-sm text-ink/70">
                  <summary className="cursor-pointer select-none font-semibold text-ink/60 hover:text-ink">
                    Besonderhede
                  </summary>
                  <div className="mt-2 space-y-1 border-l-2 border-ink/15 pl-3">
                    <p>{b.adres.straat}</p>
                    <p>
                      {b.adres.woonbuurt}, {b.adres.stad}
                    </p>
                    <p>
                      {b.adres.provinsie} {b.adres.poskode}
                    </p>
                    {b.adres.nota ? <p className="italic text-ink/60">Nota: {b.adres.nota}</p> : null}
                    <p className="pt-1 text-ink/60">
                      {b.koper.epos} · {b.koper.selfoon}
                    </p>
                  </div>
                </details>

                {b.status === "betaal" ? (
                  <form action={merkGestuur.bind(null, b.id)}>
                    <button className="border-2 border-ink bg-ink px-3 py-1.5 text-xs font-semibold text-offwhite hover:bg-ink/85">
                      Merk as gestuur
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </Shell>
  );
}
