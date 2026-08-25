/* Buffer-kliënt — die publieke GraphQL-API (api.buffer.com/graphql), met 'n
   persoonlike API-sleutel. Geen OAuth, geen relais deur hq nodig nie.

   Vorm geverifieer teen die lewende skema op 2026-08-13 via
   `buffer schema describe posts create` en GraphQL-introspeksie:
     createPost(input: CreatePostInput!)  → union, sukses = PostActionSuccess
     channels(input: ChannelsInput)
     deletePost(input: DeletePostInput!)

   BELANGRIK: Buffer het GEEN oplaai-eindpunt nie. assets[].image.url moet
   reeds publiek bereikbaar wees — Buffer haal dit self van die bediener af,
   so 'n getekende URL werk NIE. Ons konsep-fotos-bucket is publiek. */

const API = "https://api.buffer.com/graphql";

export function bufferConfigured() {
  return Boolean(process.env.BUFFER_API_KEY);
}

type GraphQLFout = { message?: string; extensions?: { window?: string } };

async function bufferGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BUFFER_API_KEY}`,
      "content-type": "application/json",
      // Dieselfde kliënt-headers as Buffer se eie CLI, sodat hulle die verkeer
      // kan toeskryf.
      "x-buffer-client-id": "ap-hq",
      "x-buffer-client-name": "AP HQ",
      "x-buffer-client-version": "1",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await res.json().catch(() => null)) as
    | { data?: T; errors?: GraphQLFout[] }
    | null;

  if (res.status === 429) {
    const venster = data?.errors?.[0]?.extensions?.window ?? "";
    const wag = res.headers.get("retry-after");
    throw new Error(
      `Buffer se koerslimiet (${venster || "onbekende venster"}) is bereik${
        wag ? ` — probeer oor ${wag}s` : ""
      }.`
    );
  }
  if (!res.ok && !data) throw new Error(`Buffer ${res.status}`);
  if (data?.errors?.length) throw new Error(data.errors.map((e) => e.message).join("; "));
  if (!data?.data) throw new Error("Buffer: leë antwoord");
  return data.data;
}

/* ── Rekening en kanale ──────────────────────────────────────────────── */

export type Organisasie = { id: string; naam: string; kanale: number; kanaalLimiet: number };
export type Rekening = { epos: string; tydsone: string; organisasies: Organisasie[] };

/** Haal die rekening op. Die organisasie-id kom hiervandaan, so dit hoef NIE
 *  'n omgewingsveranderlike te wees nie. kanaalLimiet wys ook wanneer die plan
 *  vol is — 'n kanaal bo die limiet kom terug as isLocked met 'n raaiselagtige
 *  "not allowed to perform this action"-fout. */
export async function kryRekening(): Promise<Rekening> {
  const d = await bufferGraphQL<{
    account: {
      email: string;
      timezone: string;
      organizations: {
        id: string;
        name: string;
        channelCount: number;
        limits: { channels: number };
      }[];
    };
  }>(
    `query Rekening {
      account {
        email
        timezone
        organizations { id name channelCount limits { channels } }
      }
    }`,
    {}
  );
  return {
    epos: d.account.email,
    tydsone: d.account.timezone,
    organisasies: (d.account.organizations ?? []).map((o) => ({
      id: o.id,
      naam: o.name,
      kanale: o.channelCount,
      kanaalLimiet: o.limits?.channels ?? 0,
    })),
  };
}

export type Kanaal = {
  id: string;
  naam: string;
  diens: string;
  gesluit: boolean;
  ontkoppel: boolean;
};

export async function kryKanale(organisasieId: string): Promise<Kanaal[]> {
  const d = await bufferGraphQL<{
    channels: { id: string; name: string; service: string; isLocked: boolean; isDisconnected: boolean }[];
  }>(
    /* Let op die "!": introspeksie rapporteer die ARGUMENT as nullable
       (ChannelsInput), maar die veranderlike-posisie vereis ChannelsInput! —
       sonder dit weier die bediener die navraag. */
    `query Kanale($input: ChannelsInput!) {
      channels(input: $input) { id name service isLocked isDisconnected }
    }`,
    { input: { organizationId: organisasieId } }
  );
  return (d.channels ?? []).map((k) => ({
    id: k.id,
    naam: k.name,
    diens: (k.service ?? "").toLowerCase(),
    gesluit: Boolean(k.isLocked),
    ontkoppel: Boolean(k.isDisconnected),
  }));
}

/* ── Suiwer helpers (die getoetste naat) ─────────────────────────────── */

/** Buffer verwerp beheerkarakters (U+0000–U+001F) voordat die versoek eers
 *  wegkom. Gemini se teks bevat soms sulke karakters, so ons stroop hulle —
 *  behalwe die witspasie wat ons wil hou. */
export function skoonTeks(teks: string): string {
  // Hou \t (0009), \n (000A) en \r (000D); gooi die res van die C0-blok weg.
  return teks.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

/** Bou 'n dueAt uit 'n plaaslike SAST-tyd soos 'n <input type="datetime-local">
 *  dit gee ("2026-08-14T17:00"). Buffer vereis 'n eksplisiete offset — moet
 *  NOOIT UTC aanvaar nie. Suid-Afrika het geen somertyd nie, so +02:00 is
 *  altyd korrek; dit vermy 'n hele klas stil twee-uur-foute. */
export function saDueAt(plaaslik: string): string {
  const m = plaaslik.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error(`Ongeldige datum/tyd: ${plaaslik}`);
  const [, datum, uur, minuut, sekonde] = m;
  return `${datum}T${uur}:${minuut}:${sekonde ?? "00"}+02:00`;
}

export type PlasingOpsies = {
  kanaal: Kanaal;
  teks: string;
  /** Publieke URL — Buffer kan niks anders inneem nie. */
  beeldUrl?: string | null;
  altTeks?: string;
  /** SAST "2026-08-14T17:00". Weggelaat = plaas in die kanaal se tou. */
  wanneer?: string | null;
  /** Stoor as konsep: geen plasingslimiete, publiseer nooit self nie. */
  konsep?: boolean;
  eersteKommentaar?: string;
};

/** Dienste wat ons nie sonder ekstra data kan hanteer nie. YouTube wil 'n
 *  video + categoryId hê; Pinterest wil 'n boardServiceId hê. Eerder 'n
 *  duidelike Afrikaanse weiering as Buffer se kriptiese bedienerfout. */
const ONONDERSTEUN: Record<string, string> = {
  youtube: "YouTube benodig 'n video plus 'n kategorie — plaas dit direk in Buffer.",
  pinterest: "Pinterest benodig 'n bord-keuse — plaas dit direk in Buffer.",
  googlebusiness: "Google Business benodig 'n pos-tipe — plaas dit direk in Buffer.",
};

/** Dienste wat 'n beeld of video MOET hê (Buffer se eie lys). */
const VEREIS_BEELD = new Set(["instagram", "tiktok", "pinterest"]);

/** Keur 'n plasing af VOORDAT ons Buffer bel. Gee null terug as alles reg is. */
export function keurPlasing(opsies: PlasingOpsies): string | null {
  const { kanaal } = opsies;
  if (kanaal.ontkoppel) return `${kanaal.naam} is ontkoppel in Buffer.`;
  if (kanaal.gesluit)
    return `${kanaal.naam} is gesluit — die Buffer-plan se kanaallimiet is oorskry.`;
  if (ONONDERSTEUN[kanaal.diens]) return ONONDERSTEUN[kanaal.diens];
  if (VEREIS_BEELD.has(kanaal.diens) && !opsies.beeldUrl)
    return `${kanaal.naam} (${kanaal.diens}) benodig 'n beeld.`;
  // Die skema merk text as opsioneel, maar die API verwerp 'n leë plasing
  // sonder bylae vir die meeste dienste.
  if (!skoonTeks(opsies.teks) && !opsies.beeldUrl) return "Die plasing is leeg.";
  return null;
}

type Bate = { image: { url: string; metadata: { altText: string } } };

export type CreatePostInput = {
  channelId: string;
  schedulingType: "automatic";
  mode: "addToQueue" | "customScheduled";
  text?: string;
  dueAt?: string;
  assets?: Bate[];
  metadata?: Record<string, unknown>;
  saveToDraft?: boolean;
  aiAssisted?: boolean;
  source?: string;
};

/** Bou die presiese CreatePostInput. Die per-diens metadata is NIE opsioneel
 *  nie — Instagram verwerp 'n plasing sonder type + shouldShareToFeed, en
 *  Facebook sonder type ("Facebook posts require a type"). */
export function bouInvoer(opsies: PlasingOpsies): CreatePostInput {
  const { kanaal } = opsies;
  const teks = skoonTeks(opsies.teks);
  const eersteKommentaar = opsies.eersteKommentaar
    ? skoonTeks(opsies.eersteKommentaar)
    : "";

  const invoer: CreatePostInput = {
    channelId: kanaal.id,
    schedulingType: "automatic", // "notification" publiseer NIE self nie
    mode: opsies.wanneer ? "customScheduled" : "addToQueue",
    aiAssisted: true, // Gemini skryf die teks — eerlik verklaar
    source: "ap-hq",
  };
  if (teks) invoer.text = teks;
  if (opsies.wanneer) invoer.dueAt = saDueAt(opsies.wanneer);
  if (opsies.konsep) invoer.saveToDraft = true;

  if (opsies.beeldUrl) {
    invoer.assets = [
      {
        image: {
          url: opsies.beeldUrl,
          // altText is verpligtend sodra metadata teenwoordig is.
          metadata: { altText: (opsies.altTeks || teks || "Buitelyn-kaart").slice(0, 280) },
        },
      },
    ];
  }

  const metadata: Record<string, unknown> = {};
  switch (kanaal.diens) {
    case "instagram":
      metadata.instagram = {
        type: "post",
        shouldShareToFeed: true,
        ...(eersteKommentaar ? { firstComment: eersteKommentaar } : {}),
      };
      break;
    case "facebook":
      metadata.facebook = {
        type: "post",
        ...(eersteKommentaar ? { firstComment: eersteKommentaar } : {}),
      };
      break;
    case "tiktok":
      // 'n Stilbeeld op TikTok is 'n "photo post" en wil 'n titel hê.
      metadata.tiktok = { title: (teks || "Buitelyn").slice(0, 90) };
      break;
    case "linkedin":
      // Skakels hoort in die eerste kommentaar, nooit in die lyf nie.
      if (eersteKommentaar) metadata.linkedin = { firstComment: eersteKommentaar };
      break;
    default:
      // twitter/x, mastodon, threads, bluesky: teks alleen is genoeg.
      break;
  }
  if (Object.keys(metadata).length) invoer.metadata = metadata;

  return invoer;
}

/* ── Skep ────────────────────────────────────────────────────────────── */

export type Uitslag =
  | { ok: true; kanaal: string; diens: string; plasingId: string; status: string; dueAt: string | null }
  | { ok: false; kanaal: string; diens: string; fout: string };

const SKEP = `mutation SkepPlasing($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess { post { id status dueAt } }
    ... on MutationError { message }
  }
}`;

type SkepAntwoord = {
  createPost:
    | { __typename: "PostActionSuccess"; post: { id: string; status: string; dueAt: string | null } }
    | { __typename: string; message?: string };
};

/** Een mutasie per kanaal — createPost vat net één channelId. Ons versamel
 *  elke kanaal se uitslag apart sodat 'n gedeeltelike mislukking eerlik
 *  gerapporteer word in plaas van stilweg weggesluk te word.
 *
 *  LET WEL: createPost is NIE idempotent nie. Moet nooit blindelings herprobeer
 *  nie — 'n tweede oproep skep 'n duplikaat. */
export async function skepPlasings(lys: PlasingOpsies[]): Promise<Uitslag[]> {
  const uitslae: Uitslag[] = [];

  for (const opsies of lys) {
    const { naam, diens } = opsies.kanaal;
    const keuring = keurPlasing(opsies);
    if (keuring) {
      uitslae.push({ ok: false, kanaal: naam, diens, fout: keuring });
      continue;
    }
    try {
      const d = await bufferGraphQL<SkepAntwoord>(SKEP, { input: bouInvoer(opsies) });
      const res = d.createPost;
      if (res.__typename === "PostActionSuccess" && "post" in res) {
        uitslae.push({
          ok: true,
          kanaal: naam,
          diens,
          plasingId: res.post.id,
          status: res.post.status,
          dueAt: res.post.dueAt,
        });
      } else {
        uitslae.push({
          ok: false,
          kanaal: naam,
          diens,
          fout: ("message" in res && res.message) || "Buffer het die plasing geweier.",
        });
      }
    } catch (e) {
      uitslae.push({
        ok: false,
        kanaal: naam,
        diens,
        fout: e instanceof Error ? e.message : "Onbekende Buffer-fout",
      });
    }
  }

  return uitslae;
}

export async function skrapPlasing(plasingId: string): Promise<void> {
  await bufferGraphQL(
    `mutation SkrapPlasing($input: DeletePostInput!) { deletePost(input: $input) { __typename } }`,
    { input: { id: plasingId } }
  );
}
