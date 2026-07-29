import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { OorsigStudio } from "@/components/oorsig-studio";
import { kryOorsigte } from "@/app/actions-oorsig";

export const dynamic = "force-dynamic";

export default async function Oorsig({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const argief = await kryOorsigte();
  const vandag = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Oorsigte</h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Die oggend-oorsig volgens die resep: gister se grootste JSE-skuiwe met &apos;n
        nuusgegronde rede, Bitcoin en Ethereum in dollar, groen of rooi dag in Amerika —
        en &apos;n storie om na uit te sien as daar een is. Teks eers, dan audio.
      </p>
      <div className="mt-6">
        <OorsigStudio argief={argief} vandag={vandag} />
      </div>
    </Shell>
  );
}
