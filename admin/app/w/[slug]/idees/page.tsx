import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { promoveerIdee, skrapIdee } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Idees({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { data: idees } = await sb
    .from("ideas")
    .select("id, titel, nota, skakel, bron, geskep_at, formats(naam)")
    .eq("workspace_id", active.id)
    .order("geskep_at", { ascending: false });

  const fmt = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short" });
  const môre = new Date(Date.now() + 86_400_000);
  môre.setHours(9, 0, 0, 0);

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Idees</h1>
      <ul className="mt-6 max-w-3xl divide-y divide-ink/10 border-2 border-ink bg-offwhite">
        {(idees ?? []).length === 0 ? (
          <li className="px-4 py-6 text-sm text-ink/50">
            Nog geen idees hier nie — gebruik die + knoppie.
          </li>
        ) : (
          (idees ?? []).map((i) => {
            const f = i.formats as unknown as { naam: string } | null;
            return (
              <li key={i.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-semibold">{i.titel}</p>
                  <p className="shrink-0 text-xs text-ink/50">
                    {fmt.format(new Date(i.geskep_at))}
                    {i.bron !== "in_app" ? " · 📱" : ""}
                  </p>
                </div>
                {i.nota ? <p className="mt-1 text-sm text-ink/70">{i.nota}</p> : null}
                <div className="mt-2 flex items-center gap-4 text-xs font-semibold">
                  {f ? <span className="border border-ink/30 px-1.5 py-0.5">{f.naam}</span> : null}
                  {i.skakel ? (
                    <a href={i.skakel} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      skakel ↗
                    </a>
                  ) : null}
                  <form action={promoveerIdee.bind(null, i.id, môre.toISOString())}>
                    <button className="underline-offset-2 hover:underline">→ maak kaart (môre 09:00)</button>
                  </form>
                  <form action={skrapIdee.bind(null, i.id)}>
                    <button className="text-red/80 hover:text-red">skrap</button>
                  </form>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </Shell>
  );
}
