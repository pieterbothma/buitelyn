import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { renderDuimnael } from "./render";
import { GLOED_VERSTEK, RAAM, normaliseerDuimnael, type Duimnael } from "./spec";

/* Uitleg-regressietoetse deur hashes, want satori waarsku NOOIT oor uitleg
 * nie — dit skuif net stil. 'n Kaart met 'n verkeerde uitleg het voorheen
 * tsc, eslint én next build skoon deurgekom. Net 'n gerenderde vergelyking
 * het dit gevang.
 *
 * Faal 'n hash: is die verandering BEDOEL? Render dit en KYK daarna voordat
 * jy die nuwe waarde inplak. */

const leeg: Duimnael = { agtergrond: null, lae: [] };

const vol = normaliseerDuimnael({
  agtergrond: null,
  lae: [
    {
      soort: "reaksie",
      url: "https://example.invalid/ap.png",
      wydte: 1024,
      hoogte: 1024,
      plek: { x: 0.25, y: 0.55, grootte: 0.55 },
      gloed: GLOED_VERSTEK,
    },
    { soort: "teks", teks: "SAKENUUS", kleur: "wit", belyn: "links", plek: { x: 0.5, y: 0.08, grootte: 0.09 } },
    { soort: "teks", teks: "HERDEFINIEER", kleur: "wit", belyn: "links", plek: { x: 0.5, y: 0.22, grootte: 0.09 } },
  ],
});

describe("renderDuimnael", () => {
  it("render 'n leë duimnael op presies 1280×720", async () => {
    const png = await renderDuimnael(leeg);
    expect(png.length).toBeGreaterThan(0);
    // PNG IHDR: breedte en hoogte is groot-endiaan op greep 16..24.
    expect(png.readUInt32BE(16)).toBe(RAAM.w);
    expect(png.readUInt32BE(20)).toBe(RAAM.h);
  });

  it("skaal die hele boom vir 'n voorskou", async () => {
    const png = await renderDuimnael(leeg, 0.5);
    expect(png.readUInt32BE(16)).toBe(RAAM.w / 2);
    expect(png.readUInt32BE(20)).toBe(RAAM.h / 2);
  });

  it("is deterministies — dieselfde spec gee dieselfde grepe", async () => {
    const a = await renderDuimnael(vol);
    const b = await renderDuimnael(vol);
    expect(createHash("sha256").update(a).digest("hex")).toBe(
      createHash("sha256").update(b).digest("hex")
    );
  });

  it("teks verander die uitset — die lae word werklik geteken", async () => {
    const sonder = await renderDuimnael({ ...vol, lae: vol.lae.filter((l) => l.soort !== "teks") });
    const met = await renderDuimnael(vol);
    expect(createHash("sha256").update(sonder).digest("hex")).not.toBe(
      createHash("sha256").update(met).digest("hex")
    );
  });

  it("bed die logo in — dit word van skyf gelees, nie oor HTTP gehaal nie", async () => {
    /* NEXT_PUBLIC_SITE_URL wys na produksie, so 'n HTTP-logo sou plaaslik en in
       CI stil verdwyn. Dié toets sou dit vang: 'n wit en 'n swart logo moet
       verskillende grepe gee, wat net kan gebeur as albei werklik gelees is. */
    const wit = await renderDuimnael(
      normaliseerDuimnael({ agtergrond: null, lae: [{ soort: "logo", kleur: "wit", plek: { x: 0.85, y: 0.85, grootte: 0.2 } }] })
    );
    const ink = await renderDuimnael(
      normaliseerDuimnael({ agtergrond: null, lae: [{ soort: "logo", kleur: "ink", plek: { x: 0.85, y: 0.85, grootte: 0.2 } }] })
    );
    const leegPng = await renderDuimnael(leeg);
    const h = (b: Buffer) => createHash("sha256").update(b).digest("hex");
    expect(h(wit)).not.toBe(h(leegPng));
    expect(h(ink)).not.toBe(h(leegPng));
    expect(h(wit)).not.toBe(h(ink));
  });

  it("die gloed verander die uitset wanneer dit aangeskakel word", async () => {
    const af = normaliseerDuimnael({
      ...vol,
      lae: vol.lae.map((l) => (l.soort === "reaksie" ? { ...l, gloed: { ...GLOED_VERSTEK, aan: false } } : l)),
    });
    const a = await renderDuimnael(af);
    const b = await renderDuimnael(vol);
    expect(createHash("sha256").update(a).digest("hex")).not.toBe(
      createHash("sha256").update(b).digest("hex")
    );
  });
});
