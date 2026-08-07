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
  /* HH:MM in SAST, 24-uur, met voorloop-nul — 'n eenvoudige stringvergelyking
     teen TYE se waardes werk dan reg (bv. "18:03" > "17:50"). */
  const nouSast = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

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
                  /* Vandag se nog-onvoltooide uitgawes wys as hangend met hul tyd —
                     tensy die geskeduleerde tyd reeds verby is, want dan is dit nie
                     meer "nog nie" nie, dit is heel moontlik 'n gefaalde cron. */
                  if (!snit) {
                    if (dag.datum !== vandag) return null;
                    const verby = nouSast >= TYE[u];
                    return (
                      <li key={u} className="flex items-center gap-3 text-sm text-ink/40">
                        <span className="w-16 font-semibold tracking-[0.12em]">{u.toUpperCase()}</span>
                        <span>{verby ? "ontbreek" : `kom ${TYE[u]}`}</span>
                      </li>
                    );
                  }
                  return (
                    <li key={u} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="w-16 text-sm font-semibold tracking-[0.12em]">{u.toUpperCase()}</span>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio
                        controls
                        preload="none"
                        src={snit.url}
                        aria-label={`${u}-oorsig, ${dag.datumWoorde}`}
                        className="h-9 min-w-64 flex-1"
                      />
                      {/* Die HTML download-attribuut word oor kruis-oorsprong URL's
                          geïgnoreer (hq.buitelyn.com vs *.supabase.co), so Supabase
                          Storage se ?download=<naam> query-parameter dwing die
                          Content-Disposition: attachment-header af. Die <audio src>
                          hierbo bly op die kaal snit.url — 'n speler moet nie 'n
                          aflaai ontketen nie. Die download-attribuut bly ook staan;
                          dit is onskadelik en help as die bate ooit selfde-oorsprong word. */}
                      <a
                        href={`${snit.url}?download=buitelyn-${dag.datum}-${u}.mp3`}
                        download={`buitelyn-${dag.datum}-${u}.mp3`}
                        aria-label={`Laai af: ${u}-oorsig, ${dag.datumWoorde} (${mb(snit.grootte)})`}
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
