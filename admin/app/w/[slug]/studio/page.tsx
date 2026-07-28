import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";

export const dynamic = "force-dynamic";

/* Die Buitelyn-Studio: een tuiste vir die skeppende gereedskap wat uit die
   /markte-pyplyn en die show groei — nuwe features kry hier 'n kaart. */
const GEREEDSKAP = [
  {
    pad: "konsep",
    naam: "Nuusbrief-konsep",
    wat: "Gemini skryf 'n Substack-konsep uit die markte-pyplyn — dagoorsig, top-nuus met skakels, live syfers. Redigeer en plak.",
  },
  {
    pad: "oudio",
    naam: "Nuusbrief → Audio",
    wat: "Maak 'n ElevenLabs-audio-weergawe van 'n nuusbrief-uitgawe.",
  },
  {
    pad: "sosiaal",
    naam: "Sosiale Media",
    wat: "Vandag se nuusbrief as plasings: branded poskaarte, platform-tekste, en binnekort video met audio.",
  },
  {
    pad: "grafiek",
    naam: "Grafiek-bouer",
    wat: "Publikasie-gereed grafieke: vergelyk aandele (%), prys oor tyd, of staaf 'n periode se wenners — in Buitelyn se raam.",
  },
];

export default async function Studio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight">
        Studio
        <span aria-hidden className="size-2.5 rounded-full bg-red" />
      </h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Buitelyn se skeppende gereedskap — hier kom nuwe features by soos ons bou.
      </p>
      <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
        {GEREEDSKAP.map((g) => (
          <Link
            key={g.pad}
            href={`/w/${slug}/${g.pad}`}
            className="group border-2 border-ink bg-offwhite p-5 hover:bg-paper"
          >
            <h2 className="text-lg font-extrabold tracking-tight group-hover:underline">
              {g.naam} →
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">{g.wat}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
