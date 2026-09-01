/* Bestelling-eposse. Die koper-epos is 'n regsdokument so goed as 'n
   bevestiging: ECTA art. 43 se identiteit en die 7-dae afkoelreg staan daarin.
   Feite kom uit wetlik.ts — nooit hier oorgetik nie. */
import { BELEID, BESIGHEID } from "../wetlik";

export type BestellingRy = {
  verwysing: string;
  item: { naam: string; kleur: string; prys_sent: number; aantal: number };
  koper: { naam: string; van: string; epos: string; selfoon: string };
  adres: { straat: string; woonbuurt: string; stad: string; provinsie: string; poskode: string; nota: string };
  item_sent: number; versending_sent: number; totaal_sent: number;
};
export const rand = (sent: number) =>
  `R${Math.floor(sent / 100)},${String(sent % 100).padStart(2, "0")}`;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const adresBlok = (b: BestellingRy) =>
  [b.adres.straat, b.adres.woonbuurt, b.adres.stad, `${b.adres.provinsie} ${b.adres.poskode}`]
    .map(esc).join("<br/>");

export function koperEposHtml(b: BestellingRy): string {
  return `<div style="font-family:system-ui;max-width:560px;margin:auto;color:#1a1a1a">
  <h2>Dankie vir jou bestelling, ${esc(b.koper.naam)}.</h2>
  <p>Bestelnommer <strong>${esc(b.verwysing)}</strong></p>
  <p>${b.item.aantal} x ${esc(b.item.naam)} (${esc(b.item.kleur)}) — ${rand(b.item_sent)}<br/>
  Versending — ${rand(b.versending_sent)}<br/><strong>Totaal — ${rand(b.totaal_sent)}</strong></p>
  <p><strong>Aflewering</strong> (${BELEID.afleweringsDae}):<br/>${adresBlok(b)}</p>
  <p>Lyk die adres verkeerd? Antwoord dadelik op hierdie e-pos.</p>
  <p style="font-size:13px;color:#555">Jy mag binne ${BELEID.afkoelDae} dae ná ontvangs kanselleer —
  sien <a href="https://buitelyn.com/kansellasie">kansellasie</a> en
  <a href="https://buitelyn.com/terugbetalings">terugbetalings</a>.</p>
  <hr style="border:none;border-top:1px solid #ddd"/>
  <p style="font-size:12px;color:#777">${BESIGHEID.naam} · Reg. ${BESIGHEID.registrasienommer} ·
  ${BESIGHEID.adres} · ${BESIGHEID.epos}</p></div>`;
}
export function eienaarEposHtml(b: BestellingRy): string {
  return `<div style="font-family:system-ui;max-width:560px;margin:auto;color:#1a1a1a">
  <h2>Nuwe bestelling ${esc(b.verwysing)}</h2>
  <p><strong>${b.item.aantal} x ${esc(b.item.naam)} — ${esc(b.item.kleur)}</strong> · ${rand(b.totaal_sent)} betaal</p>
  <p>${esc(b.koper.naam)} ${esc(b.koper.van)}<br/>${esc(b.koper.epos)} · ${esc(b.koper.selfoon)}</p>
  <p>${adresBlok(b)}${b.adres.nota ? `<br/><em>Nota: ${esc(b.adres.nota)}</em>` : ""}</p></div>`;
}

export async function stuurBestellingEposse(b: BestellingRy): Promise<void> {
  const sleutel = process.env.RESEND_API_KEY;
  const eienaars = (process.env.BESTELLING_EPOSTE ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (!sleutel) { console.error("winkel: RESEND_API_KEY ontbreek — geen eposse gestuur"); return; }
  const stuur = (aan: string[], onderwerp: string, html: string) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${sleutel}`, "content-type": "application/json" },
      body: JSON.stringify({ from: "Buitelyn Winkel <bestellings@buitelyn.com>", to: aan, subject: onderwerp, html }),
    }).then(async r => { if (!r.ok) console.error(`winkel: e-pos misluk (${r.status})`, await r.text()); });
  /* E-pos-mislukking mag NOOIT die webhook laat faal nie — die betaling is
     klaar; Paystack sou net weer probeer en die voorraad-logika verwar. */
  await Promise.allSettled([
    stuur([b.koper.epos], `Buitelyn — bestelling ${b.verwysing} bevestig`, koperEposHtml(b)),
    ...(eienaars.length ? [stuur(eienaars, `Nuwe winkelbestelling ${b.verwysing}`, eienaarEposHtml(b))] : []),
  ]);
}
