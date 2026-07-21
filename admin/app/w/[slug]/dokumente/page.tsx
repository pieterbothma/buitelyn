import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { dokumentSkakel, laaiDokumentOp, skrapDokument } from "@/app/actions-documents";

export const dynamic = "force-dynamic";

export default async function Dokumente({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ vouer?: string }>;
}) {
  const { slug } = await params;
  const { vouer } = await searchParams;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { data: alle } = await sb
    .from("documents")
    .select("id, vouer, naam, bucket, path, geskep_at")
    .eq("workspace_id", active.id)
    .order("geskep_at", { ascending: false });

  const vouers = Array.from(new Set(["Fakture", "Kwotasies", ...(alle ?? []).map((d) => d.vouer)]));
  const aktief = vouer && vouers.includes(vouer) ? vouer : vouers[0];
  const lêers = (alle ?? []).filter((d) => d.vouer === aktief);

  const skakels = new Map<string, string>();
  for (const d of lêers) {
    const url = await dokumentSkakel(d.bucket, d.path);
    if (url) skakels.set(d.id, url);
  }

  const datumFmt = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Dokumente</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Vouers */}
        <div className="self-start border-2 border-ink bg-offwhite">
          <ul>
            {vouers.map((v) => (
              <li key={v}>
                <Link
                  href={`/w/${slug}/dokumente?vouer=${encodeURIComponent(v)}`}
                  className={`block px-3 py-2 text-sm font-semibold hover:bg-paper ${
                    v === aktief ? "bg-paper" : ""
                  }`}
                >
                  📁 {v}
                </Link>
              </li>
            ))}
          </ul>
          {/* Nuwe vouer = navigeer soontoe; hy bestaan sodra 'n lêer opgelaai word */}
          <form
            action={async (vorm: FormData) => {
              "use server";
              const { redirect } = await import("next/navigation");
              const naam = String(vorm.get("naam") ?? "").trim();
              if (naam) redirect(`/w/${slug}/dokumente?vouer=${encodeURIComponent(naam)}`);
            }}
            className="flex gap-1 border-t border-ink/15 p-2"
          >
            <input
              name="naam"
              placeholder="Nuwe vouer"
              className="min-w-0 flex-1 border border-ink/40 bg-paper px-2 py-1 text-xs outline-none focus:border-ink"
            />
            <button className="bg-ink px-2 py-1 text-xs font-semibold text-offwhite">+</button>
          </form>
        </div>

        {/* Lêers */}
        <div>
          <form
            action={laaiDokumentOp.bind(null, active.id, aktief)}
            className="flex max-w-xl items-center gap-2 border-2 border-ink bg-offwhite p-3"
          >
            <input
              type="file"
              name="lêer"
              required
              className="min-w-0 flex-1 cursor-pointer text-xs file:mr-3 file:cursor-pointer file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-offwhite"
            />
            <button className="shrink-0 bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85">
              Laai op in {aktief} →
            </button>
          </form>

          <ul className="mt-4 max-w-xl divide-y divide-ink/10 border-2 border-ink bg-offwhite">
            {lêers.length === 0 ? (
              <li className="px-4 py-6 text-sm text-ink/50">
                Hierdie vouer is leeg{aktief === "Fakture" ? " — gestuurde fakture beland outomaties hier" : ""}.
              </li>
            ) : (
              lêers.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  <a
                    href={skakels.get(d.id) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm font-semibold underline-offset-2 hover:underline"
                  >
                    📄 {d.naam}
                  </a>
                  <span className="shrink-0 text-xs text-ink/50">
                    {datumFmt.format(new Date(d.geskep_at))}
                  </span>
                  <form action={skrapDokument.bind(null, d.id)}>
                    <button className="text-xs font-semibold text-red/70 hover:text-red">skrap</button>
                  </form>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </Shell>
  );
}
