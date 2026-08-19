import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { KaartStudio } from "@/components/kaart/kaart-studio";
import { lysKaarte } from "@/app/actions-kaarte";

export const dynamic = "force-dynamic";

export default async function Kaarte({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
    new Date()
  );
  const kaarte = await lysKaarte();

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      {/* Ekstra sy-ruimte bo-op Shell se px-8. Op 'n smal venster loop die
          gestoorde-kaarte-rooster na een kolom en die kaart raak dan feitlik
          aan die rand — 32px is te min vir 'n blad wat uit groot beelde
          bestaan. */}
      <div className="px-4 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Kaart-bouer</h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Kies &apos;n styl, tik die teks, en kry &apos;n Buitelyn-kaart in enige formaat. Die
        voorskou is presies wat gestoor word.
      </p>
      <div className="mt-6">
        <KaartStudio datum={datum} aanvanklikeKaarte={kaarte} />
      </div>
      </div>
    </Shell>
  );
}
