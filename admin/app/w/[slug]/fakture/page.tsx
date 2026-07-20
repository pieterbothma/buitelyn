import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { formatRand, invoiceTotalSent } from "@/lib/invoices";

export const dynamic = "force-dynamic";

const STATUS_KLEUR: Record<string, string> = {
  konsep: "text-ink/50",
  gestuur: "text-red",
  betaal: "text-green",
};

export default async function Fakture({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { data: fakture } = await sb
    .from("invoices")
    .select("id, nommer, status, uitgereik_op, clients(naam), invoice_lines(aantal, eenheidsprys_sent)")
    .eq("workspace_id", active.id)
    .order("geskep_at", { ascending: false });

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Fakture</h1>
        <Link
          href={`/w/${slug}/fakture/nuut`}
          className="flex h-11 items-center bg-ink px-5 text-sm font-semibold text-offwhite hover:bg-ink/85"
        >
          Nuwe faktuur →
        </Link>
      </div>
      <ul className="mt-6 max-w-3xl divide-y divide-ink/10 border-2 border-ink bg-offwhite">
        {(fakture ?? []).length === 0 ? (
          <li className="px-4 py-6 text-sm text-ink/50">Nog geen fakture nie.</li>
        ) : (
          (fakture ?? []).map((f) => {
            const kl = f.clients as unknown as { naam: string } | null;
            return (
              <li key={f.id}>
                <Link href={`/w/${slug}/fakture/${f.id}`} className="flex items-baseline gap-4 px-4 py-3 hover:bg-paper">
                  <span className="font-semibold">{f.nommer}</span>
                  <span className="text-sm text-ink/60">{kl?.naam}</span>
                  <span className={`ml-auto text-xs font-semibold uppercase ${STATUS_KLEUR[f.status]}`}>
                    {f.status}
                  </span>
                  <span className="text-sm font-semibold">
                    {formatRand(invoiceTotalSent(f.invoice_lines ?? []))}
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </Shell>
  );
}
