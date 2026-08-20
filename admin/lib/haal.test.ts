import { describe, expect, it, vi, afterEach } from "vitest";
import { haalJson } from "./haal";

function stelFetch(uitslag: { status?: number; liggaam?: string } | Error) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (uitslag instanceof Error) throw uitslag;
      return new Response(uitslag.liggaam ?? "", { status: uitslag.status ?? 200 });
    })
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("haalJson", () => {
  it("gee die data terug by 'n geldige antwoord", async () => {
    stelFetch({ liggaam: JSON.stringify({ url: "https://x.test/a.png" }) });
    const u = await haalJson<{ url: string }>("/api/toets");
    expect(u).toEqual({ ok: true, data: { url: "https://x.test/a.png" } });
  });

  it("sê 'geen verbinding' wanneer die fetch self gooi", async () => {
    stelFetch(new TypeError("Failed to fetch"));
    const u = await haalJson("/api/toets");
    expect(u.ok).toBe(false);
    expect(u.ok === false && u.fout).toContain("Geen verbinding");
  });

  it("wys die status wanneer die bediener 'n HTML-foutbladsy gee", async () => {
    // Presies die spotprent se geval: 'n 500 met HTML. Vroeër het res.json()
    // gegooi en die catch het "Netwerkfout" gewys.
    stelFetch({ status: 500, liggaam: "<!DOCTYPE html><html>oeps</html>" });
    const u = await haalJson("/api/fotos/skep");
    expect(u.ok === false && u.fout).toBe("Bedienerfout 500.");
  });

  it("verkies die bediener se eie foutboodskap bo die status", async () => {
    stelFetch({ status: 502, liggaam: JSON.stringify({ fout: "Beeldmodel 400: prompt geweier" }) });
    const u = await haalJson("/api/fotos/skep");
    expect(u.ok === false && u.fout).toBe("Beeldmodel 400: prompt geweier");
  });

  it("vang 'n 200 wat nie JSON is nie", async () => {
    stelFetch({ status: 200, liggaam: "<html>" });
    const u = await haalJson("/api/toets");
    expect(u.ok === false && u.fout).toContain("Onverwagte antwoord");
  });

  it("vang 'n 200 met 'n fout-veld in die liggaam", async () => {
    stelFetch({ status: 200, liggaam: JSON.stringify({ fout: "geen beeld terug nie" }) });
    const u = await haalJson("/api/fotos/skep");
    expect(u.ok === false && u.fout).toBe("geen beeld terug nie");
  });
});
