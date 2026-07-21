import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { lysEposse, type Epos } from "@/lib/unipile";

export const dynamic = "force-dynamic";

export default async function EposBlad({
  searchParams,
}: {
  searchParams: Promise<{ koppel?: string }>;
}) {
  const { koppel } = await searchParams;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");

  const { data: rekening } = await sb
    .from("email_accounts")
    .select("account_id, provider, epos")
    .order("geskep_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let eposse: Epos[] = [];
  let lysFout: string | null = null;
  if (rekening) {
    try {
      eposse = await lysEposse(rekening.account_id);
    } catch (e) {
      lysFout = e instanceof Error ? e.message : "Kon nie e-posse laai nie";
    }
  }

  const datumFmt = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]}>
      <h1 className="text-3xl font-extrabold tracking-tight">E-pos</h1>

      {koppel === "sukses" ? (
        <p className="mt-3 max-w-xl border-2 border-green bg-offwhite p-3 text-sm font-semibold">
          Rekening gekoppel ✓ — as die lys hieronder leeg is, gee dit 'n minuut en herlaai.
        </p>
      ) : null}
      {koppel === "fout" ? (
        <p className="mt-3 max-w-xl border-2 border-red bg-offwhite p-3 text-sm font-semibold text-red">
          Koppeling het misluk — probeer weer.
        </p>
      ) : null}

      {!rekening ? (
        <div className="mt-6 max-w-md border-2 border-ink bg-offwhite p-6">
          <p className="text-sm text-ink/70">
            Koppel jou Gmail (of enige e-pos) sodat AP HQ jou inboks hier kan wys.
          </p>
          <form action="/api/unipile/connect" method="post" className="mt-4">
            <button className="w-full bg-ink py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85">
              Koppel e-pos →
            </button>
          </form>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink/60">
            {rekening.epos ?? rekening.account_id}
            {rekening.provider ? ` · ${rekening.provider}` : ""}
          </p>
          {lysFout ? (
            <p className="mt-4 text-sm font-semibold text-red">{lysFout}</p>
          ) : (
            <ul className="mt-6 max-w-3xl divide-y divide-ink/10 border-2 border-ink bg-offwhite">
              {eposse.length === 0 ? (
                <li className="px-4 py-6 text-sm text-ink/50">Geen e-posse nie.</li>
              ) : (
                eposse.map((e) => (
                  <li key={e.id} className="px-4 py-3">
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
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </Shell>
  );
}
