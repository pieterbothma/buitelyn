/* Lean Unipile client — copied from onemanband's verified flow (2026-07-18):
   hosted auth link -> async notify -> account_id; /emails list for reading. */

// DSN may arrive with or without a scheme (onemanband's env includes it).
const apiBase = () => `https://${(process.env.UNIPILE_DSN ?? "").replace(/^https?:\/\//, "")}`;

async function unipileFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}/api/v1${path}`, {
    ...init,
    headers: {
      "X-API-KEY": process.env.UNIPILE_API_KEY!,
      "content-type": "application/json",
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Unipile ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

export function unipileConfigured() {
  return Boolean(process.env.UNIPILE_DSN && process.env.UNIPILE_API_KEY);
}

export async function createHostedAuthLink(opts: {
  state: string;
  successRedirect: string;
  failureRedirect: string;
  notifyUrl: string;
}): Promise<string> {
  const res = await unipileFetch<{ url?: string }>("/hosted/accounts/link", {
    method: "POST",
    body: JSON.stringify({
      type: "create",
      // "MAIL" (not "IMAP") is the generic-IMAP wizard option — "IMAP" 400s.
      providers: ["GOOGLE", "OUTLOOK", "MAIL"],
      api_url: apiBase(),
      expiresOn: new Date(Date.now() + 3_600_000).toISOString(),
      name: opts.state,
      success_redirect_url: opts.successRedirect,
      failure_redirect_url: opts.failureRedirect,
      notify_url: opts.notifyUrl,
    }),
  });
  if (!res.url) throw new Error("Unipile: geen hosted-auth URL terug nie");
  return res.url;
}

type RawParticipant = { display_name?: string; identifier?: string };
export type RawEmailMessage = {
  id: string;
  date?: string;
  from_attendee?: RawParticipant;
  subject?: string;
  body_plain?: string;
  role?: string;
};

export type Epos = {
  id: string;
  van: string;
  onderwerp: string;
  datum: string | null;
  uittreksel: string;
};

export async function lysEposse(accountId: string, limit = 25): Promise<Epos[]> {
  const params = new URLSearchParams({ account_id: accountId, limit: String(limit) });
  const res = await unipileFetch<{ items?: RawEmailMessage[] }>(`/emails?${params}`);
  return (res.items ?? []).map((m) => ({
    id: m.id,
    van: m.from_attendee?.display_name || m.from_attendee?.identifier || "Onbekend",
    onderwerp: m.subject || "(geen onderwerp)",
    datum: m.date ?? null,
    uittreksel: (m.body_plain ?? "").replace(/\s+/g, " ").slice(0, 140),
  }));
}

export async function kryAccount(accountId: string): Promise<{ provider?: string; epos?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await unipileFetch<any>(`/accounts/${accountId}`);
  return {
    provider: res?.type ?? res?.provider ?? undefined,
    epos:
      res?.connection_params?.mail?.username ??
      res?.connection_params?.im?.username ??
      res?.name ??
      undefined,
  };
}

/* ── Folders, full message, send, disconnect ─────────────────────────── */

export type EposVouer = {
  id: string;
  name: string;
  provider_id?: string;
  role?: string;
  nb_mails?: number;
};

export async function lysVouers(accountId: string): Promise<EposVouer[]> {
  const params = new URLSearchParams({ account_id: accountId });
  const res = await unipileFetch<{ items?: EposVouer[] }>(`/folders?${params}`);
  return res.items ?? [];
}

/* NOTE: the /emails `folder` filter wants the PROVIDER id (e.g. Gmail's
   "INBOX"), not Unipile's own folder id (onemanband, verified). */
export async function lysEposseInVouer(
  accountId: string,
  providerFolderId: string | null,
  limit = 25
): Promise<Epos[]> {
  const params = new URLSearchParams({ account_id: accountId, limit: String(limit) });
  if (providerFolderId) params.set("folder", providerFolderId);
  const res = await unipileFetch<{ items?: RawEmailMessage[] }>(`/emails?${params}`);
  return (res.items ?? []).map((m) => ({
    id: m.id,
    van: m.from_attendee?.display_name || m.from_attendee?.identifier || "Onbekend",
    onderwerp: m.subject || "(geen onderwerp)",
    datum: m.date ?? null,
    uittreksel: (m.body_plain ?? "").replace(/\s+/g, " ").slice(0, 140),
  }));
}

export type VolleEpos = {
  id: string;
  provider_id: string | null;
  van_naam: string;
  van_epos: string | null;
  onderwerp: string;
  datum: string | null;
  teks: string;
};

export async function kryEpos(accountId: string, emailId: string): Promise<VolleEpos> {
  const q = new URLSearchParams({ account_id: accountId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await unipileFetch<any>(`/emails/${encodeURIComponent(emailId)}?${q}`);
  const teks =
    raw.body_plain ||
    String(raw.body ?? "")
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim();
  return {
    id: raw.id,
    provider_id: raw.provider_id ?? raw.id ?? null,
    van_naam: raw.from_attendee?.display_name || raw.from_attendee?.identifier || "Onbekend",
    van_epos: raw.from_attendee?.identifier ?? null,
    onderwerp: raw.subject || "(geen onderwerp)",
    datum: raw.date ?? null,
    teks,
  };
}

/** Multipart send — Content-Type intentionally unset so fetch adds the
    multipart boundary itself (setting it manually breaks Unipile's parse). */
export async function stuurEpos(
  accountId: string,
  opts: { na: string; onderwerp: string; teks: string; replyTo?: string | null }
): Promise<void> {
  const form = new FormData();
  form.append("account_id", accountId);
  form.append("subject", opts.onderwerp);
  form.append("body", opts.teks);
  form.append("to", JSON.stringify([{ identifier: opts.na }]));
  if (opts.replyTo) form.append("reply_to", opts.replyTo);
  const res = await fetch(`${apiBase()}/api/v1/emails`, {
    method: "POST",
    headers: { "X-API-KEY": process.env.UNIPILE_API_KEY! },
    body: form,
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Unipile stuur ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function ontkoppelAccount(accountId: string): Promise<void> {
  await fetch(`${apiBase()}/api/v1/accounts/${encodeURIComponent(accountId)}`, {
    method: "DELETE",
    headers: { "X-API-KEY": process.env.UNIPILE_API_KEY! },
  });
}
