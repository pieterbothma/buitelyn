// Route handler (not a server action): the redirect to Unipile's OFF-ORIGIN
// hosted-auth page needs a plain HTTP 303 — a server action's redirect() to
// another origin doesn't reliably become a full navigation (onemanband note).
import { supabaseServer } from "@/lib/supabase/server";
import { createHostedAuthLink, unipileConfigured } from "@/lib/unipile";

export async function POST() {
  if (!unipileConfigured()) {
    return Response.json({ fout: "Unipile is nie opgestel nie." }, { status: 503 });
  }
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return Response.json({ fout: "verbode" }, { status: 401 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ap-hq.vercel.app";
  const url = await createHostedAuthLink({
    state: process.env.CRON_SECRET ?? "ap-hq",
    successRedirect: `${site}/epos?koppel=sukses`,
    failureRedirect: `${site}/epos?koppel=fout`,
    notifyUrl: `${site}/api/unipile/notify`,
  });
  return Response.redirect(url, 303);
}
