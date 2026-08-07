import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { kryOorsigArgief } from "@/app/actions-oorsig-argief";
import { UITGAWES, type Uitgawe, type Snit } from "@/lib/oorsig-argief";

export const dynamic = "force-dynamic";

/* Wanneer elke uitgawe verskyn (SAST) — die cron loop 50 4,9,15 UTC, Ma–Vr. */
const TYE: Record<Uitgawe, string> = { oggend: "06:50", middag: "11:50", aand: "17:50" };

const mb = (grepe: number) => `${(grepe / 1024 / 1024).toFixed(1)} MB`;

export default async function OorsigArgief({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { dae, fout } = await kryOorsigArgief();
  const vandag = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Vandag se Oorsigte</h1>
      <p className="mt-2 max-w-xl text-sm text-ink/60">
        Die oggend-, middag- en aanduitgawes van die laaste sewe beursdae — luister hier
        of laai af. Niks word uitgevee nie; ouer dae bly gestoor.
      </p>

      {fout ? (
        <p className="mt-6 max-w-xl border-2 border-red bg-offwhite p-4 text-sm">
          Kon nie die argief laai nie: {fout}
        </p>
      ) : null}

      {!fout && !dae.length ? (
        <p className="mt-6 text-sm text-ink/60">Nog geen oorsigte nie.</p>
      ) : null}

      <div className="mt-6 max-w-2xl space-y-4">
        {dae.map((dag) => {
          const perUitgawe = new Map<Uitgawe, Snit>(dag.snitte.map((s) => [s.uitgawe, s]));
          return (
            <section key={dag.datum} className="border-2 border-ink bg-offwhite p-5">
              <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50">
                {dag.datumWoorde.toUpperCase()}
              </h2>
              <ul className="mt-3 space-y-3">
                {UITGAWES.map((u) => {
                  const snit = perUitgawe.get(u);
                  /* Vandag se nog-onvoltooide uitgawes wys as hangend met hul tyd:
                     'n missende 11:50-lêer moet lees as "nog nie", nie as "stukkend". */
                  if (!snit) {
                    return dag.datum === vandag ? (
                      <li key={u} className="flex items-center gap-3 text-sm text-ink/40">
                        <span className="w-16 font-semibold tracking-[0.12em]">{u.toUpperCase()}</span>
                        <span>kom {TYE[u]}</span>
                      </li>
                    ) : null;
                  }
                  return (
                    <li key={u} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="w-16 text-sm font-semibold tracking-[0.12em]">{u.toUpperCase()}</span>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio controls preload="none" src={snit.url} className="h-9 min-w-64 flex-1" />
                      <a
                        href={snit.url}
                        download={`buitelyn-${dag.datum}-${u}.mp3`}
                        className="border-2 border-ink px-3 py-1 text-xs font-semibold hover:bg-paper"
                      >
                        Laai af ({mb(snit.grootte)})
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}
