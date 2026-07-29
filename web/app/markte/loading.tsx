import { TopBar } from "@/components/top-bar";

/* Oortjie-navigasie op /markte is 'n volle bediener-render — dié geraamte
   verskyn ONMIDDELLIK by elke klik sodat die blad nooit gevries voel nie. */
export default function MarkteLaai() {
  return (
    <>
      <TopBar />
      <main className="flex-1">
        <section className="mx-auto max-w-[1440px] px-6 py-10 md:px-14">
          <div className="border-y-2 border-ink">
            <div className="my-1 flex items-baseline justify-between border-y border-ink py-3">
              <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">Markte</h1>
              <span className="h-3 w-40 animate-pulse rounded-sm bg-ink/10" />
            </div>
          </div>
          <div className="mt-6 h-10 w-full max-w-xl animate-pulse border-2 border-ink bg-offwhite" />
          <div className="mt-6 space-y-4">
            <div className="h-28 animate-pulse border-2 border-ink bg-offwhite" />
            <div className="h-64 animate-pulse border-2 border-ink bg-offwhite" />
            <div className="h-40 animate-pulse border-2 border-ink bg-offwhite" />
          </div>
        </section>
      </main>
    </>
  );
}
