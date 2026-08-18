"use client";

import { useMemo, useState } from "react";
import { STYLE, VORM_UITLEG, stylLys } from "@/lib/kaart/register";
import { VORM_NAAM, normaliseerKaart, verstekSpec, type Kaart, type Styl, type Vorm } from "@/lib/kaart/spec";
import { gleufVir } from "@/lib/kaart/mate";
import { useVoorskou } from "@/components/kaart/voorskou";
import { VeldInvoer } from "@/components/kaart/veld-invoer";
import { BufferPaneel } from "@/components/buffer-paneel";
import {
  dupliseerKaart,
  lysKaarte,
  skrapKaart,
  stoorKaart,
  type KaartRy,
} from "@/app/actions-kaarte";

/* Slegs spec.ts en register.ts word hier ingevoer — nooit lib/kaart/render nie.
   Daardie module trek satori, resvg en yoga.wasm in, en die bou sou stilweg
   slaag met 'n opgeblaasde blaaierbundel. 'n eslint-reël hou dit so. */

const VELLE: { waarde: Kaart["vel"]; naam: string }[] = [
  { waarde: "paper", naam: "Papier" },
  { waarde: "offwhite", naam: "Wit" },
  { waarde: "ink", naam: "Ink" },
  { waarde: "rooi", naam: "Rooi" },
];

export function KaartStudio({
  datum,
  aanvanklikeKaarte = [],
}: {
  datum: string;
  aanvanklikeKaarte?: KaartRy[];
}) {
  const [kaart, setKaart] = useState<Kaart>(() =>
    normaliseerKaart({ vorm: "vierkant", vel: "paper", merk: true, spec: verstekSpec("kop-beeld") })
  );
  const [titel, setTitel] = useState("");
  const [huidigeId, setHuidigeId] = useState<string | undefined>();
  const [kaarte, setKaarte] = useState<KaartRy[]>(aanvanklikeKaarte);
  const [skeduleerUrl, setSkeduleerUrl] = useState<string | null>(null);
  const [besigStoor, setBesigStoor] = useState(false);
  const [gestoor, setGestoor] = useState<string | null>(null);
  const [stoorFout, setStoorFout] = useState<string | null>(null);

  async function herlaai() {
    setKaarte(await lysKaarte());
  }

  function openKaart(ry: KaartRy) {
    setKaart(normaliseerKaart(ry.spek));
    setTitel(ry.titel ?? "");
    setHuidigeId(ry.id);
    setGestoor(ry.png_url);
    setStoorFout(null);
  }

  function nuweKaart() {
    setKaart(
      normaliseerKaart({ vorm: "vierkant", vel: "paper", merk: true, spec: verstekSpec("kop-beeld") })
    );
    setTitel("");
    setHuidigeId(undefined);
    setGestoor(null);
  }

  const styl = kaart.spec.styl;
  const definisie = STYLE[styl];
  const voorskou = useVoorskou(kaart, datum);

  /* Die "beeld-agter"/"beeld-langs"-keuse is nie in elke vorm sinvol nie —
     langsaan het wydte nodig. Ons filter die opsies eerder as om iets lelik te
     render. */
  const velde = useMemo(() => {
    const toegelaat = VORM_UITLEG[kaart.vorm];
    return definisie.velde.map((v) =>
      v.soort === "keuse" && v.sleutel === "uitleg"
        ? { ...v, opsies: v.opsies.filter((o) => toegelaat.includes(o.waarde)) }
        : v
    );
  }, [definisie, kaart.vorm]);

  function stelSpecVeld(sleutel: string, waarde: unknown) {
    setKaart((k) => normaliseerKaart({ ...k, spec: { ...k.spec, [sleutel]: waarde } }));
  }

  function kiesStyl(nuut: Styl) {
    const vorms = STYLE[nuut].vorms;
    setKaart((k) =>
      normaliseerKaart({
        ...k,
        vorm: vorms.includes(k.vorm) ? k.vorm : vorms[0],
        // 'n Meme is vollebleed — die Buitelyn-raam hoort nie daarom nie.
        merk: nuut === "meme" ? false : k.merk,
        spec: verstekSpec(nuut),
      })
    );
  }

  /* Twee stappe, met opset: die ROETE bak die PNG (dit is waar next/og woon en
     dis presies die eindpunt wat die voorskou reeds uitoefen), en die
     SERVER ACTION skryf net die ry. Kleiner ontploffingsradius as om die
     render binne 'n aksie te doen. */
  async function stoor() {
    setBesigStoor(true);
    setStoorFout(null);
    try {
      const res = await fetch("/api/sosiaal/kaart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kaart, datum, stoor: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStoorFout(data.fout ?? "Kon nie die kaart render nie.");
        return;
      }
      setGestoor(data.url);

      const uitslag = await stoorKaart({
        id: huidigeId,
        datum,
        titel,
        kaart,
        pngUrl: data.url,
      });
      if (!uitslag.ok) {
        setStoorFout(uitslag.fout ?? "Kon nie stoor nie.");
        return;
      }
      if (uitslag.id) setHuidigeId(uitslag.id);
      await herlaai();
    } catch {
      setStoorFout("Netwerkfout.");
    } finally {
      setBesigStoor(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      {/* ── Kontroles ─────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap gap-2">
          {stylLys().map((s) => (
            <button
              key={s.styl}
              onClick={() => kiesStyl(s.styl)}
              title={s.beskrywing}
              className={`border-2 border-ink px-3 py-1.5 text-xs font-semibold ${
                styl === s.styl ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
              }`}
            >
              {s.naam}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink/50">{definisie.beskrywing}</p>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="text-xs font-semibold">
            Vorm
            <div className="mt-1 flex w-fit border-2 border-ink">
              {definisie.vorms.map((v: Vorm) => (
                <button
                  key={v}
                  onClick={() => setKaart((k) => ({ ...k, vorm: v }))}
                  className={`px-3 py-1.5 text-xs font-semibold ${
                    kaart.vorm === v ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
                  }`}
                >
                  {VORM_NAAM[v]}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs font-semibold">
            Vel
            <div className="mt-1 flex w-fit border-2 border-ink">
              {VELLE.map((v) => (
                <button
                  key={v.waarde}
                  onClick={() => setKaart((k) => ({ ...k, vel: v.waarde }))}
                  className={`px-3 py-1.5 text-xs font-semibold ${
                    kaart.vel === v.waarde ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
                  }`}
                >
                  {v.naam}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {velde.map((veld) => (
            <VeldInvoer
              key={veld.sleutel}
              veld={veld}
              datum={datum}
              gleuf={gleufVir(kaart)}
              waarde={(kaart.spec as unknown as Record<string, unknown>)[veld.sleutel]}
              stel={(w) => stelSpecVeld(veld.sleutel, w)}
            />
          ))}
        </div>
      </div>

      {/* ── Voorskou ──────────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="relative border-2 border-ink bg-paper p-3">
          {voorskou.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={voorskou.url}
              alt="Voorskou"
              className={`w-full transition-opacity ${voorskou.besig ? "opacity-60" : ""}`}
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-offwhite text-sm text-ink/40">
              {voorskou.fout ?? "Render…"}
            </div>
          )}
          {voorskou.besig && voorskou.url ? (
            <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-red" />
          ) : null}
        </div>

        {voorskou.fout ? (
          <p className="mt-2 text-sm font-semibold text-red">{voorskou.fout}</p>
        ) : null}

        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Naam vir hierdie kaart (opsioneel)"
          className="mt-3 h-11 w-full border-2 border-ink bg-paper px-3 text-sm outline-none focus:border-red"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={stoor}
            disabled={besigStoor}
            className="h-11 bg-ink px-5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
          >
            {besigStoor ? "Stoor…" : huidigeId ? "Stoor veranderinge" : "Stoor kaart"}
          </button>
          {huidigeId ? (
            <button
              onClick={nuweKaart}
              className="h-11 border-2 border-ink bg-offwhite px-4 text-sm font-semibold hover:bg-paper"
            >
              Nuwe kaart
            </button>
          ) : null}
          {gestoor ? (
            <a
              href={gestoor}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 border-2 border-ink bg-offwhite px-4 text-sm font-semibold leading-[2.6] hover:bg-paper"
            >
              Maak oop ↗
            </a>
          ) : null}
          {stoorFout ? <span className="text-sm font-semibold text-red">{stoorFout}</span> : null}
        </div>

        {gestoor ? (
          <p className="mt-2 text-xs text-ink/50">
            Gestoor in die publieke bucket — dié skakel kan direk na Buffer toe.
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink/50">
            {"Die voorskou is 'n halfskaal-render van presies wat gestoor sal word."}
          </p>
        )}
      </div>

      {/* ── Gestoorde kaarte ──────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <h2 className="mt-10 flex items-center gap-2 border-t-2 border-ink pt-6 text-lg font-extrabold tracking-tight">
          Gestoorde kaarte
          <span aria-hidden className="size-2 rounded-full bg-red" />
        </h2>

        {kaarte.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">Nog niks gestoor nie.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {kaarte.map((ry) => (
              <div key={ry.id} className="flex flex-col border-2 border-ink bg-offwhite">
                {ry.png_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ry.png_url} alt={ry.titel ?? ry.styl} className="w-full" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-paper text-xs text-ink/40">
                    Nog nie gebak nie
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1 p-2">
                  <p className="truncate text-xs font-semibold">{ry.titel || ry.styl}</p>
                  <p className="text-[11px] text-ink/50">
                    {ry.datum} · {ry.vorm}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1 pt-1">
                    <button
                      onClick={() => openKaart(ry)}
                      className="border-2 border-ink bg-offwhite px-2 py-0.5 text-[11px] font-semibold hover:bg-paper"
                    >
                      Open
                    </button>
                    <button
                      onClick={async () => {
                        await dupliseerKaart(ry.id);
                        await herlaai();
                      }}
                      className="border-2 border-ink bg-offwhite px-2 py-0.5 text-[11px] font-semibold hover:bg-paper"
                    >
                      Dupliseer
                    </button>
                    {ry.png_url ? (
                      <button
                        onClick={() => setSkeduleerUrl(ry.png_url)}
                        className="border-2 border-ink bg-ink px-2 py-0.5 text-[11px] font-semibold text-offwhite hover:bg-ink/85"
                      >
                        Skeduleer
                      </button>
                    ) : null}
                    <button
                      onClick={async () => {
                        await skrapKaart(ry.id);
                        if (huidigeId === ry.id) nuweKaart();
                        await herlaai();
                      }}
                      className="border-2 border-ink bg-offwhite px-2 py-0.5 text-[11px] font-semibold hover:bg-paper"
                    >
                      Skrap
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Buffer kry 'n reeds gebakte publieke URL — geen tweede render nodig. */}
        {skeduleerUrl ? (
          <div>
            <BufferPaneel datum={datum} vasteBeeldUrl={skeduleerUrl} />
            <button
              onClick={() => setSkeduleerUrl(null)}
              className="mt-3 border-2 border-ink bg-offwhite px-3 py-1 text-xs font-semibold hover:bg-paper"
            >
              Sluit skedulering
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
