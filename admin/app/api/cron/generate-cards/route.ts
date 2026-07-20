import { NextResponse, type NextRequest } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { cardsForDate, type RecurringRule } from "@/lib/cards";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ fout: "verbode" }, { status: 401 });
  }

  const sb = supabaseService();
  const { data: rules, error } = await sb.from("recurring_rules").select("*");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  // Materialise today + 7 days ahead.
  const nuwe = [];
  for (let d = 0; d <= 7; d++) {
    const datum = new Date(Date.now() + d * 86_400_000);
    nuwe.push(...cardsForDate(datum, (rules ?? []) as RecurringRule[]));
  }
  const { error: upsertFout } = await sb
    .from("cards")
    .upsert(nuwe, { onConflict: "rule_id,due_at", ignoreDuplicates: true });
  if (upsertFout) return NextResponse.json({ fout: upsertFout.message }, { status: 500 });

  // Cards still unpublished 24h past due -> gemis.
  const grens = new Date(Date.now() - 86_400_000).toISOString();
  const { data: gemis } = await sb
    .from("cards")
    .update({ status: "gemis" })
    .in("status", ["beplan", "produksie", "gereed"])
    .lt("due_at", grens)
    .select("id");

  return NextResponse.json({ geskep: nuwe.length, gemis: gemis?.length ?? 0 });
}
