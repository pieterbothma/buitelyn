"use client";

import { useEffect, useRef, useState } from "react";
import type { Kwotasie } from "@/lib/markets/source";
import { naamVirSimbool } from "@/lib/markets/boards";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Belegging = { id?: string; simbool: string; naam?: string; aantal: number; koopprys: number };

type SoekResultaat = { simbool: string; naam: string; beurs: string };

const SLEUTEL = "buitelyn-portefeulje";

export function Portefeulje({
  kwotasies,
  onVerander,
}: {
  kwotasies: Map<string, Kwotasie>;
  onVerander: (b: Belegging[]) => void;
}) {
  const [beleggings, setBeleggings] = useState<Belegging[]>([]);
  const [soek, setSoek] = useState("");
  const [resultate, setResultate] = useState<SoekResultaat[]>([]);
  const [gekose, setGekose] = useState<SoekResultaat | null>(null);
  const [aantal, setAantal] = useState("");
  const [koopprys, setKoopprys] = useState("");
  const [epos, setEpos] = useState("");
  const [gebruiker, setGebruiker] = useState<{ id: string; epos: string } | null>(null);
  const [skakelGestuur, setSkakelGestuur] = useState(false);
  const soekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sb = supabaseBrowser();

  useEffect(() => {
    try {
      const gestoor = JSON.parse(localStorage.getItem(SLEUTEL) ?? "[]");
      if (Array.isArray(gestoor)) {
        setBeleggings(gestoor);
        onVerander(gestoor);
      }
    } catch {
      /* korrupte data — begin oor */
    }
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => {
      if (data.user) setGebruiker({ id: data.user.id, epos: data.user.email ?? "" });
    });
    const { data: luisteraar } = sb.auth.onAuthStateChange((_e, sessie) => {
      setGebruiker(sessie?.user ? { id: sessie.user.id, epos: sessie.user.email ?? "" } : null);
    });
    return () => luisteraar.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Ingeteken: laai uit die databasis; skuif blaaier-items eenmalig oor. */
  useEffect(() => {
    if (!sb || !gebruiker) return;
    (async () => {
      let plaaslik: Belegging[] = [];
      try {
        plaaslik = JSON.parse(localStorage.getItem(SLEUTEL) ?? "[]");
      } catch {
        /* niks om te migreer nie */
      }
      if (Array.isArray(plaaslik) && plaaslik.length) {
        await sb.from("portefeuljes").insert(
          plaaslik.map((b) => ({
            user_id: gebruiker.id,
            simbool: b.simbool,
            naam: b.naam ?? null,
            aantal: b.aantal,
            koopprys: b.koopprys,
          }))
        );
        localStorage.removeItem(SLEUTEL);
      }
      const { data } = await sb
        .from("portefeuljes")
        .select("id, simbool, naam, aantal, koopprys")
        .order("geskep_at");
      const rye: Belegging[] = (data ?? []).map((r) => ({
        id: r.id,
        simbool: r.simbool,
        naam: r.naam ?? undefined,
        aantal: Number(r.aantal),
        koopprys: Number(r.koopprys),
      }));
      setBeleggings(rye);
      onVerander(rye);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gebruiker?.id]);

  function stoor(nuut: Belegging[]) {
    setBeleggings(nuut);
    if (!gebruiker) localStorage.setItem(SLEUTEL, JSON.stringify(nuut));
    onVerander(nuut);
  }

  async function tekenIn() {
    if (!sb || !/.+@.+\..+/.test(epos)) return;
    const { error } = await sb.auth.signInWithOtp({
      email: epos.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (!error) setSkakelGestuur(true);
  }

  async function tekenUit() {
    if (!sb) return;
    await sb.auth.signOut();
    setSkakelGestuur(false);
    stoor([]);
  }

  function soekTikker(q: string) {
    setSoek(q);
    setGekose(null);
    if (soekTimer.current) clearTimeout(soekTimer.current);
    if (q.trim().length < 2) {
      setResultate([]);
      return;
    }
    soekTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/markte/soek?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) setResultate((await res.json()).resultate ?? []);
      } catch {
        /* stil */
      }
    }, 300);
  }

  function kies(r: SoekResultaat) {
    setGekose(r);
    setSoek(`${r.naam} (${r.simbool})`);
    setResultate([]);
  }

  async function voegBy() {
    const a = parseFloat(aantal);
    const p = parseFloat(koopprys);
    // 'n Rou tikker soos "AAPL" of "SNT.JO" werk ook sonder om te kies
    const rou = soek.trim().toUpperCase();
    const keuse = gekose ?? (/^[A-Z0-9^][A-Z0-9.^=-]{0,11}$/.test(rou) ? { simbool: rou, naam: rou, beurs: "" } : null);
    if (!keuse || !a || !p) return;
    const nuwe: Belegging = { simbool: keuse.simbool, naam: keuse.naam, aantal: a, koopprys: p };
    if (sb && gebruiker) {
      const { data } = await sb
        .from("portefeuljes")
        .insert({ user_id: gebruiker.id, simbool: nuwe.simbool, naam: nuwe.naam ?? null, aantal: a, koopprys: p })
        .select("id")
        .single();
      nuwe.id = data?.id;
    }
    stoor([...beleggings, nuwe]);
    setSoek("");
    setGekose(null);
    setAantal("");
    setKoopprys("");
  }

  async function verwyder(indeks: number) {
    const ry = beleggings[indeks];
    if (sb && gebruiker && ry?.id) await sb.from("portefeuljes").delete().eq("id", ry.id);
    stoor(beleggings.filter((_, j) => j !== indeks));
  }

  const fmt = new Intl.NumberFormat("af-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  let totaalWaarde = 0;
  let totaalKoste = 0;
  let dagDelta = 0;

  const rye = beleggings.map((b, i) => {
    const k = kwotasies.get(b.simbool);
    const waarde = k ? k.prys * b.aantal : null;
    if (waarde != null && k) {
      totaalWaarde += waarde;
      totaalKoste += b.koopprys * b.aantal;
      if (k.vorigeSluiting != null) dagDelta += (k.prys - k.vorigeSluiting) * b.aantal;
    }
    return { ...b, i, k, waarde };
  });
  const totaalPL = totaalWaarde - totaalKoste;

  return (
    <section className="border-2 border-ink bg-offwhite">
      <h2 className="flex flex-wrap items-baseline gap-2 border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
        MY PORTEFEULJE
        <span className="font-normal normal-case tracking-normal text-ink/50">
          {gebruiker ? gebruiker.epos : "(gestoor in jou blaaier)"}
        </span>
        {gebruiker ? (
          <button
            onClick={tekenUit}
            className="ml-auto font-semibold normal-case tracking-normal text-ink/50 underline-offset-2 hover:text-ink hover:underline"
          >
            Teken uit
          </button>
        ) : null}
      </h2>

      {rye.length > 0 ? (
        <>
          <ul className="divide-y divide-ink/10">
            {rye.map((r) => (
              <li key={r.i} className="flex items-baseline gap-3 px-4 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {r.naam ?? naamVirSimbool(r.simbool)}
                  <span className="ml-1.5 font-normal text-ink/50">× {r.aantal}</span>
                </span>
                <span className="font-bold tabular-nums">
                  {r.waarde != null ? `R ${fmt.format(r.waarde)}` : "—"}
                </span>
                {r.waarde != null ? (
                  <span
                    className={`w-28 text-right text-xs font-semibold tabular-nums ${
                      r.waarde - r.koopprys * r.aantal >= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {r.waarde - r.koopprys * r.aantal >= 0 ? "+" : ""}
                    R {fmt.format(r.waarde - r.koopprys * r.aantal)}
                  </span>
                ) : (
                  <span className="w-28" />
                )}
                <button
                  onClick={() => verwyder(r.i)}
                  className="text-xs font-semibold text-red/70 hover:text-red"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-baseline gap-4 border-t-2 border-ink px-4 py-2.5 text-sm">
            <span className="font-extrabold">TOTAAL R {fmt.format(totaalWaarde)}</span>
            <span
              className={`font-semibold tabular-nums ${dagDelta >= 0 ? "text-green" : "text-red"}`}
            >
              vandag {dagDelta >= 0 ? "+" : ""}R {fmt.format(dagDelta)}
            </span>
            <span
              className={`font-semibold tabular-nums ${totaalPL >= 0 ? "text-green" : "text-red"}`}
            >
              altesaam {totaalPL >= 0 ? "+" : ""}R {fmt.format(totaalPL)}
            </span>
          </div>
        </>
      ) : (
        <p className="px-4 py-4 text-sm text-ink/50">
          Voeg jou beleggings by — waardes en wins/verlies word live bereken.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 px-4 py-3">
        <div className="relative min-w-52 flex-1">
          <input
            value={soek}
            onChange={(e) => soekTikker(e.target.value)}
            placeholder="Soek aandeel of tikker (bv. Santam, AAPL)…"
            className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
          />
          {resultate.length > 0 ? (
            <ul className="absolute inset-x-0 top-full z-10 border-2 border-t-0 border-ink bg-offwhite">
              {resultate.map((r) => (
                <li key={r.simbool}>
                  <button
                    onClick={() => kies(r)}
                    className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left text-sm hover:bg-ink hover:text-offwhite"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.naam}</span>
                    <span className="text-xs tabular-nums opacity-60">{r.simbool}</span>
                    {r.beurs ? <span className="text-[10px] tracking-wide opacity-50">{r.beurs.toUpperCase()}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <input
          value={aantal}
          onChange={(e) => setAantal(e.target.value)}
          placeholder="Aantal"
          className="w-24 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
        />
        <input
          value={koopprys}
          onChange={(e) => setKoopprys(e.target.value)}
          placeholder="Koopprys (R)"
          className="w-32 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
        />
        <button
          onClick={voegBy}
          className="bg-ink px-4 py-1.5 text-sm font-semibold text-offwhite hover:bg-ink/85"
        >
          + Voeg by
        </button>
      </div>

      {sb && !gebruiker ? (
        <div className="border-t border-ink/15 px-4 py-3">
          {skakelGestuur ? (
            <p className="text-sm text-ink/70">
              Kyk in jou inbox — ons het &apos;n teken-in-skakel gestuur.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                tekenIn();
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-sm text-ink/60">
                Teken in om jou portefeulje oor toestelle te stoor:
              </span>
              <input
                type="email"
                value={epos}
                onChange={(e) => setEpos(e.target.value)}
                placeholder="jou@epos.co.za"
                className="min-w-44 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
              />
              <button className="bg-ink px-3 py-1.5 text-sm font-semibold text-offwhite hover:bg-ink/85">
                Teken in
              </button>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
