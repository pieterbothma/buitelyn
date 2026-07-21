import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { skepKlient } from "@/app/actions-invoices";

export const dynamic = "force-dynamic";

export default async function Kliente({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { data: kliente } = await sb
    .from("clients")
    .select("id, naam, maatskappy, epos, kontak")
    .eq("workspace_id", active.id)
    .order("naam");

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Kliënte</h1>
      <div className="mt-6 grid max-w-4xl gap-6 md:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-ink/10 self-start border-2 border-ink bg-offwhite">
          {(kliente ?? []).length === 0 ? (
            <li className="px-4 py-6 text-sm text-ink/50">Nog geen kliënte nie.</li>
          ) : (
            (kliente ?? []).map((k) => (
              <li key={k.id} className="px-4 py-3">
                <p className="font-semibold">
                  {k.naam}
                  {k.maatskappy ? <span className="font-normal text-ink/60"> · {k.maatskappy}</span> : null}
                </p>
                <p className="text-xs text-ink/60">
                  {[k.epos, k.kontak].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))
          )}
        </ul>
        <form
          action={skepKlient.bind(null, slug)}
          className="space-y-3 self-start border-2 border-ink bg-offwhite p-4"
        >
          <h2 className="text-sm font-semibold tracking-[0.14em]">NUWE KLIËNT</h2>
          <input name="naam" required placeholder="Naam" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <input name="maatskappy" placeholder="Maatskappynaam" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <input name="reg_nr" placeholder="Registrasienr." className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <input name="btw_nr" placeholder="BTW-nr." className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <input name="epos" type="email" placeholder="E-pos" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <input name="kontak" placeholder="Kontak" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <textarea name="adres" rows={2} placeholder="Adres" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <button className="w-full bg-ink py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85">
            Stoor kliënt
          </button>
        </form>
      </div>
    </Shell>
  );
}
