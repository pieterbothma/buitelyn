import { verifieerTransaksie } from "@/lib/winkel/paystack";
import { BELEID } from "@/lib/wetlik";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bestelling — Buitelyn" };

export default async function BevestigBlad({ searchParams }: { searchParams: Promise<{ verwysing?: string; reference?: string }> }) {
  const p = await searchParams;
  const verwysing = p.verwysing ?? p.reference ?? "";
  let geslaag = false;
  if (verwysing) {
    try { geslaag = (await verifieerTransaksie(verwysing)).status === "success"; } catch { geslaag = false; }
  }
  return (
    <>
      <TopBar />
      <main className="flex-1">
        <section className="mx-auto max-w-xl px-6 py-24 text-center">
          {geslaag ? (<>
            <h1 className="text-2xl font-semibold">Dankie — jou bestelling is bevestig.</h1>
            <p className="mt-4 text-sm opacity-70">Bestelnommer {verwysing}. &apos;n Bevestiging is per e-pos gestuur;
            aflewering neem {BELEID.afleweringsDae}.</p>
          </>) : (<>
            <h1 className="text-2xl font-semibold">Ons kon nie die betaling bevestig nie.</h1>
            <p className="mt-4 text-sm opacity-70">As geld afgegaan het, kontak hallo@buitelyn.com met verwysing {verwysing || "—"}.</p>
          </>)}
          <Link className="mt-8 inline-block underline" href="/winkel">Terug winkel toe</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
