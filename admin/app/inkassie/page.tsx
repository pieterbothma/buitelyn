import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { skrapIdee, tagIdee } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Inkassie() {
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");

  const { data: idees } = await sb
    .from("ideas")
    .select("id, titel, nota, bron, geskep_at")
    .is("workspace_id", null)
    .order("geskep_at", { ascending: false });

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]}>
      <h1 className="text-3xl font-extrabold tracking-tight">Inkassie</h1>
      <p className="mt-1 text-sm text-ink/60">Ongesorteerde idees — tag elkeen in 'n werkruimte.</p>
      <ul className="mt-6 max-w-3xl divide-y divide-ink/10 border-2 border-ink bg-offwhite">
        {(idees ?? []).length === 0 ? (
          <li className="px-4 py-6 text-sm text-ink/50">Inkassie is leeg. 🎉</li>
        ) : (
          (idees ?? []).map((i) => (
            <li key={i.id} className="px-4 py-3">
              <p className="font-semibold">{i.titel}</p>
              {i.nota ? <p className="mt-1 text-sm text-ink/70">{i.nota}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(workspaces ?? []).map((w) => (
                  <form key={w.id} action={tagIdee.bind(null, i.id, w.id)}>
                    <button
                      className="border-2 border-ink bg-paper px-2 py-1 text-xs font-semibold hover:bg-ink hover:text-offwhite"
                      style={{ borderColor: w.accent }}
                    >
                      {w.naam}
                    </button>
                  </form>
                ))}
                <form action={skrapIdee.bind(null, i.id)}>
                  <button className="px-2 py-1 text-xs font-semibold text-red/80 hover:text-red">skrap</button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>
    </Shell>
  );
}
