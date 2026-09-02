/* Paystack REST. Bedrae is in SENT (ZAR). Die webhook-handtekening is
   HMAC-SHA512 van die ROU liggaam met die geheime sleutel — dus moet die
   roete request.text() lees vóór enige JSON.parse. */
import { createHmac, timingSafeEqual } from "node:crypto";

const BASIS = "https://api.paystack.co";
const geheim = () => process.env.PAYSTACK_SECRET_KEY ?? "";
export const toetsModus = () => geheim().startsWith("sk_test_");

export function webhookGeldig(rouLiggaam: string, handtekening: string | null, sleutel: string): boolean {
  if (!handtekening) return false;
  const verwag = createHmac("sha512", sleutel).update(rouLiggaam).digest("hex");
  const a = Buffer.from(verwag), b = Buffer.from(handtekening);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function beginTransaksie(o: { epos: string; bedragSent: number; verwysing: string; callbackUrl: string }): Promise<string> {
  const res = await fetch(`${BASIS}/transaction/initialize`, {
    method: "POST",
    headers: { authorization: `Bearer ${geheim()}`, "content-type": "application/json" },
    body: JSON.stringify({ email: o.epos, amount: o.bedragSent, currency: "ZAR",
      reference: o.verwysing, callback_url: o.callbackUrl }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.status || !j?.data?.authorization_url)
    throw new Error(`Paystack initialize het misluk (${res.status}): ${j?.message ?? "geen boodskap"}`);
  return j.data.authorization_url as string;
}

export async function verifieerTransaksie(verwysing: string): Promise<{ status: string; amount: number; currency: string }> {
  const res = await fetch(`${BASIS}/transaction/verify/${encodeURIComponent(verwysing)}`, {
    headers: { authorization: `Bearer ${geheim()}` },
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.data) throw new Error(`Paystack verify het misluk (${res.status})`);
  return { status: j.data.status, amount: j.data.amount, currency: j.data.currency };
}
