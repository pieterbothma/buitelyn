import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { krySponsorKlikke } from "@/app/actions-sponsor";

export const dynamic = "force-dynamic";

/* CSV-veld-escaper (RFC 4180): 'n gids-slug behoort nooit 'n komma te bevat
   nie, maar as een ooit wel een het (of 'n aanhalingsteken of nuwe lyn), moet
   dit die kolomme nie korrup nie — dan word die veld in aanhalingstekens
   toegedraai en interne aanhalingstekens verdubbel. */
function csvVeld(w: string): string {
  return /[",\n]/.test(w) ? `"${w.replace(/"/g, '""')}"` : w;
}

export default async function SponsorKlikke({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb.from("workspaces").select("id, slug, naam, accent").order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const v = await krySponsorKlikke();
  // Beskerm teen deling deur nul: as verlede maand geen klikke gehad het nie
  // (of die tabel nog leeg/nie-bestaande is), is 'n persentasie-verandering
  // sinneloos — wys dan liewer niks as 'n misleidende syfer.
  const verskil = v.vorigeTotaal ? Math.round(((v.totaal - v.vorigeTotaal) / v.vorigeTotaal) * 100) : null;
  const csv = [
    "gids,plek,tydstempel",
    ...v.rou.map((r) => [r.gids, r.plek, r.geskep_at].map(csvVeld).join(",")),
  ].join("\n");

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Sponsor-klikke</h1>
      <p className="mt-2 max-w-xl text-sm text-ink/60">
        Klikke deur na EasyEquities, bediener-kant getel. Bekende kruipers word uitgesluit
        en dieselfde besoeker op dieselfde gids binne 30 sekondes tel een keer — die syfer
        is opsetlik konserwatief sodat dit in &apos;n gesprek staan.
      </p>

      <div className="mt-6 max-w-md border-2 border-ink bg-offwhite p-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-ink/50">{v.maand.toUpperCase()}</p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums">{v.totaal.toLocaleString("af-ZA")}</p>
        {verskil !== null ? (
          <p className={`mt-1 text-sm font-semibold ${verskil >= 0 ? "text-green" : "text-red"}`}>
            {verskil >= 0 ? "▲" : "▼"} {Math.abs(verskil)}% teenoor verlede maand ({v.vorigeTotaal})
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink/50">
            {v.totaal === 0
              ? "Nog geen klikke ontvang nie — dalk is die tabel nog nie aktief nie, of die maand het pas begin."
              : "Nog geen data vir verlede maand om mee te vergelyk nie."}
          </p>
        )}
      </div>

      <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="border-2 border-ink p-5">
          <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50">PER GIDS</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {v.perGids.length ? (
              v.perGids.map((r) => (
                <li key={r.gids} className="flex justify-between gap-4">
                  <span className="truncate">{r.gids}</span>
                  <span className="font-bold tabular-nums">{r.klikke}</span>
                </li>
              ))
            ) : (
              <li className="text-ink/50">Nog geen klikke dié maand nie.</li>
            )}
          </ul>
        </div>
        <div className="border-2 border-ink p-5">
          <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50">PER PLEK</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {v.perPlek.length ? (
              v.perPlek.map((r) => (
                <li key={r.plek} className="flex justify-between gap-4">
                  <span>{r.plek}</span>
                  <span className="font-bold tabular-nums">{r.klikke}</span>
                </li>
              ))
            ) : (
              <li className="text-ink/50">Nog geen klikke dié maand nie.</li>
            )}
          </ul>
        </div>
      </div>

      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
        download={`buitelyn-sponsor-klikke-${new Date().toISOString().slice(0, 7)}.csv`}
        className="mt-6 inline-block border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/90"
      >
        Laai CSV af
      </a>
    </Shell>
  );
}
