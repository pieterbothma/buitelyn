import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { KonsepStudio } from "@/components/konsep-studio";

export const dynamic = "force-dynamic";

export default async function NuusbriefKonsep({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Nuusbrief-konsep</h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Gemini skryf 'n eerste weergawe uit die /markte-pyplyn — dagoorsig, top-nuus met
        skakels, en live syfers. Jy redigeer en plak in Substack.
      </p>
      <div className="mt-6">
        <KonsepStudio aanvanklik={konsep?.teks ?? ""} />
      </div>
    </Shell>
  );
}
