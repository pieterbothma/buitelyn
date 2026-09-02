import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { WinkelRaam } from "@/components/winkel/winkel-raam";
import { rand } from "@/lib/winkel/epos";

export const metadata = { title: "Winkel — Buitelyn" };
export const dynamic = "force-dynamic";

type Variant = { id: string; kleur: string; grootte: string | null; voorraad: number; aktief: boolean };
type Produk = {
  id: string;
  naam: string;
  prys_sent: number;
  slug: string;
  fotos: unknown;
  winkel_variante: Variant[];
};

export default async function WinkelBlad() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb
    .from("winkel_produkte")
    .select("id, naam, prys_sent, slug, fotos, winkel_variante(id, kleur, grootte, voorraad, aktief)")
    .eq("aktief", true);

  /* 'n Produk sonder EEN aktiewe variant het niks om te koop nie en bly weg
     van die rooster — 'n uitverkoopte produk (aktief=true) bly egter
     sigbaar met 'n "Uitverkoop"-kenteken sodat die vitrine nie kunsmatig
     krimp elke keer voorraad op 0 loop nie. */
  const produkte = ((data ?? []) as Produk[]).filter((p) => p.winkel_variante.some((v) => v.aktief));

  return (
    <WinkelRaam>
      <section className="mx-auto max-w-[1440px] px-6 py-12 md:px-14">
        <div className="border-y-2 border-ink">
          <div className="my-1 border-y border-ink py-3">
            <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">Winkel</h1>
          </div>
        </div>

        {produkte.length === 0 ? (
          <p className="mt-8 text-sm text-ink/70">Die winkel is binnekort oop.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {produkte.map((p) => {
              const aktieweVariante = p.winkel_variante.filter((v) => v.aktief);
              const uitverkoop = aktieweVariante.every((v) => v.voorraad === 0);
              const fotos = Array.isArray(p.fotos) ? (p.fotos as string[]) : [];
              return (
                <Link key={p.id} href={`/winkel/${p.slug}`} className="group block border-2 border-ink">
                  <div className="relative">
                    {fotos[0] ? (
                      <Image
                        src={fotos[0]}
                        alt={p.naam}
                        width={800}
                        height={800}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-square w-full bg-offwhite" />
                    )}
                    {uitverkoop ? (
                      <span className="absolute left-2 top-2 border border-ink bg-paper px-2 py-1 text-xs font-bold tracking-[0.08em]">
                        UITVERKOOP
                      </span>
                    ) : null}
                  </div>
                  <div className="border-t-2 border-ink p-4">
                    <p className="font-semibold group-hover:underline">{p.naam}</p>
                    <p className="mt-1 text-sm tabular-nums text-ink/70">{rand(p.prys_sent)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </WinkelRaam>
  );
}
