import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { formatRand, invoiceTotalSent } from "@/lib/invoices";
import { merkBetaal, stuurFaktuur } from "@/app/actions-invoices";

export const dynamic = "force-dynamic";

export default async function FaktuurDetail({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { data: f } = await sb
    .from("invoices")
    .select(
      "id, nommer, status, uitgereik_op, betaal_op, notas, clients(naam, epos), invoice_lines(beskrywing, aantal, eenheidsprys_sent, posisie)"
    )
    .eq("id", id)
    .single();
  if (!f) notFound();

  const kl = f.clients as unknown as { naam: string; epos: string | null };
  const lyne = (f.invoice_lines ?? []).sort((a, b) => a.posisie - b.posisie);

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">{f.nommer}</h1>
        <span className="border-2 border-ink px-2 py-0.5 text-xs font-semibold uppercase">
          {f.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        {kl.naam} · uitgereik {f.uitgereik_op}
        {f.betaal_op ? ` · betaal ${f.betaal_op}` : ""}
      </p>

      <div className="mt-6 max-w-2xl border-2 border-ink bg-offwhite">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="px-4 py-2">Beskrywing</th>
              <th className="px-4 py-2 text-right">Aantal</th>
              <th className="px-4 py-2 text-right">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {lyne.map((l, i) => (
              <tr key={i} className="border-b border-ink/10">
                <td className="px-4 py-2">{l.beskrywing}</td>
                <td className="px-4 py-2 text-right">{l.aantal}</td>
                <td className="px-4 py-2 text-right">
                  {formatRand(Math.round(l.aantal * l.eenheidsprys_sent))}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="px-4 py-3 text-right font-extrabold">
                TOTAAL
              </td>
              <td className="px-4 py-3 text-right font-extrabold">
                {formatRand(invoiceTotalSent(lyne))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`/api/invoices/${f.id}/pdf`}
          target="_blank"
          className="flex h-11 items-center border-2 border-ink px-5 text-sm font-semibold hover:bg-offwhite"
        >
          Bekyk PDF
        </a>
        {f.status !== "betaal" ? (
          <>
            <form action={stuurFaktuur.bind(null, f.id)}>
              <button
                className="flex h-11 items-center bg-ink px-5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-40"
                disabled={!kl.epos}
                title={kl.epos ? "" : "Kliënt het geen e-pos nie"}
              >
                {f.status === "gestuur" ? "Stuur weer" : "Stuur per e-pos →"}
              </button>
            </form>
            <form action={merkBetaal.bind(null, f.id)}>
              <button className="flex h-11 items-center border-2 border-green px-5 text-sm font-semibold text-green hover:bg-green hover:text-offwhite">
                Merk as betaal ✓
              </button>
            </form>
          </>
        ) : null}
      </div>
      {f.notas ? <p className="mt-4 text-sm text-ink/60">{f.notas}</p> : null}
    </Shell>
  );
}
