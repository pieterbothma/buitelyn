import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { BeeldGereedskap } from "@/components/kaart/beeld-gereedskap";

export const dynamic = "force-dynamic";

export default async function Beeld({ params }: { params: Promise<{ slug: string }> }) {
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

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Beeld-gereedskap</h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Verwyder &apos;n agtergrond, sny die beeld, laai dit af. Die
        agtergrond-verwydering loop heeltemal in jou blaaier — die beeld gaan
        nêrens heen nie.
      </p>
      <div className="mt-6">
        <BeeldGereedskap datum={datum} />
      </div>
    </Shell>
  );
}
