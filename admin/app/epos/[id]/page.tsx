import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { kryEpos } from "@/lib/unipile";
import { ReplyModal } from "@/components/reply-modal";

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
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink px-5 py-4">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold">{epos.onderwerp}</h1>
            <p className="mt-1 text-sm text-ink/60">
              {epos.van_naam}
              {epos.van_epos ? ` <${epos.van_epos}>` : ""}
              {epos.datum ? ` · ${datumFmt.format(new Date(epos.datum))}` : ""}
            </p>
          </div>
          {epos.van_epos ? (
            <ReplyModal
              na={epos.van_epos}
              onderwerp={epos.onderwerp.startsWith("Re:") ? epos.onderwerp : `Re: ${epos.onderwerp}`}
              replyTo={epos.provider_id ?? ""}
              terug={`/epos/${encodeURIComponent(epos.id)}`}
            />
          ) : null}
        </div>
        <div className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed">{epos.teks}</div>
      </div>

      {gestuur ? (
        <p className="mt-4 max-w-3xl border-2 border-green bg-offwhite p-3 text-sm font-semibold">
          Antwoord gestuur ✓
        </p>
      ) : null}
    </Shell>
  );
}
