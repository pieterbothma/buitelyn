import Anthropic from "@anthropic-ai/sdk";
import { supabaseService } from "@/lib/supabase/service";
import { formatRand, invoiceTotalSent, nextInvoiceNumber } from "@/lib/invoices";
import type { InlineKnop } from "@/lib/telegram";

export type AgentUitkoms = {
  antwoord: string;
  knoppies?: InlineKnop[][];
};

const STELSEL = `Jy is AP HQ se assistent op Telegram — André-Pierre du Plessis se besigheidsagent.
Sy werkruimtes: Buitelyn (nuusprogram), Ei-Aai (Spotify-potgooi, Maandae), Die Tweede Trump (Vrydae), African Future News Academy (AFNA), Promenader.
Reëls:
- As die boodskap 'n idee/gedagte/voorstel is (veral stemnotas), stoor dit as 'n idee met stoor_idee.
- Vir fakture: skep SLEGS 'n konsep met skep_faktuur_konsep. Jy mag NOOIT self stuur nie — AP bevestig met 'n knoppie.
- Antwoord kort en saaklik in Afrikaans. Bedrae in rand.
- As 'n versoek buite jou vermoëns val, sê so eerlik.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "stoor_idee",
    description:
      "Stoor 'n idee. Gebruik vir enige gedagte/voorstel/консep wat AP wil onthou. Laat workspace_slug weg as dit onduidelik is — dan gaan dit na die Inkassie.",
    input_schema: {
      type: "object",
      properties: {
        titel: { type: "string", description: "Kort titel (≤80 karakters)" },
        nota: { type: "string", description: "Volledige gedagte/transkripsie" },
        workspace_slug: {
          type: "string",
          enum: ["buitelyn", "ei-aai", "tweede-trump", "afna", "promenader"],
        },
      },
      required: ["titel"],
    },
  },
  {
    name: "skep_faktuur_konsep",
    description:
      "Skep 'n KONSEP-faktuur. Die kliënt word by naam gesoek (of geskep as dit nie bestaan nie). Pryse in rand.",
    input_schema: {
      type: "object",
      properties: {
        workspace_slug: {
          type: "string",
          enum: ["buitelyn", "ei-aai", "tweede-trump", "afna", "promenader"],
        },
        klient_naam: { type: "string" },
        lyne: {
          type: "array",
          items: {
            type: "object",
            properties: {
              beskrywing: { type: "string" },
              aantal: { type: "number" },
              prys_rand: { type: "number" },
            },
            required: ["beskrywing", "prys_rand"],
          },
        },
        notas: { type: "string" },
      },
      required: ["workspace_slug", "klient_naam", "lyne"],
    },
  },
  {
    name: "lys_vandag",
    description: "Lys wat vandag moet publiseer (alle werkruimtes) en wat agterstallig is.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "lys_onbetaal",
    description: "Lys gestuurde maar onbetaalde fakture.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "merk_gepubliseer",
    description: "Merk 'n pyplyn-kaart as gepubliseer. Gee 'n soekterm uit die kaart se titel.",
    input_schema: {
      type: "object",
      properties: { soekterm: { type: "string" } },
      required: ["soekterm"],
    },
  },
];

type ToolUitset = { resultaat: string; knoppies?: InlineKnop[][] };

async function voerToolUit(
  naam: string,
  invoer: Record<string, unknown>,
  bron: "telegram_teks" | "telegram_stem",
  voicenotePath: string | null
): Promise<ToolUitset> {
  const sb = supabaseService();

  if (naam === "stoor_idee") {
    let workspaceId: string | null = null;
    if (invoer.workspace_slug) {
      const { data: ws } = await sb
        .from("workspaces")
        .select("id")
        .eq("slug", invoer.workspace_slug)
        .single();
      workspaceId = ws?.id ?? null;
    }
    const { data: idee } = await sb
      .from("ideas")
      .insert({
        titel: String(invoer.titel).slice(0, 200),
        nota: (invoer.nota as string) ?? null,
        workspace_id: workspaceId,
        bron,
        voicenote_path: voicenotePath,
      })
      .select("id")
      .single();
    if (!workspaceId && idee) {
      const { data: alleWs } = await sb.from("workspaces").select("id, naam").order("posisie");
      const knoppies = (alleWs ?? []).map((w) => [
        { text: w.naam, callback_data: `tag:${idee.id}:${w.id}` },
      ]);
      return { resultaat: `Idee gestoor in die Inkassie: "${invoer.titel}". Vra AP om 'n werkruimte te kies.`, knoppies };
    }
    return { resultaat: `Idee gestoor: "${invoer.titel}".` };
  }

  if (naam === "skep_faktuur_konsep") {
    const { data: ws } = await sb
      .from("workspaces")
      .select("id, naam, invoice_prefix")
      .eq("slug", invoer.workspace_slug)
      .single();
    if (!ws) return { resultaat: "Werkruimte nie gevind nie." };

    const naamSoek = String(invoer.klient_naam).trim();
    let { data: klient } = await sb
      .from("clients")
      .select("id, naam, epos")
      .eq("workspace_id", ws.id)
      .ilike("naam", `%${naamSoek}%`)
      .maybeSingle();
    if (!klient) {
      const { data: nuut } = await sb
        .from("clients")
        .insert({ workspace_id: ws.id, naam: naamSoek })
        .select("id, naam, epos")
        .single();
      klient = nuut;
    }
    if (!klient) return { resultaat: "Kon nie kliënt skep nie." };

    const lyne = (invoer.lyne as { beskrywing: string; aantal?: number; prys_rand: number }[]).map(
      (l, i) => ({
        beskrywing: l.beskrywing,
        aantal: l.aantal ?? 1,
        eenheidsprys_sent: Math.round(l.prys_rand * 100),
        posisie: i,
      })
    );
    const nommer = await nextInvoiceNumber(sb, ws.id, ws.invoice_prefix);
    const { data: faktuur } = await sb
      .from("invoices")
      .insert({
        workspace_id: ws.id,
        client_id: klient.id,
        nommer,
        notas: (invoer.notas as string) ?? null,
      })
      .select("id")
      .single();
    if (!faktuur) return { resultaat: "Kon nie faktuur skep nie." };
    await sb.from("invoice_lines").insert(lyne.map((l) => ({ ...l, invoice_id: faktuur.id })));

    const totaal = formatRand(invoiceTotalSent(lyne));
    const eposNota = klient.epos ? "" : ` (LET WEL: ${klient.naam} het nog geen e-posadres nie — stuur sal faal totdat dit bygevoeg is)`;
    return {
      resultaat: `Konsep-faktuur ${nommer} geskep vir ${klient.naam} — ${totaal}${eposNota}.`,
      knoppies: [
        [
          { text: `📤 Stuur ${nommer}`, callback_data: `stuur_faktuur:${faktuur.id}` },
          { text: "🗑 Skrap", callback_data: `skrap_faktuur:${faktuur.id}` },
        ],
      ],
    };
  }

  if (naam === "lys_vandag") {
    const begin = new Date();
    begin.setHours(0, 0, 0, 0);
    const einde = new Date(begin.getTime() + 86_400_000);
    const [{ data: vandag }, { data: laat }] = await Promise.all([
      sb
        .from("cards")
        .select("titel, status, due_at, workspaces(naam)")
        .gte("due_at", begin.toISOString())
        .lt("due_at", einde.toISOString())
        .order("due_at"),
      sb
        .from("cards")
        .select("titel, due_at")
        .lt("due_at", begin.toISOString())
        .not("status", "in", '("gepubliseer","gemis")'),
    ]);
    const reëls = (vandag ?? []).map((k) => {
      const ws = k.workspaces as unknown as { naam: string } | null;
      const tyd = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" }).format(
        new Date(k.due_at)
      );
      return `• ${tyd} ${k.titel} (${ws?.naam}) — ${k.status}`;
    });
    let uit = reëls.length ? `Vandag:\n${reëls.join("\n")}` : "Niks vandag geskeduleer nie.";
    if ((laat ?? []).length) uit += `\n\nAgterstallig: ${(laat ?? []).map((k) => k.titel).join(", ")}`;
    return { resultaat: uit };
  }

  if (naam === "lys_onbetaal") {
    const { data } = await sb
      .from("invoices")
      .select("nommer, clients(naam), invoice_lines(aantal, eenheidsprys_sent)")
      .eq("status", "gestuur");
    if (!data?.length) return { resultaat: "Geen onbetaalde fakture nie. 🎉" };
    return {
      resultaat: data
        .map((f) => {
          const kl = f.clients as unknown as { naam: string } | null;
          return `• ${f.nommer} — ${kl?.naam}: ${formatRand(invoiceTotalSent(f.invoice_lines ?? []))}`;
        })
        .join("\n"),
    };
  }

  if (naam === "merk_gepubliseer") {
    const { data: kaart } = await sb
      .from("cards")
      .select("id, titel")
      .ilike("titel", `%${invoer.soekterm}%`)
      .neq("status", "gepubliseer")
      .order("due_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!kaart) return { resultaat: `Geen oop kaart gevind wat op "${invoer.soekterm}" pas nie.` };
    await sb.from("cards").update({ status: "gepubliseer" }).eq("id", kaart.id);
    return { resultaat: `✓ "${kaart.titel}" gemerk as gepubliseer.` };
  }

  return { resultaat: "Onbekende aksie." };
}

export async function loopAgent(
  boodskap: string,
  bron: "telegram_teks" | "telegram_stem",
  voicenotePath: string | null
): Promise<AgentUitkoms> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const gesprek: Anthropic.MessageParam[] = [{ role: "user", content: boodskap }];
  let knoppies: InlineKnop[][] | undefined;

  for (let beurt = 0; beurt < 4; beurt++) {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: STELSEL,
      tools: TOOLS,
      messages: gesprek,
    });

    const toolBlokke = res.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (toolBlokke.length === 0 || res.stop_reason !== "tool_use") {
      const teks = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { antwoord: teks || "✓", knoppies };
    }

    gesprek.push({ role: "assistant", content: res.content });
    const uitsette: Anthropic.ToolResultBlockParam[] = [];
    for (const blok of toolBlokke) {
      const uit = await voerToolUit(
        blok.name,
        blok.input as Record<string, unknown>,
        bron,
        voicenotePath
      );
      if (uit.knoppies) knoppies = uit.knoppies;
      uitsette.push({ type: "tool_result", tool_use_id: blok.id, content: uit.resultaat });
    }
    gesprek.push({ role: "user", content: uitsette });
  }
  return { antwoord: "Ek het te veel stappe probeer — probeer weer eenvoudiger.", knoppies };
}
