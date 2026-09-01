import { createClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { Koopvorm } from "./koopvorm";

export const metadata = { title: "Winkel — Buitelyn" };
export const dynamic = "force-dynamic";

type Variant = { id: string; kleur: string; voorraad: number; fotos: unknown };
type Produk = { id: string; naam: string; beskrywing: string; prys_sent: number; winkel_variante: Variant[] };

export default async function WinkelBlad() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: produk } = await sb
    .from("winkel_produkte")
    .select("id, naam, beskrywing, prys_sent, winkel_variante(id, kleur, voorraad, fotos)")
    .eq("aktief", true)
    .limit(1)
    .single<Produk>();
  if (!produk)
    return (
      <>
        <TopBar />
        <main className="flex-1">
          <section className="mx-auto max-w-2xl px-6 py-24">
            <p>Die winkel is binnekort oop.</p>
          </section>
        </main>
        <Footer />
      </>
    );
  return (
    <>
      <TopBar />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16">
          <Koopvorm produk={produk} />
        </section>
      </main>
      <Footer />
    </>
  );
}
