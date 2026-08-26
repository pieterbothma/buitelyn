import { afterEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({ auth: { getUser } }),
}));

const upload = vi.fn();
vi.mock("@/lib/supabase/service", () => ({
  supabaseService: () => ({ storage: { from: () => ({ upload }) } }),
}));

import { POST } from "./route";

// 'n Egte 1x1 deursigtige PNG. Drie arbitrêre grepe is nie 'n beeld nie, en 'n
// toets wat dit voer, toets iets anders as wat die roete in produksie sien.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function versoek(velde: Record<string, string>, lêers: number = 1): Request {
  const vorm = new FormData();
  for (const [k, v] of Object.entries(velde)) vorm.append(k, v);
  for (let i = 0; i < lêers; i++) {
    vorm.append("verwysing", new File([new Uint8Array(PNG)], `r${i}.png`, { type: "image/png" }));
  }
  return new Request("http://t/api/duimnael/agtergrond", { method: "POST", body: vorm });
}

afterEach(() => {
  vi.restoreAllMocks();
  getUser.mockReset();
  upload.mockReset();
});

describe("POST /api/duimnael/agtergrond", () => {
  it("weier 'n versoek sonder sessie", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(versoek({ prompt: "iets" }));
    expect(res.status).toBe(401);
  });

  it("weier 'n leë prompt", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    const res = await POST(versoek({ prompt: "   " }));
    expect(res.status).toBe(400);
  });

  it("weier wanneer daar geen verwysingsbeeld is nie", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    const res = await POST(versoek({ prompt: "iets" }, 0));
    expect(res.status).toBe(400);
    expect((await res.json()).fout).toMatch(/verwysing/i);
  });

  it("weier WebP — satori dekodeer dit nie en die duimnael kom stil blank uit", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    const vorm = new FormData();
    vorm.append("prompt", "iets");
    vorm.append("verwysing", new File([new Uint8Array([1])], "r.webp", { type: "image/webp" }));
    const res = await POST(new Request("http://t/x", { method: "POST", body: vorm }));
    expect(res.status).toBe(415);
  });

  it("weier 'n lêer wat nie 'n beeld is nie — normalisering is die enigste hek", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("OPENAI_API_KEY", "sk-toets");
    const vorm = new FormData();
    vorm.append("prompt", "iets");
    vorm.append("verwysing", new File([new Uint8Array([1, 2, 3])], "rommel.png", { type: "image/png" }));
    const res = await POST(new Request("http://t/x", { method: "POST", body: vorm }));
    expect(res.status).toBe(400);
    expect((await res.json()).fout).toMatch(/beeld/i);
  });

  it("gee 503 wanneer OPENAI_API_KEY ontbreek", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("OPENAI_API_KEY", "");
    const res = await POST(versoek({ prompt: "iets" }));
    expect(res.status).toBe(503);
  });

  it("gee 502 en die model se liggaam terug wanneer die beeldmodel faal", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("OPENAI_API_KEY", "sk-toets");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("stukkend", { status: 400 })));
    // Met onderwerpe saam word die visie-stap oorgeslaan, so die enigste
    // oproep is die beeldmodel s'n.
    const res = await POST(versoek({ prompt: "iets", onderwerpe: "Naspers" }));
    expect(res.status).toBe(502);
    expect((await res.json()).fout).toContain("stukkend");
  });

  it("stuur die VERWYSING NOOIT na die beeldmodel nie — net woorde", async () => {
    /* Dit is die hele punt van die herbou. /v1/images/edits is 'n REDIGEER-
       eindpunt: dit het Naspers se logo letterlik oorgeteken, son, letters en
       al, ten spyte van vyf verbods-sinne. Gaan die beeld nooit soontoe nie,
       is kopieer struktureel onmoontlik in plaas van vriendelik afgeraai. */
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("OPENAI_API_KEY", "sk-toets");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.test");
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const haal = vi.fn(async () => Response.json({ data: [{ b64_json: png }] }));
    vi.stubGlobal("fetch", haal);
    upload.mockResolvedValue({ error: null });

    await POST(versoek({ prompt: "iets", onderwerpe: "Naspers" }));

    expect(haal.mock.calls.length).toBeGreaterThan(0);
    for (const oproep of haal.mock.calls) {
      const url = String((oproep as unknown as [string])[0]);
      const opsies = (oproep as unknown as [string, RequestInit | undefined])[1];
      expect(url).not.toContain("/images/edits");
      expect(opsies?.body instanceof FormData).toBe(false);
    }
    const urls = haal.mock.calls.map((c) => String((c as unknown as [string])[0]));
    expect(urls.some((u) => u.includes("/images/generations"))).toBe(true);
  });

  it("stoor die beeld en gee die publieke URL terug", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("OPENAI_API_KEY", "sk-toets");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.test");
    // 1x1 deursigtige PNG
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [{ b64_json: png }] }))
    );
    upload.mockResolvedValue({ error: null });
    const res = await POST(versoek({ prompt: "iets", onderwerpe: "Naspers, Clicks, rugby" }));
    expect(res.status).toBe(200);
    const liggaam = await res.json();
    expect(liggaam.ok).toBe(true);
    expect(liggaam.url).toContain("https://sb.test/storage/v1/object/public/duimnael/");
    expect(liggaam.wydte).toBeGreaterThan(0);
    expect(liggaam.hoogte).toBeGreaterThan(0);
    // Die onderwerpe kom terug sodat AP kan sien wat die KI verstaan het.
    expect(liggaam.onderwerpe).toBe("Naspers, Clicks, rugby");
  });
});
