import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { stoorInstellings } from "@/app/actions-settings";

export const dynamic = "force-dynamic";

export default async function Instellings({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { data: instellings } = await sb
    .from("entity_settings")
    .select("bank_besonderhede, faktuur_epos_from, logo_path")
    .eq("workspace_id", active.id)
    .maybeSingle();

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Instellings</h1>
      <p className="mt-1 text-sm text-ink/60">Faktuur-besonderhede vir {active.naam}.</p>
      <form
        action={stoorInstellings.bind(null, active.id)}
        className="mt-6 max-w-md space-y-4 border-2 border-ink bg-offwhite p-5"
      >
        <label className="block text-sm font-semibold">
          Logo (verskyn op fakture)
          {instellings?.logo_path ? (
            <span className="ml-2 text-xs font-normal text-green">✓ opgelaai</span>
          ) : null}
          <input
            type="file"
            name="logo"
            accept="image/*"
            className="mt-2 block w-full cursor-pointer border-2 border-dashed border-ink/40 bg-paper p-2 text-xs font-normal file:mr-3 file:cursor-pointer file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-offwhite hover:border-ink"
          />
        </label>
        <label className="block text-sm font-semibold">
          Bankbesonderhede
          <textarea
            name="bank_besonderhede"
            rows={4}
            defaultValue={instellings?.bank_besonderhede ?? ""}
            placeholder={"Bank: …\nRek: …\nTak: …"}
            className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-normal outline-none focus:border-red"
          />
        </label>
        <label className="block text-sm font-semibold">
          Faktuur-afsender (e-pos)
          <input
            name="faktuur_epos_from"
            defaultValue={instellings?.faktuur_epos_from ?? ""}
            placeholder="Buitelyn <fakture@buitelyn.co.za>"
            className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-normal outline-none focus:border-red"
          />
          <span className="mt-1 block text-xs font-normal text-ink/50">
            Moet 'n Resend-geverifieerde domein wees.
          </span>
        </label>
        <button className="w-full bg-ink py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85">
          Stoor instellings
        </button>
      </form>
    </Shell>
  );
}
