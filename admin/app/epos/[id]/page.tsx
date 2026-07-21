import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { kryEpos } from "@/lib/unipile";
import { antwoordEpos } from "@/app/actions-epos";

export const dynamic = "force-dynamic";

export default async function EposDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vouer?: string; gestuur?: string }>;
}) {
  const { id } = await params;
  const { vouer, gestuur } = await searchParams;
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");

  const { data: rekening } = await sb
    .from("email_accounts")
    .select("account_id")
    .order("geskep_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!rekening) notFound();

  let epos;
  try {
    epos = await kryEpos(rekening.account_id, decodeURIComponent(id));
  } catch {
    notFound();
  }

  const datumFmt = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const terug = `/epos${vouer ? `?vouer=${encodeURIComponent(vouer)}` : ""}`;

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]}>
      <Link href={terug} className="text-sm font-semibold text-ink/60 hover:text-ink hover:underline">
        ← Terug na e-pos
      </Link>

      <div className="mt-4 max-w-3xl border-2 border-ink bg-offwhite">
        <div className="border-b-2 border-ink px-5 py-4">
          <h1 className="text-xl font-extrabold">{epos.onderwerp}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {epos.van_naam}
            {epos.van_epos ? ` <${epos.van_epos}>` : ""}
            {epos.datum ? ` · ${datumFmt.format(new Date(epos.datum))}` : ""}
          </p>
        </div>
        <div className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed">{epos.teks}</div>
      </div>

      {gestuur ? (
        <p className="mt-4 max-w-3xl border-2 border-green bg-offwhite p-3 text-sm font-semibold">
          Antwoord gestuur ✓
        </p>
      ) : epos.van_epos ? (
        <form action={antwoordEpos} className="mt-6 max-w-3xl space-y-3 border-2 border-ink bg-offwhite p-5">
          <h2 className="text-sm font-semibold tracking-[0.14em]">ANTWOORD AAN {epos.van_epos.toUpperCase()}</h2>
          <input type="hidden" name="na" value={epos.van_epos} />
          <input type="hidden" name="onderwerp" value={`Re: ${epos.onderwerp}`} />
          <input type="hidden" name="reply_to" value={epos.provider_id ?? ""} />
          <input type="hidden" name="terug" value={`/epos/${encodeURIComponent(epos.id)}`} />
          <textarea
            name="teks"
            rows={6}
            required
            placeholder="Skryf jou antwoord…"
            className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
          />
          <button className="bg-ink px-6 py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85">
            Stuur antwoord →
          </button>
        </form>
      ) : null}
    </Shell>
  );
}
