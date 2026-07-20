import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { parseFeedMetTeks } from "@/lib/feed";
import { AudioStudio } from "@/components/audio-studio";

export const dynamic = "force-dynamic";

export default async function Oudio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  let posts: { title: string; url: string; teks: string }[] = [];
  try {
    const res = await fetch("https://buitelyn.substack.com/feed", {
      next: { revalidate: 600 },
      headers: { "user-agent": "Mozilla/5.0 (compatible; APHQ/1.0)" },
    });
    posts = parseFeedMetTeks(await res.text()).map((p) => ({
      title: p.title,
      url: p.url,
      teks: p.teks,
    }));
  } catch {
    // feed af — wys leë lys
  }

  const { data: geskiedenis } = await sb
    .from("audio_episodes")
    .select("id, titel, geskep_at")
    .order("geskep_at", { ascending: false })
    .limit(8);

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Nuusbrief → Oudio</h1>
      <div className="mt-6">
        <AudioStudio posts={posts} />
      </div>
      {(geskiedenis ?? []).length > 0 ? (
        <div className="mt-8 max-w-md">
          <h2 className="text-sm font-semibold tracking-[0.14em]">GESKIEDENIS</h2>
          <ul className="mt-2 divide-y divide-ink/10 border-2 border-ink bg-offwhite text-sm">
            {(geskiedenis ?? []).map((e) => (
              <li key={e.id} className="px-3 py-2">
                {e.titel}
                <span className="ml-2 text-xs text-ink/50">
                  {new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short" }).format(
                    new Date(e.geskep_at)
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Shell>
  );
}
