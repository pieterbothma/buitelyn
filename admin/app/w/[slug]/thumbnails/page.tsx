import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { DuimnaelStudio } from "@/components/duimnael/studio";
import { lysReaksies } from "@/app/actions-duimnael";
import { VERSTEK_PROMPT } from "@/lib/duimnael/spec";

export const dynamic = "force-dynamic";

export default async function Thumbnails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb.from("workspaces").select("id, slug, naam, accent").order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const reaksies = await lysReaksies();

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight">
        Thumbnails
        <span aria-hidden className="size-2.5 rounded-full bg-red" />
      </h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Kies &apos;n reaksie, laai vandag se onderwerpe op vir &apos;n agtergrond, en sleep die teks waar jy dit wil hê.
      </p>
      <div className="mt-6">
        <DuimnaelStudio reaksies={reaksies} verstekPrompt={VERSTEK_PROMPT} />
      </div>
    </Shell>
  );
}
