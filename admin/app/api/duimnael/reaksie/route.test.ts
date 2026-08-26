import { afterEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({ auth: { getUser } }),
}));

const upload = vi.fn();
const remove = vi.fn();
vi.mock("@/lib/supabase/service", () => ({
  supabaseService: () => ({ storage: { from: () => ({ upload, remove }) } }),
}));

/* Die egte helper is URL-IN, URL-UIT — nie grepe nie. Die mock moet dieselfde
   vorm hê, anders toets ons 'n roete wat in produksie nie kan werk nie.
   vi.hoisted() is nodig omdat die factory hierdie veranderlikes DIREK
   terugstuur (nie binne 'n toegemaakte funksie soos die supabase-mocks nie) —
   sonder dit tref 'n gewone `const` die TDZ wanneer vi.mock() gehys word. */
const { verwyderAgtergrondReplicate, replicateConfigured } = vi.hoisted(() => ({
  verwyderAgtergrondReplicate: vi.fn<(url: string) => Promise<string>>(),
  replicateConfigured: vi.fn(() => true),
}));
vi.mock("@/lib/replicate", () => ({ verwyderAgtergrondReplicate, replicateConfigured }));

import { DELETE, POST } from "./route";

// 1x1 deursigtige PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function oplaai(naam = "blij.png", tipe = "image/png"): Request {
  const vorm = new FormData();
  vorm.append("leer", new File([new Uint8Array(PNG)], naam, { type: tipe }));
  return new Request("http://t/api/duimnael/reaksie", { method: "POST", body: vorm });
}

afterEach(() => {
  vi.restoreAllMocks();
  getUser.mockReset();
  upload.mockReset();
  remove.mockReset();
  verwyderAgtergrondReplicate.mockReset();
  replicateConfigured.mockReturnValue(true);
});

describe("POST /api/duimnael/reaksie", () => {
  it("weier sonder sessie", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(oplaai())).status).toBe(401);
  });

  it("weier WebP", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    expect((await POST(oplaai("x.webp", "image/webp"))).status).toBe(415);
  });

  it("weier 'n lêer wat nie 'n beeld is nie, en bel Replicate glad nie", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    const vorm = new FormData();
    vorm.append("leer", new File([new Uint8Array([1, 2, 3])], "rommel.png", { type: "image/png" }));
    const res = await POST(new Request("http://t/x", { method: "POST", body: vorm }));
    expect(res.status).toBe(400);
    expect(verwyderAgtergrondReplicate).not.toHaveBeenCalled();
  });

  it("gee 503 wanneer Replicate nie opgestel is nie", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    replicateConfigured.mockReturnValue(false);
    const res = await POST(oplaai());
    expect(res.status).toBe(503);
    expect((await res.json()).fout).toContain("REPLICATE_API_TOKEN");
  });

  it("laai die rou beeld op, gee Replicate 'n URL, en herhuisves die uitset", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.test");
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    verwyderAgtergrondReplicate.mockResolvedValue("https://replicate.delivery/tydelik.png");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array(PNG), { status: 200 }))
    );

    const res = await POST(oplaai());
    expect(res.status).toBe(200);

    // Replicate kry 'n URL, nooit grepe nie.
    const arg = verwyderAgtergrondReplicate.mock.calls[0][0];
    expect(typeof arg).toBe("string");
    expect(arg).toContain("https://sb.test/storage/v1/object/public/duimnael-reaksies/rou/");

    // Die tydelike uitset word dadelik gehaal, want dit verval binne 'n uur.
    expect(fetch).toHaveBeenCalledWith("https://replicate.delivery/tydelik.png", expect.anything());

    // Twee oplaaie (rou + uitgesny) en die rou een word weer opgeruim.
    expect(upload).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith([expect.stringContaining("rou/")]);

    expect((await res.json()).url).toContain("/duimnael-reaksies/");
  });

  it("ruim die rou oplaai op wanneer Replicate faal", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.test");
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    verwyderAgtergrondReplicate.mockRejectedValue(new Error("Replicate 500"));
    const res = await POST(oplaai());
    expect(res.status).toBe(502);
    expect(remove).toHaveBeenCalledWith([expect.stringContaining("rou/")]);
  });
});

describe("DELETE /api/duimnael/reaksie", () => {
  it("weier sonder sessie", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(new Request("http://t/api/duimnael/reaksie?naam=a.png", { method: "DELETE" }));
    expect(res.status).toBe(401);
  });

  it("weier 'n naam met 'n padskeier — geen ontsnapping uit die emmer nie", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    const res = await DELETE(
      new Request("http://t/api/duimnael/reaksie?naam=../ander/x.png", { method: "DELETE" })
    );
    expect(res.status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  });

  it("verwyder die reaksie uit die emmer", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    remove.mockResolvedValue({ error: null });
    const res = await DELETE(new Request("http://t/api/duimnael/reaksie?naam=blij.png", { method: "DELETE" }));
    expect(res.status).toBe(200);
    expect(remove).toHaveBeenCalledWith(["blij.png"]);
  });
});
