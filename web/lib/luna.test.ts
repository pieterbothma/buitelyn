import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lunaAan, lunaJson, metLuna, skoonLuna } from "./luna";

const antwoord = (teks: string, status = 200) =>
  new Response(
    JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: teks }] }], usage: {} }),
    { status }
  );

describe("luna", () => {
  const oud = { ...process.env };
  let fetchSpioen: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "toets-openai";
    delete process.env.LUNA_SKRYF;
    fetchSpioen = vi.fn();
    vi.stubGlobal("fetch", fetchSpioen);
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...oud };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is af sonder sleutel of met LUNA_SKRYF=off", () => {
    expect(lunaAan()).toBe(true);
    process.env.LUNA_SKRYF = "off";
    expect(lunaAan()).toBe(false);
    delete process.env.LUNA_SKRYF;
    delete process.env.OPENAI_API_KEY;
    expect(lunaAan()).toBe(false);
  });

  it("sonder sleutel roep dit nooit OpenAI nie en Gemini skryf", async () => {
    delete process.env.OPENAI_API_KEY;
    const luna = vi.fn(async () => "luna");
    expect(await metLuna("t", luna, async () => "gemini")).toBe("gemini");
    expect(luna).not.toHaveBeenCalled();
  });

  it("val terug op Gemini as Luna gooi", async () => {
    expect(await metLuna("t", async () => { throw new Error("500"); }, async () => "gemini")).toBe("gemini");
  });

  it("maak krulaanhalings ná die parse skoon sodat die JSON heel bly", async () => {
    fetchSpioen.mockResolvedValue(antwoord('{"items":[{"s":"Hy sê “ja” vir ’n bod"}]}'));
    const uit = await lunaJson<{ items: { s: string }[] }>("json", { naam: "t", skema: {} });
    expect(uit.items[0].s).toBe(`Hy sê "ja" vir 'n bod`);
    const lyf = JSON.parse(fetchSpioen.mock.calls[0][1].body);
    expect(lyf).toMatchObject({ model: "gpt-6-luna", store: false, reasoning: { effort: "low" } });
    expect(lyf.temperature).toBeUndefined();
    expect(lyf.text.format).toMatchObject({ type: "json_schema", strict: true });
  });

  it("haal markdown en ongespasieerde em-strepe uit", () => {
    expect(skoonLuna("Brent het **7%** gesak—’n groot skuif")).toBe("Brent het 7% gesak – 'n groot skuif");
  });
});
