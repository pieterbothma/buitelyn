import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function Vandag() {
  const supabase = await supabaseServer();
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");

  const vandagBegin = new Date();
  vandagBegin.setHours(0, 0, 0, 0);
  const vandagEinde = new Date(vandagBegin);
  vandagEinde.setDate(vandagEinde.getDate() + 1);

  const [{ data: verval }, { data: vandag }, { data: onbetaal }, { count: inbox }] =
    await Promise.all([
      supabase
        .from("cards")
        .select("id, titel, due_at, workspaces(naam, accent)")
        .lt("due_at", vandagBegin.toISOString())
        .not("status", "in", '("gepubliseer","gemis")')
        .order("due_at")
        .limit(10),
      supabase
        .from("cards")
        .select("id, titel, status, due_at, workspaces(naam, accent)")
        .gte("due_at", vandagBegin.toISOString())
        .lt("due_at", vandagEinde.toISOString())
        .order("due_at"),
      supabase
        .from("invoices")
        .select("id, nommer, status, workspaces(naam)")
        .eq("status", "gestuur")
        .limit(10),
      supabase
        .from("ideas")
        .select("id", { count: "exact", head: true })
        .is("workspace_id", null),
    ]);

  const tydFmt = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" });

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]}>
      <h1 className="text-3xl font-extrabold tracking-tight">Vandag</h1>
      <p className="mt-1 text-sm text-ink/60">
        {new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg",
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border-2 border-ink bg-offwhite p-5">
          <h2 className="text-sm font-semibold tracking-[0.14em]">MOET VANDAG UIT</h2>
          <ul className="mt-3 divide-y divide-ink/10">
            {(vandag ?? []).length === 0 ? (
              <li className="py-3 text-sm text-ink/50">Niks geskeduleer nie.</li>
            ) : (
              (vandag ?? []).map((c) => {
                const ws = c.workspaces as unknown as { naam: string; accent: string } | null;
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ backgroundColor: ws?.accent ?? "#1a1a1a" }}
                    />
                    <span className="font-semibold">{c.titel}</span>
                    <span className="ml-auto text-ink/50">{tydFmt.format(new Date(c.due_at))}</span>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="border-2 border-ink bg-offwhite p-5">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-red">AGTERSTALLIG</h2>
          <ul className="mt-3 divide-y divide-ink/10">
            {(verval ?? []).length === 0 ? (
              <li className="py-3 text-sm text-ink/50">Niks agterstallig nie. 🎉</li>
            ) : (
              (verval ?? []).map((c) => (
                <li key={c.id} className="py-2.5 text-sm font-semibold">
                  {c.titel}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border-2 border-ink bg-offwhite p-5">
          <h2 className="text-sm font-semibold tracking-[0.14em]">ONBETAALDE FAKTURE</h2>
          <ul className="mt-3 divide-y divide-ink/10">
            {(onbetaal ?? []).length === 0 ? (
              <li className="py-3 text-sm text-ink/50">Alles betaal.</li>
            ) : (
              (onbetaal ?? []).map((f) => (
                <li key={f.id} className="py-2.5 text-sm font-semibold">
                  {f.nommer}
                </li>
              ))
            )}
          </ul>
        </section>

        <a href="/inbox" className="block border-2 border-ink bg-offwhite p-5 hover:bg-paper">
          <h2 className="text-sm font-semibold tracking-[0.14em]">INBOX →</h2>
          <p className="mt-3 text-sm text-ink/70">
            <span className="text-2xl font-extrabold">{inbox ?? 0}</span> ongesorteerde idee
            {(inbox ?? 0) === 1 ? "" : "s"} — tag hulle in 'n werkruimte.
          </p>
        </a>
      </div>
    </Shell>
  );
}
