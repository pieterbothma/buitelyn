import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { kryArtikels, groepeerPerBron } from "@/lib/nuuspod";
import { NuusLys } from "@/components/nuus-lys";

/* force-dynamic, want die blad lees koekies deur supabaseServer(). Die
   KASSERING gebeur op die fetch in kryArtikels() — `next: { revalidate: 600 }`
   werk wel onder force-dynamic, ten spyte van wat die dokumentasie impliseer
   (gemeet in hierdie repo, sien die markte-werk). */
export const dynamic = "force-dynamic";

export default async function Nuus({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bron?: string }>;
}) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const { bron } = await searchParams;

  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const groepe = groepeerPerBron(await kryArtikels());
  /* 'n Onbekende ?bron= val terug op die eerste oortjie eerder as 'n leë blad. */
  const gekies = groepe.find((g) => g.bron === bron) ?? groepe[0];

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-2xl font-extrabold tracking-tight">Nuus</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/60">
        Dieselfde stories wat nuuspod inbring. Stuur enige een met een klik na Nibs.
      </p>

      {groepe.length === 0 ? (
        <p className="mt-8 border-2 border-ink bg-offwhite p-4 text-sm">
          Kon nie nuus haal nie. nuuspod is dalk af — probeer later weer.
        </p>
      ) : (
        <>
          {/* Die oortjies is SKAKELS, nie kliënt-toestand nie: 'n oortjie bly
              deelbaar en oorleef 'n herlaai. Sywaartse rol op 'n smal skerm,
              want ±15 bronne sou andersins oor drie rye vou. */}
          <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-ink/15 pb-px">
            {groepe.map((g) => (
              <Link
                key={g.bron}
                href={`/w/buitelyn/nuus?bron=${encodeURIComponent(g.bron)}`}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-semibold ${
                  g.bron === gekies.bron
                    ? "border-red text-ink"
                    : "border-transparent text-ink/60 hover:text-ink"
                }`}
              >
                {g.bron} <span className="text-ink/40">{g.artikels.length}</span>
              </Link>
            ))}
          </nav>

          <NuusLys artikels={gekies.artikels} />
        </>
      )}
    </Shell>
  );
}
