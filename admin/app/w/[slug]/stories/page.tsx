import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { lêerSkakel, skepStorie, stelStorieStatus, voegLêerBy } from "@/app/actions-stories";

export const dynamic = "force-dynamic";

const STATUSSE = ["nuut", "oorweeg", "produksie", "afgehandel", "afgekeur"] as const;
const STATUS_NAAM: Record<string, string> = {
  nuut: "Nuut",
  oorweeg: "Oorweeg",
  produksie: "In produksie",
  afgehandel: "Afgehandel",
  afgekeur: "Afgekeur",
};

export default async function Stories({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "promenader") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { data: stories } = await sb
    .from("stories")
    .select("id, titel, bron_naam, bron_kontak, notas, status, geskep_at, story_files(id, path, naam)")
    .eq("workspace_id", active.id)
    .order("geskep_at", { ascending: false });

  const lêersMetSkakels = new Map<string, string>();
  for (const s of stories ?? []) {
    for (const f of s.story_files ?? []) {
      const url = await lêerSkakel(f.path);
      if (url) lêersMetSkakels.set(f.id, url);
    }
  }

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Stories</h1>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <ul className="space-y-4">
          {(stories ?? []).length === 0 ? (
            <li className="border-2 border-ink bg-offwhite px-4 py-6 text-sm text-ink/50">
              Nog geen stories nie.
            </li>
          ) : (
            (stories ?? []).map((s) => (
              <li key={s.id} className="border-2 border-ink bg-offwhite p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold">{s.titel}</p>
                  <span className="border border-ink/30 px-1.5 py-0.5 text-xs font-semibold uppercase">
                    {STATUS_NAAM[s.status]}
                  </span>
                </div>
                {s.bron_naam || s.bron_kontak ? (
                  <p className="mt-1 text-xs text-ink/60">
                    Bron: {[s.bron_naam, s.bron_kontak].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {s.notas ? <p className="mt-2 text-sm text-ink/70">{s.notas}</p> : null}
                {(s.story_files ?? []).length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                    {(s.story_files ?? []).map((f) => (
                      <li key={f.id}>
                        <a
                          href={lêersMetSkakels.get(f.id) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                        >
                          📎 {f.naam}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {STATUSSE.filter((st) => st !== s.status).map((st) => (
                    <form key={st} action={stelStorieStatus.bind(null, s.id, st)}>
                      <button className="border border-ink/40 px-2 py-1 text-xs font-semibold hover:bg-ink hover:text-offwhite">
                        → {STATUS_NAAM[st]}
                      </button>
                    </form>
                  ))}
                  <form action={voegLêerBy.bind(null, s.id)} className="ml-auto flex items-center gap-2">
                    <input type="file" name="lêer" className="max-w-52 cursor-pointer text-xs file:mr-2 file:cursor-pointer file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-offwhite" />
                    <button className="text-xs font-semibold underline-offset-2 hover:underline">
                      laai op
                    </button>
                  </form>
                </div>
              </li>
            ))
          )}
        </ul>

        <form
          action={skepStorie.bind(null, active.id)}
          className="space-y-3 self-start border-2 border-ink bg-offwhite p-4"
        >
          <h2 className="text-sm font-semibold tracking-[0.14em]">NUWE STORIE</h2>
          <input name="titel" required placeholder="Titel" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <input name="bron_naam" placeholder="Bron se naam" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <input name="bron_kontak" placeholder="Bron se kontak" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <textarea name="notas" rows={3} placeholder="Notas" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red" />
          <input type="file" name="lêer" className="w-full cursor-pointer border-2 border-dashed border-ink/40 bg-paper p-2 text-xs file:mr-3 file:cursor-pointer file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-offwhite hover:border-ink" />
          <button className="w-full bg-ink py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85">
            Stoor storie
          </button>
        </form>
      </div>
    </Shell>
  );
}
