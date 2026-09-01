import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { winkelKlient, GROOTTES, type Produk, type Variant } from "@/lib/winkel";
import { ProdukKaart, NuweProdukForm } from "./produk-kaart";

export const dynamic = "force-dynamic";

function grootteIndeks(g: string | null): number {
  if (g === null) return -1;
  const i = (GROOTTES as readonly string[]).indexOf(g);
  return i === -1 ? GROOTTES.length : i; // onbekende grootte-string agteraan
}

export default async function ProdukteBlad() {
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");

  const wk = winkelKlient();

  const { data: produkte } = await wk
    .from("winkel_produkte")
    .select("id, naam, beskrywing, prys_sent, aktief, slug, fotos")
    .order("naam")
    .returns<Produk[]>();

  const { data: variante } = await wk
    .from("winkel_variante")
    .select("id, produk_id, kleur, grootte, voorraad, aktief")
    .order("kleur")
    .returns<Variant[]>();

  /* Groepeer variante per produk, en sorteer elke groep kleur eerste,
     dan grootte in S→XXL-volgorde (grootte-lose ry eerste per kleur). */
  const variantePerProduk = new Map<string, Variant[]>();
  for (const v of variante ?? []) {
    const lys = variantePerProduk.get(v.produk_id) ?? [];
    lys.push(v);
    variantePerProduk.set(v.produk_id, lys);
  }
  for (const lys of variantePerProduk.values()) {
    lys.sort((a, b) => {
      if (a.kleur !== b.kleur) return a.kleur.localeCompare(b.kleur);
      return grootteIndeks(a.grootte) - grootteIndeks(b.grootte);
    });
  }

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]}>
      <h1 className="text-3xl font-extrabold tracking-tight">Produkte</h1>

      <div className="mt-6">
        <NuweProdukForm />
      </div>

      <div className="mt-8 space-y-6">
        {(produkte ?? []).length === 0 ? (
          <p className="text-sm text-ink/50">Nog geen produkte nie.</p>
        ) : (
          (produkte ?? []).map((p) => (
            <ProdukKaart key={p.id} produk={p} variante={variantePerProduk.get(p.id) ?? []} />
          ))
        )}
      </div>
    </Shell>
  );
}
