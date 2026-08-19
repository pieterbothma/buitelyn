"use client";

import { useState, useTransition } from "react";
import {
  keurVooraf,
  kryBufferKanale,
  skeduleer,
  skrapBufferPlasing,
} from "@/app/actions-buffer";
import type { Kanaal, Uitslag } from "@/lib/buffer";

/* Skeduleer 'n kaart na Buffer. Die kaart moet EERS gebak word na die publieke
   konsep-fotos-bucket (?stoor=1) — Buffer het geen oplaai nie en haal die
   beeld self van die bediener af, so 'n relatiewe /api-URL werk nie. */

type Kaartkeuse = { i: number; kop: string };

/* 'n Bylae is óf die gebakte kaart óf 'n opgelaaide foto. Die kaart bly 'n
   merker sodat 'n mens die kaart kan kies, verwissel of skuif sonder om hom
   elke keer opnuut te bak. */
type Bylae = { soort: "kaart" } | { soort: "foto"; url: string };

export function BufferPaneel({
  datum,
  stukke = [],
  vorm = "vierkant",
  weergawe = 0,
  aanvanklikeTeks = "",
  vasteBeeldUrl = null,
}: {
  datum: string;
  stukke?: Kaartkeuse[];
  vorm?: string;
  weergawe?: number;
  aanvanklikeTeks?: string;
  /** 'n Reeds gebakte kaart-URL. Wanneer dit gestel is, val die
   *  poskaart-kieser weg — die beeld is klaar publiek. */
  vasteBeeldUrl?: string | null;
}) {
  const [kanale, setKanale] = useState<Kanaal[]>([]);
  const [opsomming, setOpsomming] = useState<string | null>(null);
  const [gekies, setGekies] = useState<Set<string>>(new Set());
  const [teks, setTeks] = useState(aanvanklikeTeks);
  const [eersteKommentaar, setEersteKommentaar] = useState("");
  const [kaartIndeks, setKaartIndeks] = useState<number | "geen">(stukke.length ? 0 : "geen");
  /* Die kaart EN die ekstra foto's in een geordende lys, want die volgorde
     waarin hulle hier staan is die volgorde waarin hulle in die plasing
     verskyn — en 'n mens wil nie altyd hê die kaart moet eerste wees nie.
     Die kaart is 'n merker, nie 'n URL nie: dit word eers by stuur-tyd gebak. */
  const [bylaes, setBylaes] = useState<Bylae[]>(
    vasteBeeldUrl || stukke.length ? [{ soort: "kaart" }] : []
  );
  const [laaiOp, setLaaiOp] = useState(false);
  const [wanneer, setWanneer] = useState("");
  const [konsep, setKonsep] = useState(true); // veilige verstek: publiseer nooit vanself
  const [besig, setBesig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [waarskuwings, setWaarskuwings] = useState<{ kanaal: string; fout: string }[]>([]);
  const [uitslae, setUitslae] = useState<Uitslag[]>([]);
  const [laai, begin] = useTransition();

  function laaiKanale() {
    setFout(null);
    begin(async () => {
      const res = await kryBufferKanale();
      if (!res.ok) {
        setFout(res.fout ?? "Kon nie kanale laai nie.");
        return;
      }
      setKanale(res.kanale);
      setOpsomming(res.opsomming ?? null);
    });
  }

  function wissel(id: string) {
    setGekies((vorige) => {
      const nuut = new Set(vorige);
      if (nuut.has(id)) nuut.delete(id);
      else nuut.add(id);
      return nuut;
    });
    setWaarskuwings([]);
  }

  /** Bak die gekose kaart na die publieke bucket en gee die URL terug. */
  async function bakKaart(): Promise<string | null> {
    // Reeds gebak (gestoorde kaart) — Buffer kan die URL sommer kry.
    if (vasteBeeldUrl) return vasteBeeldUrl;
    if (kaartIndeks === "geen") return null;
    setBesig("Berei die kaart voor…");
    const res = await fetch(
      `/api/sosiaal/kaart?datum=${datum}&i=${kaartIndeks}&vorm=${vorm}&v=${weergawe}&stoor=1`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.fout ?? "Kon nie die kaart stoor nie.");
    return data.url as string;
  }

  async function stuur() {
    setFout(null);
    setUitslae([]);
    setWaarskuwings([]);
    const geselekteer = kanale.filter((k) => gekies.has(k.id));
    if (!geselekteer.length) {
      setFout("Kies ten minste een kanaal.");
      return;
    }
    try {
      /* Die lys word URL's in presies die volgorde wat op die skerm staan.
         Die eerste een gaan as beeldUrl deur en die res as ekstraBeelde —
         lib/buffer voeg hulle weer in dieselfde volgorde saam. */
      const urls: string[] = [];
      for (const b of bylaes) {
        if (b.soort === "kaart") {
          const u = await bakKaart();
          if (u) urls.push(u);
        } else urls.push(b.url);
      }
      const [beeldUrl, ...ekstraBeelde] = urls;

      const invoer = {
        kanale: geselekteer,
        teks,
        beeldUrl: beeldUrl ?? null,
        ekstraBeelde,
        altTeks: vasteBeeldUrl
          ? teks.slice(0, 120)
          : kaartIndeks === "geen"
            ? undefined
            : stukke[kaartIndeks as number]?.kop,
        wanneer: wanneer || null,
        konsep,
        eersteKommentaar: eersteKommentaar.trim() || undefined,
      };

      // Keur eers — 'n plasing is NIE idempotent nie, so ons wil weet wat gaan
      // misluk voordat ons enigiets skep.
      setBesig("Keur…");
      const probleme = await keurVooraf(invoer);
      if (probleme.length) {
        setWaarskuwings(probleme);
        setBesig(null);
        return;
      }

      setBesig(konsep ? "Stoor konsepte in Buffer…" : "Skeduleer…");
      setUitslae(await skeduleer(invoer));
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Onbekende fout.");
    } finally {
      setBesig(null);
    }
  }

  async function ongedaan(plasingId: string) {
    const res = await skrapBufferPlasing(plasingId);
    if (res.ok) setUitslae((u) => u.filter((x) => !(x.ok && x.plasingId === plasingId)));
    else setFout(res.fout ?? "Kon nie skrap nie.");
  }

  return (
    <div>
      <h2 className="mt-10 flex items-center gap-2 border-t-2 border-ink pt-6 text-lg font-extrabold tracking-tight">
        Skeduleer na Buffer
        <span aria-hidden className="size-2 rounded-full bg-red" />
      </h2>
      <p className="mt-1 max-w-lg text-sm text-ink/60">
        {
          "Die kaart word na die publieke bucket gebak en die skakel gaan na Buffer — Buffer kan nie beelde oplaai nie, net skakels haal."
        }
      </p>

      {!kanale.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={laaiKanale}
            disabled={laai}
            className="h-11 border-2 border-ink bg-offwhite px-4 text-sm font-semibold hover:bg-paper disabled:opacity-50"
          >
            {laai ? "Laai…" : "Laai Buffer-kanale"}
          </button>
          {fout ? <span className="text-sm font-semibold text-red">{fout}</span> : null}
        </div>
      ) : (
        <>
          {opsomming ? <p className="mt-2 text-xs text-ink/50">{opsomming}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {kanale.map((k) => {
              const buite = k.gesluit || k.ontkoppel;
              return (
                <button
                  key={k.id}
                  onClick={() => wissel(k.id)}
                  disabled={buite}
                  title={
                    k.gesluit
                      ? "Gesluit — die Buffer-plan se kanaallimiet is vol"
                      : k.ontkoppel
                        ? "Ontkoppel in Buffer"
                        : k.diens
                  }
                  className={`border-2 border-ink px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                    gekies.has(k.id) ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
                  }`}
                >
                  {k.naam} · {k.diens}
                  {buite ? " 🔒" : ""}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {vasteBeeldUrl ? null : (
            <label className="text-xs font-semibold">
              Kaart
              <select
                value={String(kaartIndeks)}
                onChange={(e) => {
                  const keuse = e.target.value === "geen" ? "geen" : Number(e.target.value);
                  setKaartIndeks(keuse);
                  /* Hou die bylaag-lys in pas sonder 'n effek: "geen" haal die
                     kaart uit, 'n keuse sit hom voor in as hy nog nie daar is
                     nie. Sy posisie bly staan as hy reeds gekies was. */
                  setBylaes((vorige) =>
                    keuse === "geen"
                      ? vorige.filter((b) => b.soort !== "kaart")
                      : vorige.some((b) => b.soort === "kaart")
                        ? vorige
                        : [{ soort: "kaart" as const }, ...vorige]
                  );
                }}
                className="mt-1 h-11 w-full border-2 border-ink bg-paper px-2 text-sm outline-none focus:border-red"
              >
                <option value="geen">Geen beeld (net teks)</option>
                {stukke.map((s) => (
                  <option key={s.i} value={s.i}>
                    {s.kop.slice(0, 60)}
                  </option>
                ))}
              </select>
            </label>
            )}

            <div className="text-xs font-semibold sm:col-span-2">
              Bylaes — die volgorde hier is die volgorde in die plasing
              <ul className="mt-1 space-y-1">
                {bylaes.map((b, i) => (
                  <li
                    key={b.soort === "kaart" ? "kaart" : b.url}
                    className="flex items-center gap-2 border border-ink/20 bg-paper px-2 py-1"
                  >
                    {b.soort === "foto" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.url} alt="" className="h-10 w-14 border border-ink/15 object-cover" />
                    ) : (
                      <span className="flex h-10 w-14 items-center justify-center border border-ink/15 text-[10px] font-bold">
                        KAART
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-normal text-ink/60">
                      {b.soort === "kaart" ? "Die gebakte kaart" : b.url.split("/").pop()}
                    </span>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() =>
                        setBylaes((v) => {
                          const n = [...v];
                          [n[i - 1], n[i]] = [n[i], n[i - 1]];
                          return n;
                        })
                      }
                      className="border border-ink px-2 py-0.5 disabled:opacity-30"
                      aria-label="Skuif op"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={i === bylaes.length - 1}
                      onClick={() =>
                        setBylaes((v) => {
                          const n = [...v];
                          [n[i], n[i + 1]] = [n[i + 1], n[i]];
                          return n;
                        })
                      }
                      className="border border-ink px-2 py-0.5 disabled:opacity-30"
                      aria-label="Skuif af"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (b.soort === "kaart") setKaartIndeks("geen");
                        setBylaes((v) => v.filter((_, j) => j !== i));
                      }}
                      className="border border-ink px-2 py-0.5"
                      aria-label="Verwyder"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <input
                type="file"
                accept="image/*"
                multiple
                disabled={laaiOp}
                onChange={async (e) => {
                  const leers = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (!leers.length) return;
                  setLaaiOp(true);
                  setFout(null);
                  try {
                    for (const leer of leers) {
                      const vorm = new FormData();
                      vorm.append("leer", leer);
                      const res = await fetch("/api/fotos/oplaai", { method: "POST", body: vorm });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.fout ?? "Oplaai het misluk.");
                      /* Die URL moet publiek wees: Buffer laai niks op nie, dit
                         haal die beeld self by ons af. */
                      setBylaes((v) => [...v, { soort: "foto", url: data.url as string }]);
                    }
                  } catch (err) {
                    setFout(err instanceof Error ? err.message : "Oplaai het misluk.");
                  } finally {
                    setLaaiOp(false);
                  }
                }}
                className="mt-2 block w-full text-xs font-normal"
              />
              {laaiOp ? <span className="text-ink/50">Laai op…</span> : null}
            </div>

            <label className="text-xs font-semibold">
              {"Wanneer (SAST) — leeg = die kanaal se volgende tou-gleuf"}
              <input
                type="datetime-local"
                value={wanneer}
                onChange={(e) => setWanneer(e.target.value)}
                className="mt-1 h-11 w-full border-2 border-ink bg-paper px-2 text-sm outline-none focus:border-red"
              />
            </label>
          </div>

          <textarea
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            rows={4}
            placeholder="Plasingteks…"
            className="mt-3 w-full border-2 border-ink bg-offwhite p-3 text-sm outline-none focus:border-red"
          />

          <input
            value={eersteKommentaar}
            onChange={(e) => setEersteKommentaar(e.target.value)}
            placeholder="Eerste kommentaar (LinkedIn/Instagram/Facebook) — sit skakels hier, nie in die lyf nie"
            className="mt-2 h-11 w-full border-2 border-ink bg-paper px-3 text-sm outline-none focus:border-red"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={konsep}
                onChange={(e) => setKonsep(e.target.checked)}
                className="size-4 accent-[#1A1A1A]"
              />
              Stoor as konsep in Buffer
            </label>
            <button
              onClick={stuur}
              disabled={Boolean(besig) || !gekies.size}
              className="h-11 bg-ink px-5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
            >
              {besig ?? (konsep ? "Stoor konsepte →" : "Skeduleer →")}
            </button>
            {!konsep ? (
              <span className="text-xs font-semibold text-red">
                {"Dit skeduleer 'n regte plasing."}
              </span>
            ) : null}
            {fout ? <span className="text-sm font-semibold text-red">{fout}</span> : null}
          </div>

          {waarskuwings.length ? (
            <ul className="mt-3 border-2 border-red p-3 text-sm">
              {waarskuwings.map((w) => (
                <li key={w.kanaal}>
                  <strong>{w.kanaal}:</strong> {w.fout}
                </li>
              ))}
            </ul>
          ) : null}

          {uitslae.length ? (
            <ul className="mt-3 border-2 border-ink p-3 text-sm">
              {uitslae.map((u, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-0.5">
                  {u.ok ? (
                    <>
                      <span>
                        ✅ <strong>{u.kanaal}</strong> — {u.status}
                        {u.dueAt ? ` · ${new Date(u.dueAt).toLocaleString("af-ZA")}` : ""}
                      </span>
                      <button
                        onClick={() => ongedaan(u.plasingId)}
                        className="border-2 border-ink px-2 py-0.5 text-xs font-semibold hover:bg-paper"
                      >
                        Ongedaan
                      </button>
                    </>
                  ) : (
                    <span className="text-red">
                      ❌ <strong>{u.kanaal}</strong> — {u.fout}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
