import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, slug, naam, accent, skool_url")
    .order("posisie");

  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-4 rounded-full"
          style={{ backgroundColor: active.accent }}
        />
        <h1 className="text-3xl font-extrabold tracking-tight">{active.naam}</h1>
      </div>
      <p className="mt-4 max-w-lg text-sm text-ink/60">
        Kies 'n module in die kantbalk — Pyplyn, Idees, Kliënte, Fakture
        {slug === "promenader" ? ", Stories" : ""}
        {slug === "buitelyn" ? ", Nuusbrief → Oudio" : ""}. (Modules kom aanlyn soos
        ons M1–M6 aflewer.)
      </p>
      {slug === "afna" && active.skool_url ? (
        <a
          href={active.skool_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-11 items-center bg-ink px-5 text-sm font-semibold text-offwhite hover:bg-ink/85"
        >
          Open Skool-gemeenskap →
        </a>
      ) : null}
    </Shell>
  );
}
