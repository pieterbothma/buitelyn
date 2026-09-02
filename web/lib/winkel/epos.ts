/* Bestelling-eposse. Die koper-epos is 'n regsdokument so goed as 'n
   bevestiging: ECTA art. 43 se identiteit en die 7-dae afkoelreg staan daarin.
   Feite kom uit wetlik.ts — nooit hier oorgetik nie.

   Uitleg-nota: e-poskliënte verstaan tabelle en inlyn-style, nie flex nie.
   Alles hieronder is dus tabel-gebaseer met die werf se palet: ink #1a1a1a,
   papier #f4f2ee, en die handelsmerk-rooi #f03028 as EEN kol, nie 'n vlak. */
import { BELEID, BESIGHEID } from "../wetlik";

export type BestelLyn = {
  variant_id: string; naam: string; kleur: string; grootte: string | null;
  prys_sent: number; aantal: number;
  /* Absolute foto-URL, vasgevang by tjek-tyd. Ouer bestellings het dit nie —
     die reël render dan sonder prentjie. */
  foto?: string;
};
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

const INK = "#1a1a1a", GEDEMP = "#6b6b6b", PAPIER = "#f4f2ee", LYN = "#e3e0da", ROOI = "#f03028";

const adresBlok = (b: BestellingRy) =>
  [b.adres.straat, b.adres.woonbuurt, b.adres.stad, `${b.adres.provinsie} ${b.adres.poskode}`]
    .map(esc).join("<br/>");

/* Die kop wat elke e-pos dra: die woordmerk as teks (beelde word dikwels
   geblokkeer; teks-eerste bly leesbaar) met die handelsmerk-kol. */
const kop = () => `
  <tr><td style="padding:28px 32px 20px 32px">
    <span style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:${INK}">Buitelyn</span><span style="color:${ROOI};font-size:22px;font-weight:700">.</span>
  </td></tr>`;

const voet = () => `
  <tr><td style="padding:20px 32px 28px 32px;border-top:1px solid ${LYN}">
    <p style="margin:0;font-size:11px;line-height:1.6;color:${GEDEMP}">
      ${esc(BESIGHEID.naam)} · Reg. ${esc(BESIGHEID.registrasienommer)}<br/>
      ${esc(BESIGHEID.adres)} · ${esc(BESIGHEID.epos)}
    </p>
  </td></tr>`;

const omhulsel = (binne: string) => `
<div style="background:${PAPIER};padding:24px 12px;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${LYN}">
    ${kop()}
    ${binne}
    ${voet()}
  </table>
</div>`;

/* Een lynitem as 'n tabelry: duimnael (indien vasgevang), naam, variant, prys. */
const lynRy = (l: BestelLyn) => `
    <tr>
      <td width="64" style="padding:10px 12px 10px 0;vertical-align:top">${l.foto
        ? `<img src="${esc(l.foto)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border:1px solid ${LYN}"/>`
        : `<div style="width:64px;height:64px;background:${PAPIER};border:1px solid ${LYN}"></div>`}</td>
      <td style="padding:10px 0;vertical-align:top">
        <span style="font-size:14px;font-weight:700;color:${INK}">${esc(l.naam)}</span><br/>
        <span style="font-size:12px;color:${GEDEMP}">${esc(l.kleur)}${l.grootte ? ` · ${esc(l.grootte)}` : ""} · ${l.aantal} stuk${l.aantal > 1 ? "s" : ""}</span>
      </td>
      <td align="right" style="padding:10px 0;vertical-align:top;font-size:14px;color:${INK};white-space:nowrap">${rand(l.prys_sent * l.aantal)}</td>
    </tr>`;

const lynTabel = (items: BestelLyn[]) => `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${LYN};border-bottom:1px solid ${LYN}">
      ${items.map(lynRy).join("")}
    </table>`;

const totaleBlok = (b: BestellingRy) => `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px">
      <tr><td style="font-size:13px;color:${GEDEMP};padding:2px 0">Items</td><td align="right" style="font-size:13px;color:${INK}">${rand(b.item_sent)}</td></tr>
      <tr><td style="font-size:13px;color:${GEDEMP};padding:2px 0">Versending</td><td align="right" style="font-size:13px;color:${INK}">${rand(b.versending_sent)}</td></tr>
      <tr><td style="font-size:15px;font-weight:700;color:${INK};padding:8px 0 0 0;border-top:1px solid ${LYN}">Totaal</td><td align="right" style="font-size:15px;font-weight:700;color:${INK};padding:8px 0 0 0;border-top:1px solid ${LYN}">${rand(b.totaal_sent)}</td></tr>
    </table>`;

export function koperEposHtml(b: BestellingRy): string {
  return omhulsel(`
  <tr><td style="padding:0 32px 8px 32px">
    <h1 style="margin:0 0 4px 0;font-size:20px;color:${INK}">Dankie vir jou bestelling, ${esc(b.koper.naam)}.</h1>
    <p style="margin:0 0 16px 0;font-size:13px;color:${GEDEMP}">Bestelnommer <strong style="color:${INK}">${esc(b.verwysing)}</strong> — bevestig en betaal.</p>
    ${lynTabel(b.items)}
    ${totaleBlok(b)}
  </td></tr>
  <tr><td style="padding:16px 32px">
    <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;letter-spacing:0.08em;color:${GEDEMP}">AFLEWERING (${BELEID.afleweringsDae})</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:${INK}">${adresBlok(b)}</p>
    <p style="margin:10px 0 0 0;font-size:12px;color:${GEDEMP}">Lyk die adres verkeerd? Antwoord dadelik op hierdie e-pos.</p>
  </td></tr>
  <tr><td style="padding:0 32px 20px 32px">
    <p style="margin:0;font-size:11px;line-height:1.6;color:${GEDEMP}">Jy mag binne ${BELEID.afkoelDae} dae ná ontvangs kanselleer —
    sien <a href="https://buitelyn.com/kansellasie" style="color:${INK}">kansellasie</a> en
    <a href="https://buitelyn.com/terugbetalings" style="color:${INK}">terugbetalings</a>.</p>
  </td></tr>`);
}

export function eienaarEposHtml(b: BestellingRy): string {
  return omhulsel(`
  <tr><td style="padding:0 32px 8px 32px">
    <h1 style="margin:0 0 4px 0;font-size:20px;color:${INK}">Nuwe bestelling ${esc(b.verwysing)}</h1>
    <p style="margin:0 0 16px 0;font-size:13px;color:${GEDEMP}"><strong style="color:${INK}">${rand(b.totaal_sent)}</strong> betaal — gereed om te stuur.</p>
    ${lynTabel(b.items)}
  </td></tr>
  <tr><td style="padding:16px 32px 20px 32px">
    <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;letter-spacing:0.08em;color:${GEDEMP}">KOPER</p>
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;color:${INK}">${esc(b.koper.naam)} ${esc(b.koper.van)}<br/>${esc(b.koper.epos)} · ${esc(b.koper.selfoon)}</p>
    <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;letter-spacing:0.08em;color:${GEDEMP}">AFLEWERINGSADRES</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:${INK}">${adresBlok(b)}${b.adres.nota ? `<br/><em style="color:${GEDEMP}">Nota: ${esc(b.adres.nota)}</em>` : ""}</p>
  </td></tr>`);
}

/* Die spoor-epos wanneer AP die bestelling as gestuur merk. Koerier en
   spoornommer is albei opsioneel — 'n handaflewering in die Kaap het nie 'n
   spoornommer nie, en die e-pos pas sy sin daarby aan. */
export function spoorEposHtml(b: BestellingRy, koerier?: string | null, spoornommer?: string | null): string {
  const met = koerier ? ` met ${esc(koerier)}` : "";
  return omhulsel(`
  <tr><td style="padding:0 32px 8px 32px">
    <h1 style="margin:0 0 4px 0;font-size:20px;color:${INK}">Jou bestelling is op pad${met}.</h1>
    <p style="margin:0 0 16px 0;font-size:13px;color:${GEDEMP}">Bestelnommer <strong style="color:${INK}">${esc(b.verwysing)}</strong></p>
    ${spoornommer ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${PAPIER};border:1px solid ${LYN};margin-bottom:16px">
      <tr><td style="padding:14px 16px">
        <span style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:${GEDEMP}">SPOORNOMMER</span><br/>
        <span style="font-size:18px;font-weight:700;font-family:Menlo,Consolas,monospace;color:${INK}">${esc(spoornommer)}</span>
      </td></tr>
    </table>` : ""}
    ${lynTabel(b.items)}
  </td></tr>
  <tr><td style="padding:16px 32px 20px 32px">
    <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;letter-spacing:0.08em;color:${GEDEMP}">AFLEWERINGSADRES</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:${INK}">${adresBlok(b)}</p>
    <p style="margin:10px 0 0 0;font-size:12px;color:${GEDEMP}">Vrae oor jou aflewering? Antwoord net op hierdie e-pos.</p>
  </td></tr>`);
}

/* Onderwerp-bou apart uitgevoer sodat dit sonder netwerk-mocks toetsbaar is:
   'n [TOETS]-bestelling (Paystack se toets-modus) mag NOOIT met 'n regte
   bestelling verwar word in die eienaar se inkassie. */
export function eienaarOnderwerp(b: BestellingRy): string {
  return `${b.modus === "toets" ? "[TOETS] " : ""}Nuwe winkelbestelling ${b.verwysing}`;
}
export function spoorOnderwerp(b: BestellingRy): string {
  return `${b.modus === "toets" ? "[TOETS] " : ""}Buitelyn — jou bestelling ${b.verwysing} is op pad`;
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
    /* hallo@buitelyn.com het 'n regte posbus (Piet, 2026-09-02) — stuur van
       daar af, dan land 'n koper se antwoord vanself op die regte plek. */
    body: JSON.stringify({ from: "Buitelyn <hallo@buitelyn.com>", to: aan, subject: onderwerp, html }),
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

export async function stuurSpoorEpos(b: BestellingRy, koerier?: string | null, spoornommer?: string | null): Promise<void> {
  await stuurEpos([b.koper.epos], spoorOnderwerp(b), spoorEposHtml(b, koerier, spoornommer));
}

/* Vir gevalle waar die webhook NIE 'n bestelling kan koppel of vertrou nie
   (onbekende verwysing, bedrag-wanverhouding) — die eienaar moet dit sien,
   maar die koper kry geen epos nie want ons weet nie eers wie hy is nie. */
export async function stuurEienaarWaarskuwing(onderwerp: string, html: string): Promise<void> {
  const eienaars = (process.env.BESTELLING_EPOSTE ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (!eienaars.length) return;
  await stuurEpos(eienaars, onderwerp, html);
}
