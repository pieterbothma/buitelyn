import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Service role, want winkel_bestellings het geen RLS-policies nie — en
   "authenticated" op hierdie gedeelde projek sluit elke /markte-gebruiker in.
   Die blad self sit agter AP HQ se aanmelding (middleware). */
export function winkelKlient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export const rand = (sent: number) => `R${Math.floor(sent / 100)},${String(sent % 100).padStart(2, "0")}`;

export type BestelLyn = {
  variant_id: string;
  naam: string;
  kleur: string;
  grootte: string | null;
  prys_sent: number;
  aantal: number;
};

export type Bestelling = {
  id: string;
  verwysing: string;
  status: "begin" | "betaal" | "gestuur";
  modus: "toets" | "regte";
  items: BestelLyn[];
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

export const GROOTTES = ["S", "M", "L", "XL", "XXL"] as const;

export type Produk = {
  id: string;
  naam: string;
  beskrywing: string;
  prys_sent: number;
  aktief: boolean;
  slug: string;
  fotos: string[];
};

export type Variant = {
  id: string;
  produk_id: string;
  kleur: string;
  grootte: string | null;
  voorraad: number;
  aktief: boolean;
};
