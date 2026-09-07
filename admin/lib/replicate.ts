/* Replicate — agtergrond-verwydering.

   Waarom 'n gehoste model bo die blaaier-een: geen 109MB-aflaai nie, dit werk
   op AP se foon of iPad net so goed as op 'n rekenaar, en dit verwyder die een
   stuk wat ons nooit in 'n regte blaaier kon toets nie (WASM/WebGPU, Safari).

   Gemeet 2026-08-13 teen 851-labs/background-remover:
     8,0s totaal · 3,1s predict_time · geen kouestart (29,8M lopies, altyd warm)
     uitset 1024×1024 RGBA, 74,2% deursigtig — vergelykbaar met BiRefNet plaaslik
     ±$0,00042 per beeld (≈2 380 beelde per dollar)

   LET WEL: net AMPTELIKE modelle werk op /v1/models/{owner}/{name}/predictions.
   Gemeenskapsmodelle soos hierdie een gee 'n 404 daar en het 'n
   weergawe-hash nodig by /v1/predictions. */

const API = "https://api.replicate.com/v1";
const MODEL = "851-labs/background-remover";

export function replicateConfigured() {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

function kop() {
  return {
    Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    "content-type": "application/json",
  };
}

/* Die weergawe-hash verander selde; ons kas dit vir die leeftyd van die
   proses sodat elke oproep nie twee versoeke kos nie. */
let weergaweKas: { id: string; tyd: number } | null = null;
const KAS_MS = 60 * 60 * 1000;

async function kryWeergawe(): Promise<string> {
  if (weergaweKas && Date.now() - weergaweKas.tyd < KAS_MS) return weergaweKas.id;
  const res = await fetch(`${API}/models/${MODEL}`, { headers: kop() });
  if (!res.ok) throw new Error(`Replicate ${res.status}: kon nie die model kry nie`);
  const d = (await res.json()) as { latest_version?: { id?: string } };
  const id = d.latest_version?.id;
  if (!id) throw new Error("Replicate: geen weergawe vir die model nie");
  weergaweKas = { id, tyd: Date.now() };
  return id;
}

type Voorspelling = {
  status?: string;
  output?: string | string[];
  error?: string | null;
  metrics?: { predict_time?: number };
};

/** Verwyder die agtergrond en gee die (tydelike) Replicate-URL terug.
 *
 *  Daardie URL verval — replicate.delivery hou uitsette net 'n uur of wat — so
 *  die oproeper MOET dit aflaai en in ons eie bucket stoor. */
export async function verwyderAgtergrondReplicate(beeldUrl: string): Promise<string> {
  const version = await kryWeergawe();

  const res = await fetch(`${API}/predictions`, {
    method: "POST",
    headers: {
      ...kop(),
      // "wait" laat Replicate sinchronies antwoord i.p.v. te laat poll.
      Prefer: "wait",
    },
    body: JSON.stringify({ version, input: { image: beeldUrl } }),
    signal: AbortSignal.timeout(120_000),
  });

  const d = (await res.json().catch(() => null)) as Voorspelling | null;
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${d?.error ?? "onbekende fout"}`);
  if (d?.error) throw new Error(`Replicate: ${d.error}`);
  if (d?.status !== "succeeded") {
    // Met Prefer: wait behoort dit klaar te wees; andersins het dit te lank gevat.
    throw new Error(`Replicate het geëindig as "${d?.status ?? "onbekend"}"`);
  }

  const uit = Array.isArray(d.output) ? d.output[0] : d.output;
  if (typeof uit !== "string" || !uit) throw new Error("Replicate: geen uitset-URL nie");
  return uit;
}
