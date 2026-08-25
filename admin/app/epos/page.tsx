import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { lysEposseInVouer, lysVouers, type Epos, type EposVouer } from "@/lib/unipile";
import { ontkoppelEpos } from "@/app/actions-epos";

export const dynamic = "force-dynamic";

const ROL_NAAM: Record<string, string> = {
  inbox: "Inbox",
  sent: "Gestuur",
  drafts: "Konsepte",
  archive: "Argief",
  trash: "Asblik",
  spam: "Gemors",
};

export default async function EposBlad({
  searchParams,
}: {
  searchParams: Promise<{ koppel?: string; vouer?: string; gestuur?: string; rek?: string }>;
}) {
  const { koppel, vouer, gestuur, rek } = await searchParams;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");

  const { data: rekeninge } = await sb
    .from("email_accounts")
    .select("account_id, provider, epos")
    .order("geskep_at");

  const aktieweRek =
    (rek && (rekeninge ?? []).find((r) => r.account_id === rek)) || (rekeninge ?? [])[0] || null;

  let vouers: EposVouer[] = [];
  let eposse: Epos[] = [];
  let fout: string | null = null;
  let aktieweVouer: string | null = null;

  if (aktieweRek) {
    try {
      vouers = await lysVouers(aktieweRek.account_id);
      const bekend = vouers.filter((v) => v.role && ROL_NAAM[v.role]);
      const inbox = bekend.find((v) => v.role === "inbox");
      const gekies =
        (vouer && vouers.find((v) => v.provider_id === vouer || v.id === vouer)) || inbox;
      aktieweVouer = gekies?.provider_id ?? null;
      eposse = await lysEposseInVouer(aktieweRek.account_id, aktieweVouer);
    } catch (e) {
      fout = e instanceof Error ? e.message : "Kon nie e-posse laai nie";
    }
  }

  const datumFmt = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const railVouers = vouers
    .filter((v) => v.role && ROL_NAAM[v.role])
    .sort(
      (a, b) => Object.keys(ROL_NAAM).indexOf(a.role!) - Object.keys(ROL_NAAM).indexOf(b.role!)
    );

  const rekParam = aktieweRek ? `&rek=${encodeURIComponent(aktieweRek.account_id)}` : "";

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">E-pos</h1>
        <form action="/api/unipile/connect" method="post">
          <button className="text-sm font-semibold underline-offset-2 hover:underline">
            + Koppel nog &apos;n rekening
          </button>
        </form>
      </div>

      {/* Rekening-oortjies */}
      {(rekeninge ?? []).length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(rekeninge ?? []).map((r) => {
            const aktief = r.account_id === aktieweRek?.account_id;
            return (
              <Link
                key={r.account_id}
                href={`/epos?rek=${encodeURIComponent(r.account_id)}`}
                className={`border-2 border-ink px-3 py-1.5 text-sm font-semibold ${
                  aktief ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
                }`}
              >
                {r.epos ?? r.account_id.slice(0, 8)}
              </Link>
            );
          })}
          {aktieweRek ? (
            <form action={ontkoppelEpos.bind(null, aktieweRek.account_id)}>
              <button className="px-2 text-sm font-semibold text-red/80 underline-offset-2 hover:text-red hover:underline">
                Ontkoppel hierdie een
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {koppel === "sukses" ? (
        <p className="mt-3 max-w-xl border-2 border-green bg-offwhite p-3 text-sm font-semibold">
          Rekening gekoppel ✓ — as dit nog nie hier lys nie, gee dit &apos;n minuut en herlaai.
        </p>
      ) : null}
      {koppel === "fout" ? (
        <p className="mt-3 max-w-xl border-2 border-red bg-offwhite p-3 text-sm font-semibold text-red">
          Koppeling het misluk — probeer weer.
        </p>
      ) : null}
      {gestuur ? (
        <p className="mt-3 max-w-xl border-2 border-green bg-offwhite p-3 text-sm font-semibold">
          E-pos gestuur ✓
        </p>
      ) : null}

      {!aktieweRek ? (
        <div className="mt-6 max-w-md border-2 border-ink bg-offwhite p-6">
          <p className="text-sm text-ink/70">
            Koppel jou Gmail (of enige e-pos) sodat AP HQ jou inbox hier kan wys.
          </p>
          <form action="/api/unipile/connect" method="post" className="mt-4">
            <button className="w-full bg-ink py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85">
              Koppel e-pos →
            </button>
          </form>
        </div>
      ) : fout ? (
        <p className="mt-4 text-sm font-semibold text-red">{fout}</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[180px_1fr]">
          {/* Vouer-relings */}
          <ul className="self-start border-2 border-ink bg-offwhite">
            {railVouers.map((v) => {
              const aktief = v.provider_id === aktieweVouer;
              return (
                <li key={v.id}>
                  <Link
                    href={`/epos?vouer=${encodeURIComponent(v.provider_id ?? v.id)}${rekParam}`}
                    className={`flex items-center justify-between px-3 py-2 text-sm font-semibold hover:bg-paper ${
                      aktief ? "bg-paper" : ""
                    }`}
                  >
                    {ROL_NAAM[v.role!]}
                    {typeof v.nb_mails === "number" ? (
                      <span className="text-xs text-ink/40">{v.nb_mails}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Boodskappe */}
          <ul className="divide-y divide-ink/10 self-start border-2 border-ink bg-offwhite">
            {eposse.length === 0 ? (
              <li className="px-4 py-6 text-sm text-ink/50">Geen e-posse in hierdie vouer nie.</li>
            ) : (
              eposse.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/epos/${encodeURIComponent(e.id)}?vouer=${encodeURIComponent(aktieweVouer ?? "")}${rekParam}`}
                    className="block px-4 py-3 hover:bg-paper"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="truncate font-semibold">{e.van}</p>
                      <p className="shrink-0 text-xs text-ink/50">
                        {e.datum ? datumFmt.format(new Date(e.datum)) : ""}
                      </p>
                    </div>
                    <p className="truncate text-sm">{e.onderwerp}</p>
                    {e.uittreksel ? (
                      <p className="mt-0.5 truncate text-xs text-ink/50">{e.uittreksel}</p>
                    ) : null}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </Shell>
  );
}
