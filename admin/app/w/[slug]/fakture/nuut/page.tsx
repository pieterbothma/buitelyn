import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { InvoiceForm } from "@/components/invoice-form";

export const dynamic = "force-dynamic";

export default async function NuweFaktuur({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { data: kliente } = await sb
    .from("clients")
    .select("id, naam")
    .eq("workspace_id", active.id)
    .order("naam");

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Nuwe faktuur</h1>
      {(kliente ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">
          Skep eers 'n kliënt onder{" "}
          <Link href={`/w/${slug}/kliente`} className="font-semibold underline">
            Kliënte
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6">
          <InvoiceForm slug={slug} kliente={kliente ?? []} />
        </div>
      )}
    </Shell>
  );
}
