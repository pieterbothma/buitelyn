import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { WinkelRaam } from "@/components/winkel/winkel-raam";
import { Koopkaart } from "./koopkaart";

export const dynamic = "force-dynamic";

export type Variant = { id: string; kleur: string; grootte: string | null; voorraad: number; aktief: boolean };
export type Produk = {
  id: string;
  naam: string;
  beskrywing: string;
  prys_sent: number;
  slug: string;
  fotos: unknown;
  winkel_variante: Variant[];
};

/* React se cache() sodat generateMetadata en die blad self nie twee
   bevragings vir dieselfde slug doen nie — Next dedupliseer fetch() vanself,
   maar nie supabase-js se PostgrestBuilder nie. */
const haalProduk = cache(async (slug: string): Promise<Produk | null> => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb
    .from("winkel_produkte")
    .select("id, naam, beskrywing, prys_sent, slug, fotos, winkel_variante(id, kleur, grootte, voorraad, aktief)")
    .eq("slug", slug)
    .eq("aktief", true)
    .maybeSingle<Produk>();
  return data ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const produk = await haalProduk(slug);
  return { title: produk ? `${produk.naam} — Buitelyn` : "Winkel — Buitelyn" };
}

export default async function ProdukBlad({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const produk = await haalProduk(slug);
  if (!produk) notFound();

  return (
    <WinkelRaam>
      <section className="mx-auto max-w-2xl px-6 py-12">
        <Koopkaart produk={produk} />
      </section>
    </WinkelRaam>
  );
}
