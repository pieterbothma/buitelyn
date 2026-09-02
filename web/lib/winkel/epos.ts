/* Bestelling-eposse. Die koper-epos is 'n regsdokument so goed as 'n
   bevestiging: ECTA art. 43 se identiteit en die 7-dae afkoelreg staan daarin.
   Feite kom uit wetlik.ts — nooit hier oorgetik nie. */
import { BELEID, BESIGHEID } from "../wetlik";

export type BestelLyn = { variant_id: string; naam: string; kleur: string; grootte: string | null; prys_sent: number; aantal: number };
export type BestellingRy = {
  verwysing: string;
  items: BestelLyn[];
  koper: { naam: string; van: string; epos: string; selfoon: string };
  adres: { straat: string; woonbuurt: string; stad: string; provinsie: string; poskode: string; nota: string };
  item_sent: number; versending_sent: number; totaal_sent: number;
  modus?: string;
};
export const rand = (sent: number) =>
  `R${Math.floor(sent / 100)},${String(sent % 100).padStart(2, "0")}`;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const adresBlok = (b: BestellingRy) =>
  [b.adres.straat, b.adres.woonbuurt, b.adres.stad, `${b.adres.provinsie} ${b.adres.poskode}`]
    .map(esc).join("<br/>");
/* Een reël per mandjie-lyn — kleur+grootte in hakies, grootte net as dit bestaan. */
const lynReels = (items: BestelLyn[]) => items.map((l) =>
  `${l.aantal} x ${esc(l.naam)} (${esc(l.kleur)}${l.grootte ? `, ${esc(l.grootte)}` : ""}) — ${rand(l.prys_sent * l.aantal)}`
).join("<br/>\n  ");

export function koperEposHtml(b: BestellingRy): string {
  return `<div style="font-family:system-ui;max-width:560px;margin:auto;color:#1a1a1a">
  <h2>Dankie vir jou bestelling, ${esc(b.koper.naam)}.</h2>
  <p>Bestelnommer <strong>${esc(b.verwysing)}</strong></p>
  <p>${lynReels(b.items)}<br/>
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
  <p><strong>${lynReels(b.items)}</strong><br/>${rand(b.totaal_sent)} betaal</p>
  <p>${esc(b.koper.naam)} ${esc(b.koper.van)}<br/>${esc(b.koper.epos)} · ${esc(b.koper.selfoon)}</p>
  <p>${adresBlok(b)}${b.adres.nota ? `<br/><em>Nota: ${esc(b.adres.nota)}</em>` : ""}</p></div>`;
}

/* Onderwerp-bou apart uitgevoer sodat dit sonder netwerk-mocks toetsbaar is:
   'n [TOETS]-bestelling (Paystack se toets-modus) mag NOOIT met 'n regte
   bestelling verwar word in die eienaar se inkassie. */
export function eienaarOnderwerp(b: BestellingRy): string {
  return `${b.modus === "toets" ? "[TOETS] " : ""}Nuwe winkelbestelling ${b.verwysing}`;
}

/* Gedeelde stuur-stap vir stuurBestellingEposse en stuurEienaarWaarskuwing.
   Faal NOOIT met 'n verworpe belofte nie — 'n e-pos-mislukking (ontbrekende
   sleutel, Resend-fout, netwerkfout) mag nooit die webhook self laat faal
   nie; die betaling is klaar en Paystack sou net weer probeer. */
async function stuurEpos(aan: string[], onderwerp: string, html: string): Promise<void> {
  const sleutel = process.env.RESEND_API_KEY;
  if (!sleutel) { console.error("winkel: RESEND_API_KEY ontbreek — geen eposse gestuur"); return; }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${sleutel}`, "content-type": "application/json" },
    body: JSON.stringify({
        from: "Buitelyn Winkel <bestellings@buitelyn.com>",
        /* buitelyn.com kan STUUR (Resend) maar het geen posbus nie — 'n antwoord
           op bestellings@ sou in die niet verdwyn. reply_to stuur antwoorde na
           'n regte inboks (AP se Gmail, oorskryfbaar per env). */
        reply_to: process.env.BESTELLING_ANTWOORD_EPOS ?? "apduplessis@gmail.com",
        to: aan, subject: onderwerp, html,
      }),
  }).then(async r => { if (!r.ok) console.error(`winkel: e-pos misluk (${r.status})`, await r.text()); })
    .catch((e) => console.error("winkel: e-pos-versoek misluk", e));
}

export async function stuurBestellingEposse(b: BestellingRy): Promise<void> {
  const eienaars = (process.env.BESTELLING_EPOSTE ?? "").split(",").map(s => s.trim()).filter(Boolean);
  await Promise.allSettled([
    stuurEpos([b.koper.epos], `Buitelyn — bestelling ${b.verwysing} bevestig`, koperEposHtml(b)),
    ...(eienaars.length ? [stuurEpos(eienaars, eienaarOnderwerp(b), eienaarEposHtml(b))] : []),
  ]);
}

/* Vir gevalle waar die webhook NIE 'n bestelling kan koppel of vertrou nie
   (onbekende verwysing, bedrag-wanverhouding) — die eienaar moet dit sien,
   maar die koper kry geen epos nie want ons weet nie eers wie hy is nie. */
export async function stuurEienaarWaarskuwing(onderwerp: string, html: string): Promise<void> {
  const eienaars = (process.env.BESTELLING_EPOSTE ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (!eienaars.length) return;
  await stuurEpos(eienaars, onderwerp, html);
}
