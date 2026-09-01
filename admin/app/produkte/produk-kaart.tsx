"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  skepProduk,
  wysigProduk,
  stelProdukAktief,
  stelVoorraad,
  stelVariantAktief,
  voegKleurBy,
  voegGrootteBy,
  laaiFotoOp,
  verwyderFoto,
  skuifFoto,
} from "@/app/actions-produkte";
import { rand, GROOTTES, type Produk, type Variant } from "@/lib/winkel";

function boodskap(e: unknown, verstek: string): string {
  return e instanceof Error ? e.message : verstek;
}

function FoutReël({ fout }: { fout: string | null }) {
  if (!fout) return null;
  return <p className="mt-1.5 text-xs font-semibold text-red">{fout}</p>;
}

/* Nuwe-produk-vorm bo-aan die blad. Die produk verskyn versteek (aktief:false)
   in die lys hieronder sodra die vorm slaag — die admin skakel dit aan
   sodra fotos/variante gereed is. */
export function NuweProdukForm() {
  const router = useRouter();
  const [besig, begin] = useTransition();
  const [fout, setFout] = useState<string | null>(null);

  function stuur(formData: FormData) {
    setFout(null);
    begin(async () => {
      try {
        await skepProduk(formData);
        router.refresh();
      } catch (e) {
        setFout(boodskap(e, "Kon nie produk skep nie."));
      }
    });
  }

  return (
    <div className="border-2 border-ink bg-offwhite p-5">
      <h2 className="text-sm font-semibold tracking-[0.1em] text-ink/60">NUWE PRODUK</h2>
      <form action={stuur} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          name="naam"
          placeholder="Naam"
          required
          className="border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
        />
        <input
          name="prysRand"
          placeholder="Prys — bv. 249 of 249,50"
          required
          className="border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
        />
        <textarea
          name="beskrywing"
          placeholder="Beskrywing"
          rows={2}
          className="border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red sm:col-span-2"
        />
        <button
          type="submit"
          disabled={besig}
          className="self-start bg-ink px-6 py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50 sm:col-span-2 sm:w-fit"
        >
          {besig ? "Skep…" : "Skep produk"}
        </button>
      </form>
      <FoutReël fout={fout} />
    </div>
  );
}

function VariantRy({ v, besig, begin, setFout }: {
  v: Variant;
  besig: boolean;
  begin: (f: () => Promise<void>) => void;
  setFout: (id: string, fout: string | null) => void;
}) {
  const router = useRouter();
  const [eieFout, setEieFout] = useState<string | null>(null);

  function stoorVoorraad(waarde: string) {
    const n = Number(waarde);
    if (!Number.isInteger(n) || n < 0) {
      setEieFout("Voorraad moet 'n heelgetal ≥ 0 wees.");
      return;
    }
    if (n === v.voorraad) return;
    setEieFout(null);
    begin(async () => {
      try {
        await stelVoorraad(v.id, n);
        router.refresh();
      } catch (e) {
        setEieFout(boodskap(e, "Kon nie voorraad opdateer nie."));
      }
    });
  }

  function wisselAktief() {
    setFout(v.id, null);
    begin(async () => {
      try {
        await stelVariantAktief(v.id, !v.aktief);
        router.refresh();
      } catch (e) {
        setFout(v.id, boodskap(e, "Kon nie status wysig nie."));
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        key={`${v.id}-${v.voorraad}`}
        defaultValue={v.voorraad}
        disabled={besig}
        onBlur={(e) => stoorVoorraad(e.target.value)}
        className="w-20 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red disabled:opacity-50"
      />
      <button
        type="button"
        onClick={wisselAktief}
        disabled={besig}
        title={v.aktief ? "Verberg hierdie variant" : "Wys hierdie variant"}
        className={`text-[11px] font-semibold underline-offset-2 hover:underline disabled:opacity-50 ${
          v.aktief ? "text-ink/40" : "text-red/80"
        }`}
      >
        {v.aktief ? "verberg" : "wys"}
      </button>
      <FoutReël fout={eieFout} />
    </div>
  );
}

export function ProdukKaart({ produk, variante }: { produk: Produk; variante: Variant[] }) {
  const router = useRouter();
  const [besig, begin] = useTransition();

  const [wysigOop, setWysigOop] = useState(false);
  const [foutWysig, setFoutWysig] = useState<string | null>(null);
  const [foutAktief, setFoutAktief] = useState<string | null>(null);
  const [foutFoto, setFoutFoto] = useState<string | null>(null);
  const [foutKleur, setFoutKleur] = useState<string | null>(null);
  const [foutGrootte, setFoutGrootte] = useState<string | null>(null);
  const [nuweKleur, setNuweKleur] = useState("");
  const [nuweGrootte, setNuweGrootte] = useState("");
  const [foutPerVariant, setFoutPerVariant] = useState<Record<string, string | null>>({});

  const setVariantFout = (id: string, fout: string | null) =>
    setFoutPerVariant((f) => ({ ...f, [id]: fout }));

  const kleure = Array.from(new Set(variante.map((v) => v.kleur)));
  const hetGroottes = variante.some((v) => v.grootte !== null);
  const groottesInGebruik = Array.from(
    new Set(variante.map((v) => v.grootte).filter((g): g is string => g !== null))
  ).sort((a, b) => GROOTTES.indexOf(a as (typeof GROOTTES)[number]) - GROOTTES.indexOf(b as (typeof GROOTTES)[number]));
  const oorGroottes = (GROOTTES as readonly string[]).filter((g) => !groottesInGebruik.includes(g));

  function wisselAktief() {
    setFoutAktief(null);
    begin(async () => {
      try {
        await stelProdukAktief(produk.id, !produk.aktief);
        router.refresh();
      } catch (e) {
        setFoutAktief(boodskap(e, "Kon nie status wysig nie."));
      }
    });
  }

  function stuurWysig(formData: FormData) {
    setFoutWysig(null);
    begin(async () => {
      try {
        await wysigProduk(produk.id, formData);
        setWysigOop(false);
        router.refresh();
      } catch (e) {
        setFoutWysig(boodskap(e, "Kon nie produk wysig nie."));
      }
    });
  }

  function stuurFoto(formEl: HTMLFormElement) {
    const fd = new FormData(formEl);
    const lêer = fd.get("foto");
    if (!(lêer instanceof File) || lêer.size === 0) {
      setFoutFoto("Geen foto gekies nie.");
      return;
    }
    setFoutFoto(null);
    begin(async () => {
      try {
        await laaiFotoOp(produk.id, fd);
        formEl.reset();
        router.refresh();
      } catch (e) {
        setFoutFoto(boodskap(e, "Kon nie foto oplaai nie."));
      }
    });
  }

  function verwyder(url: string) {
    setFoutFoto(null);
    begin(async () => {
      try {
        await verwyderFoto(produk.id, url);
        router.refresh();
      } catch (e) {
        setFoutFoto(boodskap(e, "Kon nie foto verwyder nie."));
      }
    });
  }

  function skuif(url: string, rigting: "op" | "af") {
    setFoutFoto(null);
    begin(async () => {
      try {
        await skuifFoto(produk.id, url, rigting);
        router.refresh();
      } catch (e) {
        setFoutFoto(boodskap(e, "Kon nie foto's herrangskik nie."));
      }
    });
  }

  function stuurKleur() {
    if (!nuweKleur.trim()) return;
    setFoutKleur(null);
    begin(async () => {
      try {
        await voegKleurBy(produk.id, nuweKleur.trim());
        setNuweKleur("");
        router.refresh();
      } catch (e) {
        setFoutKleur(boodskap(e, "Kon nie kleur byvoeg nie."));
      }
    });
  }

  function stuurGrootte() {
    if (!nuweGrootte) return;
    setFoutGrootte(null);
    begin(async () => {
      try {
        await voegGrootteBy(produk.id, nuweGrootte);
        setNuweGrootte("");
        router.refresh();
      } catch (e) {
        setFoutGrootte(boodskap(e, "Kon nie grootte byvoeg nie."));
      }
    });
  }

  return (
    <div className="border-2 border-ink bg-offwhite p-5">
      {/* Kop */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-extrabold tracking-tight">{produk.naam}</h2>
            {!produk.aktief ? (
              <span className="px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-red">
                VERSTEEK
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-ink/60">
            {rand(produk.prys_sent)} · /{produk.slug}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setWysigOop((o) => !o)}
            className="text-sm font-semibold underline-offset-2 hover:underline"
          >
            {wysigOop ? "Maak toe" : "Wysig"}
          </button>
          <button
            type="button"
            onClick={wisselAktief}
            disabled={besig}
            className="border-2 border-ink px-3 py-1.5 text-xs font-semibold hover:bg-ink/5 disabled:opacity-50"
          >
            {produk.aktief ? "Versteek" : "Wys"}
          </button>
        </div>
      </div>
      <FoutReël fout={foutAktief} />

      {wysigOop ? (
        <form action={stuurWysig} className="mt-4 grid gap-3 border-t border-ink/15 pt-4 sm:grid-cols-2">
          <input
            name="naam"
            defaultValue={produk.naam}
            required
            className="border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
          />
          <input
            name="prysRand"
            defaultValue={(produk.prys_sent / 100).toFixed(2).replace(".", ",")}
            required
            className="border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
          />
          <input
            name="slug"
            defaultValue={produk.slug}
            required
            className="border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red sm:col-span-2"
          />
          <textarea
            name="beskrywing"
            defaultValue={produk.beskrywing}
            rows={2}
            className="border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red sm:col-span-2"
          />
          <button
            type="submit"
            disabled={besig}
            className="self-start bg-ink px-6 py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50 sm:col-span-2 sm:w-fit"
          >
            {besig ? "Stoor…" : "Stoor wysigings"}
          </button>
          <div className="sm:col-span-2">
            <FoutReël fout={foutWysig} />
          </div>
        </form>
      ) : null}

      {/* Foto's */}
      <div className="mt-4 border-t border-ink/15 pt-4">
        <p className="text-sm font-semibold text-ink/60">Foto&apos;s</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {produk.fotos.map((url, i) => (
            <div key={url} className="w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-24 border-2 border-ink object-cover" />
              <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                <button
                  type="button"
                  disabled={besig || i === 0}
                  onClick={() => skuif(url, "op")}
                  className="disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={besig || i === produk.fotos.length - 1}
                  onClick={() => skuif(url, "af")}
                  className="disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={besig}
                  onClick={() => verwyder(url)}
                  className="text-red/80 hover:text-red disabled:opacity-30"
                >
                  verwyder
                </button>
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            stuurFoto(e.currentTarget);
          }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            type="file"
            name="foto"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
          />
          <button
            type="submit"
            disabled={besig}
            className="border-2 border-ink px-3 py-1.5 text-xs font-semibold hover:bg-ink/5 disabled:opacity-50"
          >
            Laai op
          </button>
        </form>
        <FoutReël fout={foutFoto} />
      </div>

      {/* Variante */}
      <div className="mt-4 border-t border-ink/15 pt-4">
        <p className="text-sm font-semibold text-ink/60">Variante &amp; voorraad</p>

        {kleure.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">Nog geen kleure nie.</p>
        ) : hetGroottes ? (
          <div className="mt-3 overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="pb-2 pr-4 text-left font-semibold text-ink/60">Kleur</th>
                  {groottesInGebruik.map((g) => (
                    <th key={g} className="pb-2 pr-4 text-left font-semibold text-ink/60">
                      {g}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kleure.map((kleur) => (
                  <tr key={kleur}>
                    <td className="py-1.5 pr-4 font-semibold">{kleur}</td>
                    {groottesInGebruik.map((g) => {
                      const v = variante.find((x) => x.kleur === kleur && x.grootte === g);
                      return (
                        <td key={g} className="py-1.5 pr-4">
                          {v ? (
                            <VariantRy v={v} besig={besig} begin={begin} setFout={setVariantFout} />
                          ) : (
                            <span className="text-ink/30">—</span>
                          )}
                          <FoutReël fout={v ? foutPerVariant[v.id] : null} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {variante.map((v) => (
              <div key={v.id} className="flex items-center gap-3">
                <span className="w-28 text-sm font-semibold">{v.kleur}</span>
                <VariantRy v={v} besig={besig} begin={begin} setFout={setVariantFout} />
                <FoutReël fout={foutPerVariant[v.id]} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={nuweKleur}
            onChange={(e) => setNuweKleur(e.target.value)}
            placeholder="Nuwe kleur"
            className="w-40 border-2 border-ink bg-paper px-3 py-1.5 text-sm outline-none focus:border-red"
          />
          <button
            type="button"
            onClick={stuurKleur}
            disabled={besig || !nuweKleur.trim()}
            className="border-2 border-ink px-3 py-1.5 text-xs font-semibold hover:bg-ink/5 disabled:opacity-50"
          >
            Voeg kleur by
          </button>
          <FoutReël fout={foutKleur} />
        </div>

        {hetGroottes ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {oorGroottes.length === 0 ? (
              <p className="text-xs text-ink/40">Alle groottes reeds bygevoeg.</p>
            ) : (
              <>
                <select
                  value={nuweGrootte}
                  onChange={(e) => setNuweGrootte(e.target.value)}
                  className="border-2 border-ink bg-paper px-3 py-1.5 text-sm outline-none focus:border-red"
                >
                  <option value="">Kies grootte…</option>
                  {oorGroottes.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={stuurGrootte}
                  disabled={besig || !nuweGrootte}
                  className="border-2 border-ink px-3 py-1.5 text-xs font-semibold hover:bg-ink/5 disabled:opacity-50"
                >
                  Voeg grootte by
                </button>
              </>
            )}
            <FoutReël fout={foutGrootte} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
