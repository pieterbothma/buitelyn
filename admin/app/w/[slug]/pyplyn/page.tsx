import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { skuifKaart } from "@/app/actions";
import { skepKaart } from "@/app/actions-settings";

export const dynamic = "force-dynamic";

const KOLOMME = [
  { status: "beplan", naam: "Beplan" },
  { status: "produksie", naam: "In produksie" },
  { status: "gereed", naam: "Gereed" },
  { status: "gepubliseer", naam: "Gepubliseer" },
] as const;

export default async function Pyplyn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const week = new Date(Date.now() + 8 * 86_400_000).toISOString();
  const { data: kaarte } = await sb
    .from("cards")
    .select("id, titel, status, due_at, formats(naam)")
    .eq("workspace_id", active.id)
    .lt("due_at", week)
    .neq("status", "gemis")
    .order("due_at");

  const datumFmt = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const nou = Date.now();

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Pyplyn</h1>

      {/* Handmatige kaart — buite die herhalende reëls om */}
      <form
        action={skepKaart.bind(null, active.id)}
        className="mt-5 flex max-w-3xl flex-wrap items-center gap-2 border-2 border-ink bg-offwhite p-3"
      >
        <input
          name="titel"
          required
          placeholder="Nuwe kaart — titel"
          className="min-w-48 flex-1 border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
        />
        <input
          name="wanneer"
          type="datetime-local"
          required
          className="border-2 border-ink bg-paper px-3 py-1.5 text-sm outline-none focus:border-red"
        />
        <button className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85">
          + Voeg by
        </button>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KOLOMME.map((kol) => (
          <section key={kol.status} className="border-2 border-ink bg-offwhite">
            <h2 className="border-b-2 border-ink px-3 py-2 text-xs font-semibold tracking-[0.14em]">
              {kol.naam.toUpperCase()}
            </h2>
            <ul className="min-h-24 divide-y divide-ink/10">
              {(kaarte ?? [])
                .filter((k) => k.status === kol.status)
                .map((k) => {
                  const laat = new Date(k.due_at).getTime() < nou && k.status !== "gepubliseer";
                  const fmt = k.formats as unknown as { naam: string } | null;
                  return (
                    <li key={k.id} className="px-3 py-2.5">
                      <p className="text-sm font-semibold">{k.titel}</p>
                      <p className={`mt-0.5 text-xs ${laat ? "font-semibold text-red" : "text-ink/50"}`}>
                        {datumFmt.format(new Date(k.due_at))}
                        {fmt ? ` · ${fmt.naam}` : ""}
                        {laat ? " · LAAT" : ""}
                      </p>
                      <div className="mt-1.5 flex gap-2">
                        {kol.status !== "beplan" ? (
                          <form action={skuifKaart.bind(null, k.id, "terug")}>
                            <button className="text-xs font-semibold text-ink/50 hover:text-ink">← terug</button>
                          </form>
                        ) : null}
                        {kol.status !== "gepubliseer" ? (
                          <form action={skuifKaart.bind(null, k.id, "vorentoe")}>
                            <button className="text-xs font-semibold underline-offset-2 hover:underline">
                              vorentoe →
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </Shell>
  );
}
