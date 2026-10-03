/* gpt-6-luna vir die crons se skryfwerk (Piet 2026-09-25: skuif skryfwerk
   stap vir stap van Gemini na Luna — dis baie goedkoper). Elke taak is eers
   langs mekaar teen Gemini getoets op lewendige invoer voordat dit geskuif het:
   nuus-vertalings, SENS-klassifikasie + dividend-onttrekking, markoorsig.

   Luna is die eerste keuse; Gemini bly die vangnet. Val Luna om (sleutel weg,
   4xx/5xx, timeout, leë of ongeldige antwoord), loop die bestaande Gemini-oproep
   net soos altyd. LUNA_SKRYF=off skakel Luna heeltemal af sonder 'n kode-
   ontplooiing. Transkripsie, beelde en visie bly op Gemini — dit is nie hier nie. */

export const LUNA_MODEL = "gpt-6-luna";

export function lunaAan(): boolean {
  return (process.env.LUNA_SKRYF ?? "on") !== "off" && Boolean(process.env.OPENAI_API_KEY);
}

/* Luna se gewoontes wat nie in gestoorde teks hoort nie: krulaanhalings
   (’n), markdown-vetdruk en em-strepe sonder spasies ("vat—’n"). Die
   webwerf, Telegram-HTML en die oudio-skrip verwag gewone teks. */
export function skoonLuna(teks: string): string {
  return teks
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s*—\s*/g, " – ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

type LunaOpsies = {
  /** Streng JSON-skema (wortel moet 'n objek wees — vou lyste in). */
  skema?: { naam: string; skema: Record<string, unknown> };
  maksUit?: number;
  timeoutMs?: number;
};

/* Een prompt, een antwoord. Geen temperatuur nie (Luna aanvaar dit nie);
   reasoning low hou dit vinnig en goedkoop. Geen herprobeer nie — die
   Gemini-vangnet is die herprobeer. */
export async function lunaTeks(prompt: string, opsies: LunaOpsies = {}): Promise<string> {
  const sleutel = process.env.OPENAI_API_KEY;
  if (!sleutel) throw new Error("OPENAI_API_KEY ontbreek");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${sleutel}` },
    body: JSON.stringify({
      model: LUNA_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: opsies.maksUit ?? 4000,
      input: prompt,
      ...(opsies.skema
        ? { text: { format: { type: "json_schema", name: opsies.skema.naam, schema: opsies.skema.skema, strict: true } } }
        : {}),
    }),
    signal: AbortSignal.timeout(opsies.timeoutMs ?? 45_000),
  });
  const data = await res.json().catch(() => ({}));
  // Net status + foutkode: OpenAI se boodskap eggo 'n (gemaskeerde) sleutel terug.
  if (!res.ok) throw new Error(`${res.status} ${data?.error?.code ?? data?.error?.type ?? ""}`.trim());
  if (data.status && data.status !== "completed") {
    throw new Error(`onvolledig: ${data.status} ${JSON.stringify(data.incomplete_details ?? {})}`);
  }
  const teks = ((data.output ?? []) as { type: string; content?: { type: string; text?: string }[] }[])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();
  if (!teks) throw new Error("leë antwoord");
  const u = data.usage ?? {};
  console.info(
    `[luna] ${opsies.skema?.naam ?? "teks"} in=${u.input_tokens ?? "?"} uit=${u.output_tokens ?? "?"} (redeneer ${u.output_tokens_details?.reasoning_tokens ?? "?"})`
  );
  return opsies.skema ? teks : skoonLuna(teks);
}

/* Skoonmaak ná die parse, nie op die rou JSON nie: 'n “” binne 'n string wat
   'n " word, sou die JSON breek. */
function skoonDiep(w: unknown): unknown {
  if (typeof w === "string") return skoonLuna(w);
  if (Array.isArray(w)) return w.map(skoonDiep);
  if (w && typeof w === "object") return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, skoonDiep(v)]));
  return w;
}

/** Streng-skema JSON van Luna, geparseer en met elke string skoongemaak. */
export async function lunaJson<T>(prompt: string, skema: NonNullable<LunaOpsies["skema"]>, opsies: Omit<LunaOpsies, "skema"> = {}): Promise<T> {
  return skoonDiep(JSON.parse(await lunaTeks(prompt, { ...opsies, skema }))) as T;
}

/** Luna eerste; `gemini` (die bestaande oproep, onveranderd) as Luna af is of misluk.
    `luna` moet self gooi as sy antwoord nie die verwagte vorm het nie. */
export async function metLuna<T>(etiket: string, luna: () => Promise<T>, gemini: () => Promise<T>): Promise<T> {
  if (lunaAan()) {
    try {
      return await luna();
    } catch (fout) {
      console.error(`[${etiket}] Luna misluk, Gemini neem oor:`, String(fout).slice(0, 300));
    }
  }
  return gemini();
}
