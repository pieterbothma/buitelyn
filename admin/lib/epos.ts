/* Die op-pad-e-pos, plaaslik in admin: die kruis-app-import na
   web/lib/winkel/epos werk plaaslik, maar Vercel laai net admin/ op en die
   bou val met "Module not found". Dieselfde ontwerptaal as die winkel se
   e-posse; die voetskrif bly minimaal — die volle ECTA-identiteit het reeds
   op die bevestigings-e-pos gegaan, waar dit regtens moet wees. */
import type { Bestelling } from "./winkel";
import { rand } from "./winkel";

const INK = "#1a1a1a", GEDEMP = "#6b6b6b", PAPIER = "#f4f2ee", LYN = "#e3e0da", ROOI = "#f03028";
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const lynRy = (l: Bestelling["items"][number]) => `
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

export function spoorEposHtml(b: Bestelling, koerier?: string | null, spoornommer?: string | null): string {
  const met = koerier ? ` met ${esc(koerier)}` : "";
  const adres = [b.adres.straat, b.adres.woonbuurt, b.adres.stad, `${b.adres.provinsie} ${b.adres.poskode}`]
    .map(esc).join("<br/>");
  return `
<div style="background:${PAPIER};padding:24px 12px;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${LYN}">
    <tr><td style="padding:28px 32px 20px 32px">
      <span style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:${INK}">Buitelyn</span><span style="color:${ROOI};font-size:22px;font-weight:700">.</span>
    </td></tr>
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
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${LYN};border-bottom:1px solid ${LYN}">
        ${b.items.map(lynRy).join("")}
      </table>
    </td></tr>
    <tr><td style="padding:16px 32px 20px 32px">
      <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;letter-spacing:0.08em;color:${GEDEMP}">AFLEWERINGSADRES</p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:${INK}">${adres}</p>
      <p style="margin:10px 0 0 0;font-size:12px;color:${GEDEMP}">Vrae oor jou aflewering? Antwoord net op hierdie e-pos.</p>
    </td></tr>
    <tr><td style="padding:20px 32px 28px 32px;border-top:1px solid ${LYN}">
      <p style="margin:0;font-size:11px;color:${GEDEMP}">Buitelyn · hallo@buitelyn.com</p>
    </td></tr>
  </table>
</div>`;
}

export function spoorOnderwerp(b: Bestelling): string {
  return `${b.modus === "toets" ? "[TOETS] " : ""}Buitelyn — jou bestelling ${b.verwysing} is op pad`;
}

export async function stuurSpoorEpos(b: Bestelling, koerier?: string | null, spoornommer?: string | null): Promise<void> {
  const sleutel = process.env.RESEND_API_KEY;
  if (!sleutel) { console.error("bestellings: RESEND_API_KEY ontbreek — geen op-pad-e-pos"); return; }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${sleutel}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: "Buitelyn <hallo@buitelyn.com>",
      to: [b.koper.epos],
      subject: spoorOnderwerp(b),
      html: spoorEposHtml(b, koerier, spoornommer),
    }),
  }).then(async r => { if (!r.ok) console.error(`bestellings: op-pad-e-pos misluk (${r.status})`, await r.text()); })
    .catch((e) => console.error("bestellings: op-pad-e-pos-versoek misluk", e));
}
