import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { getQuotes, getSeries } from "@/lib/markets/source";
import { ALLE_SIMBOLE, naamVirSimbool } from "@/lib/markets/boards";
import { kryNuus } from "@/lib/markets/nuus";
import { parseFeed } from "@/lib/feed";

export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4";
const MAX_STAPPE = 6;

const STELSEL = `Jy is Buitelyn se KI-markassistent op buitelyn.com/markte.
Buitelyn is 'n Afrikaanse nuusprogram — "sake, ernstig gevat".
Reëls:
- Antwoord in helder, vriendelike Afrikaans. GEEN markdown nie — skoon teks. Kort paragrawe. Bedrae in rand ("R 789,60").
- Gebruik jou tools vir ELKE syfer — moet nooit pryse uit jou geheue aanhaal nie. Data is ±15 min vertraag; noem dit as dit saak maak.
- JSE-simbole eindig op .JO. Beskikbare simbole: ${ALLE_SIMBOLE.join(", ")}.
- As die gebruiker se portefeulje in die konteks is, mag jy dit gebruik.
- Jy gee inligting en verduideliking, NIE finansiële advies nie — sê so as iemand koop/verkoop-advies vra.
- As Buitelyn se nuusbriewe iets relevant sê (soek_buitelyn), haal dit aan met die skakel.
- Vir "hoekom"-vrae oor bewegings: kyk eers na kry_nuus (SA-bronne); gebruik web-soektog vir enigiets verder. Noem altyd jou bron met 'n skakel, en moenie spekuleer as jy niks kry nie.`;

const TOOLS: OpenAI.Responses.Tool[] = [
  { type: "web_search", search_context_size: "low" },
  {
    type: "function",
    name: "kry_nuus",
    description:
      "Kry die jongste Suid-Afrikaanse finansiële nuusopskrifte (Business Day, Moneyweb, Daily Investor) met skakels.",
    parameters: { type: "object", properties: {} },
    strict: false,
  },
  {
    type: "function",
    name: "kry_kwotasies",
    description: "Kry die nuutste pryse en dag-persentasies vir simbole.",
    parameters: {
      type: "object",
      properties: { simbole: { type: "array", items: { type: "string" } } },
      required: ["simbole"],
    },
    strict: false,
  },
  {
    type: "function",
    name: "kry_reeks",
    description: "Kry 'n maand se prysreeks vir een simbool (vir tendens-vrae).",
    parameters: {
      type: "object",
      properties: { simbool: { type: "string" } },
      required: ["simbool"],
    },
    strict: false,
  },
  {
    type: "function",
    name: "soek_buitelyn",
    description: "Soek Buitelyn se onlangse nuusbriewe vir 'n onderwerp; gee titels, uittreksels en skakels.",
    parameters: {
      type: "object",
      properties: { soekterm: { type: "string" } },
      required: ["soekterm"],
    },
    strict: false,
  },
];

async function voerToolUit(naam: string, invoer: Record<string, unknown>): Promise<string> {
  if (naam === "kry_nuus") {
    const items = await kryNuus();
    if (!items.length) return "Geen nuus beskikbaar nie.";
    return items
      .map((i) => `[${i.bron}] ${i.titel}${i.opsomming ? ` — ${i.opsomming}` : ""} (${i.skakel})`)
      .join("\n");
  }
  if (naam === "kry_kwotasies") {
    const simbole = ((invoer.simbole as string[]) ?? []).filter((s) => ALLE_SIMBOLE.includes(s));
    if (!simbole.length) return "Geen geldige simbole nie.";
    const ks = await getQuotes(simbole);
    return ks
      .map(
        (k) =>
          `${naamVirSimbool(k.simbool)} (${k.simbool}): ${k.prys.toFixed(2)} ${k.geldeenheid}, dag ${
            k.deltaPersent != null ? k.deltaPersent.toFixed(2) + "%" : "onbekend"
          } (tyd ${k.tyd ?? "?"})`
      )
      .join("\n");
  }
  if (naam === "kry_reeks") {
    const simbool = String(invoer.simbool ?? "");
    if (!ALLE_SIMBOLE.includes(simbool)) return "Onbekende simbool.";
    const reeks = await getSeries(simbool, "1mo");
    if (!reeks.length) return "Geen reeksdata nie.";
    const eerste = reeks[0].p;
    const laaste = reeks[reeks.length - 1].p;
    const min = Math.min(...reeks.map((r) => r.p));
    const max = Math.max(...reeks.map((r) => r.p));
    return `${simbool} afgelope maand: begin ${eerste.toFixed(2)}, nou ${laaste.toFixed(2)} (${(
      ((laaste - eerste) / eerste) *
      100
    ).toFixed(2)}%), laagste ${min.toFixed(2)}, hoogste ${max.toFixed(2)}.`;
  }
  if (naam === "soek_buitelyn") {
    try {
      const res = await fetch("https://buitelyn.substack.com/feed", {
        next: { revalidate: 600 },
        headers: { "user-agent": "Mozilla/5.0 (compatible; BuitelynMarkte/1.0)" },
      });
      const { posts } = parseFeed(await res.text());
      const term = String(invoer.soekterm ?? "").toLowerCase();
      const treffers = posts
        .filter(
          (p) =>
            p.title.toLowerCase().includes(term) || p.blurb.toLowerCase().includes(term)
        )
        .slice(0, 4);
      const lys = treffers.length ? treffers : posts.slice(0, 3);
      return lys.map((p) => `"${p.title}" — ${p.blurb} (${p.url})`).join("\n");
    } catch {
      return "Kon nie die nuusbriewe bereik nie.";
    }
  }
  return "Onbekende tool.";
}

export async function POST(request: NextRequest) {
  if (process.env.MARKTE_CHAT_OOP === "false") {
    return NextResponse.json({ fout: "binnekort" }, { status: 503 });
  }

  const { geskiedenis, portefeulje } = (await request.json()) as {
    geskiedenis: { rol: string; teks: string }[];
    portefeulje?: { simbool: string; aantal: number; koopprys: number }[];
  };
  if (!Array.isArray(geskiedenis) || geskiedenis.length === 0) {
    return NextResponse.json({ fout: "leë gesprek" }, { status: 400 });
  }

  const portKonteks =
    portefeulje && portefeulje.length
      ? `\n\nGebruiker se portefeulje (blaaier-gestoor): ${portefeulje
          .map((b) => `${b.simbool} × ${b.aantal} teen R${b.koopprys}`)
          .join("; ")}`
      : "";

  const client = new OpenAI();
  let input: OpenAI.Responses.ResponseInputItem[] = geskiedenis.slice(-12).map((b) => ({
    role: b.rol === "gebruiker" ? ("user" as const) : ("assistant" as const),
    content: b.teks,
  }));

  try {
    for (let stap = 0; stap < MAX_STAPPE; stap++) {
      const res = await client.responses.create({
        model: MODEL,
        instructions: STELSEL + portKonteks,
        input,
        tools: TOOLS,
        reasoning: { effort: "low" },
        store: false,
        include: ["reasoning.encrypted_content"],
        tool_choice: stap === MAX_STAPPE - 1 ? "none" : "auto",
      });
      const oproepe = (res.output ?? []).filter(
        (i): i is OpenAI.Responses.ResponseFunctionToolCall => i.type === "function_call"
      );
      if (oproepe.length === 0) {
        return NextResponse.json({ antwoord: (res.output_text ?? "").trim() || "✓" });
      }
      input = input.concat((res.output ?? []) as OpenAI.Responses.ResponseInputItem[]);
      for (const oproep of oproepe) {
        let invoer: Record<string, unknown> = {};
        try {
          invoer = JSON.parse(oproep.arguments || "{}");
        } catch {
          /* leeg */
        }
        input.push({
          type: "function_call_output",
          call_id: oproep.call_id,
          output: await voerToolUit(oproep.name, invoer),
        });
      }
    }
    return NextResponse.json({ antwoord: "Te veel stappe — probeer 'n eenvoudiger vraag." });
  } catch (fout) {
    console.error("markte chat:", fout);
    return NextResponse.json({ fout: "Die assistent sukkel nou — probeer weer." }, { status: 500 });
  }
}
