import { NextResponse, type NextRequest } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { loopAgent } from "@/lib/agent";
import { antwoordCallback, kryLêerUrl, stuurBoodskap, transkribeer } from "@/lib/telegram";
import { sendInvoiceEmail } from "@/lib/send-invoice";

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = await request.json();

  try {
    if (update.callback_query) await hanteerCallback(update.callback_query);
    else if (update.message) await hanteerBoodskap(update.message);
  } catch (fout) {
    console.error("telegram webhook:", fout);
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    if (chatId) await stuurBoodskap(chatId, "⚠️ Iets het skeefgeloop — probeer weer.");
  }
  // Always 200 so Telegram doesn't retry-storm.
  return NextResponse.json({ ok: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hanteerBoodskap(boodskap: any) {
  const chatId: number = boodskap.chat.id;
  const vanId: number = boodskap.from?.id;
  if (String(vanId) !== process.env.TELEGRAM_ALLOWED_USER_ID) {
    await stuurBoodskap(chatId, "Hierdie bot is privaat.");
    return;
  }

  if (boodskap.text === "/start") {
    await stuurBoodskap(
      chatId,
      "Hallo André-Pierre 👋 Stuur my 'n stemnota of boodskap:\n• idees word gestoor en getag\n• \"maak 'n faktuur vir X, R5000 vir Y\"\n• \"wat moet vandag uit?\"\n• \"wie skuld my geld?\"\n• \"merk die nuusbrief as gepubliseer\""
    );
    return;
  }

  let teks: string | null = boodskap.text ?? null;
  let bron: "telegram_teks" | "telegram_stem" = "telegram_teks";
  let voicenotePath: string | null = null;

  if (boodskap.voice) {
    bron = "telegram_stem";
    const url = await kryLêerUrl(boodskap.voice.file_id);
    if (!url) {
      await stuurBoodskap(chatId, "Kon nie die stemnota aflaai nie.");
      return;
    }
    const ogg = Buffer.from(await (await fetch(url)).arrayBuffer());
    const svc = supabaseService();
    voicenotePath = `${Date.now()}.ogg`;
    await svc.storage.from("voicenotes").upload(voicenotePath, ogg, { contentType: "audio/ogg" });
    teks = await transkribeer(ogg);
    if (!teks) {
      await stuurBoodskap(chatId, "Ek kon nie die stemnota transkribeer nie — probeer weer.");
      return;
    }
  }

  if (!teks) {
    await stuurBoodskap(chatId, "Stuur vir my teks of 'n stemnota.");
    return;
  }

  const uitkoms = await loopAgent(
    bron === "telegram_stem" ? `[Stemnota-transkripsie] ${teks}` : teks,
    bron,
    voicenotePath
  );
  await stuurBoodskap(chatId, uitkoms.antwoord, uitkoms.knoppies);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hanteerCallback(cb: any) {
  const chatId: number = cb.message?.chat?.id;
  const vanId: number = cb.from?.id;
  if (String(vanId) !== process.env.TELEGRAM_ALLOWED_USER_ID) {
    await antwoordCallback(cb.id, "Privaat.");
    return;
  }
  const [aksie, ...res] = String(cb.data ?? "").split(":");
  const svc = supabaseService();

  if (aksie === "tag") {
    const [ideeId, wsId] = res;
    await svc.from("ideas").update({ workspace_id: wsId }).eq("id", ideeId);
    const { data: ws } = await svc.from("workspaces").select("naam").eq("id", wsId).single();
    await antwoordCallback(cb.id, `Getag: ${ws?.naam}`);
    await stuurBoodskap(chatId, `✓ Idee getag onder *${ws?.naam}*.`);
    return;
  }

  if (aksie === "stuur_faktuur") {
    const uit = await sendInvoiceEmail(res[0]);
    await antwoordCallback(cb.id);
    await stuurBoodskap(chatId, uit.ok ? "📤 Faktuur gestuur." : `⚠️ ${uit.fout}`);
    return;
  }

  if (aksie === "skrap_faktuur") {
    await svc.from("invoices").delete().eq("id", res[0]);
    await antwoordCallback(cb.id, "Geskrap");
    await stuurBoodskap(chatId, "🗑 Konsep-faktuur geskrap.");
    return;
  }

  await antwoordCallback(cb.id);
}
