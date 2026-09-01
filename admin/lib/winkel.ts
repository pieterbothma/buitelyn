import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Service role, want winkel_bestellings het geen RLS-policies nie — en
   "authenticated" op hierdie gedeelde projek sluit elke /markte-gebruiker in.
   Die blad self sit agter AP HQ se aanmelding (middleware). */
export function winkelKlient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export const rand = (sent: number) => `R${Math.floor(sent / 100)},${String(sent % 100).padStart(2, "0")}`;

export type Bestelling = {
  id: string;
  verwysing: string;
  status: "begin" | "betaal" | "gestuur";
  modus: "toets" | "regte";
  item: { naam: string; kleur: string; prys_sent: number; aantal: number };
  koper: { naam: string; van: string; epos: string; selfoon: string };
  adres: {
    straat: string;
    woonbuurt: string;
    stad: string;
    provinsie: string;
    poskode: string;
    nota: string;
  };
  totaal_sent: number;
  geskep_op: string;
};

export type Variant = { id: string; kleur: string; voorraad: number };
