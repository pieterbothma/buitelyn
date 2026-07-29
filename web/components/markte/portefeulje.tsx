"use client";

import { useEffect, useRef, useState } from "react";
import type { Kwotasie } from "@/lib/markets/source";
import { naamVirSimbool } from "@/lib/markets/boards";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Belegging = {
  id?: string;
  simbool: string;
  naam?: string;
  aantal: number;
  koopprys: number;
  geldeenheid?: string; // geldeenheid van die koopprys (verstek ZAR)
};

const GELDEENHEDE = [
  { kode: "ZAR", teken: "R" },
  { kode: "USD", teken: "$" },
  { kode: "EUR", teken: "€" },
  { kode: "GBP", teken: "£" },
];

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
  const [geldeenheid, setGeldeenheid] = useState("ZAR");
  const [wagwoord, setWagwoord] = useState("");
  const [stelModus, setStelModus] = useState(false);
  const [authBoodskap, setAuthBoodskap] = useState<string | null>(null);
  const [gebruiker, setGebruiker] = useState<{ id: string; epos: string } | null>(null);
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
    if (new URLSearchParams(window.location.search).get("stel-wagwoord")) setStelModus(true);
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
        .select("id, simbool, naam, aantal, koopprys, geldeenheid")
        .order("geskep_at");
      const rye: Belegging[] = (data ?? []).map((r) => ({
        id: r.id,
        simbool: r.simbool,
        naam: r.naam ?? undefined,
        aantal: Number(r.aantal),
        koopprys: Number(r.koopprys),
        geldeenheid: r.geldeenheid ?? "ZAR",
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

  async function stelWagwoord() {
    if (!sb || wagwoord.length < 8) {
      setAuthBoodskap("Minstens 8 karakters.");
      return;
    }
    const { error } = await sb.auth.updateUser({ password: wagwoord });
    if (error) setAuthBoodskap(error.message);
    else {
      setStelModus(false);
      setWagwoord("");
      setAuthBoodskap(null);
      window.history.replaceState(null, "", "/markte");
    }
  }

  async function tekenUit() {
    if (!sb) return;
    await sb.auth.signOut();
    window.location.assign("/markte"); // terug na die hek
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
    const nuwe: Belegging = { simbool: keuse.simbool, naam: keuse.naam, aantal: a, koopprys: p, geldeenheid };
    if (sb && gebruiker) {
      const { data } = await sb
        .from("portefeuljes")
        .insert({ user_id: gebruiker.id, simbool: nuwe.simbool, naam: nuwe.naam ?? null, aantal: a, koopprys: p, geldeenheid })
        .select("id")
        .single();
      nuwe.id = data?.id;
    }
    stoor([...beleggings, nuwe]);
    setSoek("");
    setGekose(null);
    setAantal("");
    setKoopprys("");
    setGeldeenheid("ZAR");
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

  /* Alles word na rand omgereken — die koopprys volgens sy gekose
     geldeenheid, en die huidige prys volgens die kwotasie se geldeenheid
     (AAPL noteer in USD; sonder omrekening sou $-syfers as R optel). */
  function naRand(bedrag: number, geld: string): number | null {
    if (geld === "ZAR") return bedrag;
    const koers =
      geld === "USD"
        ? kwotasies.get("ZAR=X")?.prys
        : geld === "EUR"
          ? kwotasies.get("EURZAR=X")?.prys
          : geld === "GBP"
            ? kwotasies.get("GBPZAR=X")?.prys
            : null;
    return koers ? bedrag * koers : null;
  }

  let totaalWaarde = 0;
  let totaalKoste = 0;
  let dagDelta = 0;

  const rye = beleggings.map((b, i) => {
    const k = kwotasies.get(b.simbool);
    const prysR = k ? naRand(k.prys, k.geldeenheid) : null;
    const waarde = prysR != null ? prysR * b.aantal : null;
    const kosteR = naRand(b.koopprys, b.geldeenheid ?? "ZAR");
    if (waarde != null && k && kosteR != null) {
      totaalWaarde += waarde;
      totaalKoste += kosteR * b.aantal;
      if (k.vorigeSluiting != null) {
        const vorigeR = naRand(k.vorigeSluiting, k.geldeenheid);
        if (prysR != null && vorigeR != null) dagDelta += (prysR - vorigeR) * b.aantal;
      }
    }
    return { ...b, i, k, waarde, kosteR };
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
                {r.waarde != null && r.kosteR != null ? (
                  <span
                    className={`w-28 text-right text-xs font-semibold tabular-nums ${
                      r.waarde - r.kosteR * r.aantal >= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {r.waarde - r.kosteR * r.aantal >= 0 ? "+" : ""}
                    R {fmt.format(r.waarde - r.kosteR * r.aantal)}
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
          placeholder="Aantal aandele"
          className="w-24 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
        />
        <div className="flex">
          <select
            value={geldeenheid}
            onChange={(e) => setGeldeenheid(e.target.value)}
            aria-label="Geldeenheid"
            className="border-2 border-r-0 border-ink bg-paper px-1.5 py-1.5 text-sm font-semibold"
          >
            {GELDEENHEDE.map((g) => (
              <option key={g.kode} value={g.kode}>
                {g.teken}
              </option>
            ))}
          </select>
          <input
            value={koopprys}
            onChange={(e) => setKoopprys(e.target.value)}
            placeholder="Koopprys per aandeel"
            className="w-40 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
          />
        </div>
        <button
          onClick={voegBy}
          className="bg-ink px-4 py-1.5 text-sm font-semibold text-offwhite hover:bg-ink/85"
        >
          + Voeg by
        </button>
      </div>

      {sb && gebruiker && stelModus ? (
        <div className="border-t border-ink/15 px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              stelWagwoord();
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-sm font-semibold">Kies &apos;n nuwe wagwoord:</span>
            <input
              type="password"
              value={wagwoord}
              onChange={(e) => setWagwoord(e.target.value)}
              placeholder="Minstens 8 karakters"
              className="min-w-44 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
            />
            <button className="bg-ink px-3 py-1.5 text-sm font-semibold text-offwhite hover:bg-ink/85">
              Stoor
            </button>
            {authBoodskap ? <span className="text-xs text-red">{authBoodskap}</span> : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}
