/* Bestelling-invoer. Die vorm valideer ook, maar die bediener vertrou niks:
   die koerier het 'n regte selfoon en 'n regte poskode nodig, en 'n stil
   aanvaarde flenter-adres word 'n pet wat nooit opdaag nie. */
export const PROVINSIES = ["Gauteng","Wes-Kaap","Oos-Kaap","Noord-Kaap","KwaZulu-Natal",
  "Vrystaat","Noordwes","Limpopo","Mpumalanga"] as const;
export const VERSENDING_SENT = 9900; // R99 vaste koerierfooi (Piet, 2026-09-01)

export type BestellingInvoer = {
  items: { variantId: string; aantal: number }[];
  koper: { naam: string; van: string; epos: string; selfoon: string };
  adres: { straat: string; woonbuurt: string; stad: string; provinsie: string; poskode: string; nota: string };
};
const EPOS = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SELFOON = /^(\+27|0)[6-8][0-9]{8}$/;   // SA-selnommers
const POSKODE = /^[0-9]{4}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function s(v: unknown, maks: number): string {
  return typeof v === "string" ? v.trim().slice(0, maks) : "";
}
export function valideerBestelling(liggaam: unknown):
  { ok: true; data: BestellingInvoer } | { ok: false; fout: string } {
  const l = (liggaam ?? {}) as Record<string, unknown>;
  const k = (l.koper ?? {}) as Record<string, unknown>;
  const a = (l.adres ?? {}) as Record<string, unknown>;
  const selfoonRou = typeof k.selfoon === "string" ? k.selfoon : "";
  const itemsRou = Array.isArray(l.items) ? l.items : [];
  const data: BestellingInvoer = {
    items: itemsRou.map((r) => {
      const i = (r ?? {}) as Record<string, unknown>;
      return { variantId: s(i.variantId, 40), aantal: Number(i.aantal) };
    }),
    koper: { naam: s(k.naam, 80), van: s(k.van, 80), epos: s(k.epos, 254).toLowerCase(), selfoon: selfoonRou.replace(/[\s-]/g, "").trim().slice(0, 15) },
    adres: { straat: s(a.straat, 160), woonbuurt: s(a.woonbuurt, 80), stad: s(a.stad, 80),
             provinsie: s(a.provinsie, 30), poskode: s(a.poskode, 4), nota: s(a.nota, 300) },
  };
  if (data.items.length < 1 || data.items.length > 20)
    return { ok: false, fout: "Die mandjie moet tussen 1 en 20 items hê." };
  for (const item of data.items) {
    if (!UUID.test(item.variantId)) return { ok: false, fout: "Kies asseblief 'n kleur." };
    if (!Number.isInteger(item.aantal) || item.aantal < 1 || item.aantal > 5)
      return { ok: false, fout: "Hoeveelheid moet tussen 1 en 5 wees." };
  }
  const ids = data.items.map((item) => item.variantId);
  if (new Set(ids).size !== ids.length)
    return { ok: false, fout: "Dieselfde item is twee keer in die mandjie." };
  if (!data.koper.naam || !data.koper.van) return { ok: false, fout: "Naam en van is nodig." };
  if (!EPOS.test(data.koper.epos)) return { ok: false, fout: "Daardie e-posadres lyk nie reg nie." };
  if (!SELFOON.test(data.koper.selfoon)) return { ok: false, fout: "Daardie selfoonnommer lyk nie reg nie." };
  if (!data.adres.straat || !data.adres.woonbuurt || !data.adres.stad)
    return { ok: false, fout: "Die afleweringsadres is onvolledig." };
  if (!(PROVINSIES as readonly string[]).includes(data.adres.provinsie))
    return { ok: false, fout: "Kies asseblief 'n provinsie." };
  if (!POSKODE.test(data.adres.poskode)) return { ok: false, fout: "Die poskode moet 4 syfers wees." };
  return { ok: true, data };
}
