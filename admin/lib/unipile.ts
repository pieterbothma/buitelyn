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
