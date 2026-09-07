import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { GrafiekStudio } from "@/components/grafiek-studio";

export const dynamic = "force-dynamic";

export default async function Grafiek({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Grafiek-bouer</h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Publikasie-gereed grafieke in Buitelyn se taal — vergelyk aandele, wys &apos;n prys oor
        tyd, of staaf &apos;n periode se wenners en verloorders. Landskap, klaar vir die
        nuusbrief en sosiale media.
      </p>
      <div className="mt-6">
        <GrafiekStudio />
      </div>
    </Shell>
  );
}
