import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { SosiaalStudio } from "@/components/sosiaal-studio";
import { parseerKonsepStories } from "@/lib/konsep-stories";

export const dynamic = "force-dynamic";

export default async function Sosiaal({ params }: { params: Promise<{ slug: string }> }) {
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
  const { data: konsep } = await sb
    .from("nuusbrief_konsepte")
    .select("teks")
    .eq("datum", datum)
    .maybeSingle();
  const stukke = konsep?.teks ? parseerKonsepStories(konsep.teks) : [];

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Sosiale Media</h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Vandag se nuusbrief as plasings: branded poskaarte, platform-tekste, en binnekort
        video.
      </p>
      <div className="mt-6">
        <SosiaalStudio datum={datum} stukke={stukke} />
      </div>
    </Shell>
  );
}
