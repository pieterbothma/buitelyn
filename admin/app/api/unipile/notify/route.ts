// Unipile's hosted auth finishes ASYNCHRONOUSLY: their server POSTs here with
// { status, account_id, name } once the account connects. `name` carries our
// state secret — the auth check for this unauthenticated server-to-server call.
import { NextResponse, type NextRequest } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { kryAccount } from "@/lib/unipile";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.account_id) return NextResponse.json({ ok: false }, { status: 400 });
  if (body.name !== (process.env.CRON_SECRET ?? "ap-hq")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let provider: string | undefined;
  let epos: string | undefined;
  try {
    ({ provider, epos } = await kryAccount(body.account_id));
  } catch {
    /* details are nice-to-have */
  }

  const svc = supabaseService();
  await svc.from("email_accounts").upsert(
    { account_id: body.account_id, provider: provider ?? null, epos: epos ?? null },
    { onConflict: "account_id" }
  );
  return NextResponse.json({ ok: true });
}
