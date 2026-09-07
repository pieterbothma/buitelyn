import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { KonsepStudio } from "@/components/konsep-studio";

export const dynamic = "force-dynamic";

export default async function NuusbriefKonsep({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ datum?: string }>;
}) {
  const { slug } = await params;
  const { datum: datumParam } = await searchParams;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const vandag = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
    new Date()
  );
  const datum = datumParam && /^\d{4}-\d{2}-\d{2}$/.test(datumParam) ? datumParam : vandag;
  const isVandag = datum === vandag;

  const { data: datums } = await sb
    .from("nuusbrief_konsepte")
    .select("datum")
    .order("datum", { ascending: false })
    .limit(21);
  const datumLys = [...new Set([vandag, ...(datums ?? []).map((d) => d.datum as string)])];
  const datumEtiket = (d: string) =>
    d === vandag
      ? "Vandag"
      : new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00Z`));
  const { data: konsep } = await sb
    .from("nuusbrief_konsepte")
    .select("teks")
    .eq("datum", datum)
    .maybeSingle();

  const { data: fotoLys } = await sb.storage.from("konsep-fotos").list(datum, { limit: 30 });
  const fotos = (fotoLys ?? [])
    .filter((f) => f.name.endsWith(".png"))
    .sort((a, b) => b.name.localeCompare(a.name))
    .map(
      (f) =>
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsep-fotos/${datum}/${f.name}`
    );

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Nuusbrief-konsep</h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Gemini skryf &apos;n eerste weergawe uit die /markte-pyplyn — dagoorsig, top-nuus met
        skakels, en live syfers. Jy redigeer en plak in Substack.
      </p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {datumLys.map((d) => (
          <a
            key={d}
            href={`/w/${slug}/konsep${d === vandag ? "" : `?datum=${d}`}`}
            className={`border-2 border-ink px-2.5 py-1 text-xs font-semibold ${
              d === datum ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
            }`}
          >
            {datumEtiket(d)}
          </a>
        ))}
      </div>
      <div className="mt-6">
        <KonsepStudio aanvanklik={konsep?.teks ?? ""} fotos={fotos} datum={datum} isVandag={isVandag} />
      </div>
    </Shell>
  );
}
