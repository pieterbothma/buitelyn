import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* Profielfoto-oplaai → publieke avatars-emmer + profiele.avatar_url.
   Gedeel deur die /profiel-blad en die Liga-aanboording. */

const MAKS_GROOTTE = 3 * 1024 * 1024;
const TIPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: NextRequest) {
  const sessie = await supabaseServer();
  const {
    data: { user },
  } = await sessie.auth.getUser();
  if (!user) return NextResponse.json({ fout: "nie aangemeld" }, { status: 401 });

  const vorm = await request.formData().catch(() => null);
  const lêer = vorm?.get("foto");
  if (!(lêer instanceof File)) return NextResponse.json({ fout: "geen foto" }, { status: 400 });
  if (!TIPES[lêer.type]) return NextResponse.json({ fout: "net JPG, PNG of WebP" }, { status: 400 });
  if (lêer.size > MAKS_GROOTTE) return NextResponse.json({ fout: "maksimum 3 MB" }, { status: 400 });

  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const pad = `${user.id}.${TIPES[lêer.type]}`;
  const { error } = await sb.storage.from("avatars").upload(pad, lêer, {
    contentType: lêer.type,
    upsert: true,
    cacheControl: "300",
  });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  const url = `${process.env.APHQ_SUPABASE_URL}/storage/v1/object/public/avatars/${pad}?v=${Date.now()}`;
  await sb.from("profiele").upsert({ user_id: user.id, avatar_url: url }, { onConflict: "user_id" });
  return NextResponse.json({ ok: true, url });
}
