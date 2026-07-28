import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { beantwoordMarkteVraag, type GesprekBeurt, type PortefeuljeItem } from "@/lib/markets/agent";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (process.env.MARKTE_CHAT_OOP === "false") {
    return NextResponse.json({ fout: "binnekort" }, { status: 503 });
  }

  // Gegateer: die assistent is net vir ingetekende lesers (LLM-koste).
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "teken eers in" }, { status: 401 });

  const { geskiedenis, portefeulje } = (await request.json()) as {
    geskiedenis: GesprekBeurt[];
    portefeulje?: PortefeuljeItem[];
  };
  if (!Array.isArray(geskiedenis) || geskiedenis.length === 0) {
    return NextResponse.json({ fout: "leë gesprek" }, { status: 400 });
  }

  try {
    const antwoord = await beantwoordMarkteVraag(geskiedenis, { portefeulje });
    return NextResponse.json({ antwoord });
  } catch (fout) {
    console.error("markte chat:", fout);
    return NextResponse.json({ fout: "Die assistent sukkel nou — probeer weer." }, { status: 500 });
  }
}
