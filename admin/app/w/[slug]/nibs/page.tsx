import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { NibsStudio } from "@/components/nibs-studio";

export const dynamic = "force-dynamic";

export default async function Nibs({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  /* Net Buitelyn het NIBS — dieselfde hek as die oudio-blad. */
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
      <h1 className="text-2xl font-extrabold tracking-tight">Nibs</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/60">
        Plak teks, vertaal dit na Afrikaans, maak dit gereed vir voorlesing en laat een van die
        stemme dit praat.
      </p>
      <NibsStudio />
    </Shell>
  );
}
