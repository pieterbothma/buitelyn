"use server";

import { supabaseServer } from "@/lib/supabase/server";

export type TikkerTreffer = { simbool: string; naam: string; beurs: string };

/** Proxy na buitelyn.com se publieke tikker-soek (bediener-kant, geen CORS). */
export async function soekTikkers(q: string): Promise<TikkerTreffer[]> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || q.trim().length < 2) return [];
  try {
    const res = await fetch(
      `https://www.buitelyn.com/api/markte/soek?q=${encodeURIComponent(q.trim())}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const d = await res.json();
    return (d.resultate ?? []) as TikkerTreffer[];
  } catch {
    return [];
  }
}
