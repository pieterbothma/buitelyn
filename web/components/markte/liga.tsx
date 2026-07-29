"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Houding = { simbool: string; naam: string | null; aantal: number; koopprys: number; prys: number | null; dagDelta: number | null };
type Ek = { nommer: number; naam: string; kontant: number; houdings: Houding[] };
type SpelerHouding = { simbool: string; naam: string | null; aantal: number; waarde: number };
type RanglysRy = { posisie: number; nommer: number; naam: string; avatar: string | null; waarde?: number; opbrengs: number; maande?: number; ek: boolean; houdings?: SpelerHouding[] };
type GrafiekReeks = { nommer: number; naam: string; ek: boolean; punte: { datum: string; waarde: number }[] };
type Transaksie = { nommer: number; speler: string; aksie: string; naam: string; aantal: number; prys: number; tyd: string };
type SoekResultaat = { simbool: string; naam: string };

const fmtR = new Intl.NumberFormat("af-ZA", { maximumFractionDigits: 0 });

function nr(n: number): string {
  return `#${String(n).padStart(2, "0")}`;
}

export function LigaBord({ profielNaam }: { profielNaam: string }) {
  const [ek, setEk] = useState<Ek | null | undefined>(undefined);
  const [ranglys, setRanglys] = useState<RanglysRy[]>([]);
  const [kwartaal, setKwartaal] = useState<RanglysRy[]>([]);
  const [jaar, setJaar] = useState<RanglysRy[]>([]);
  const [grafiek, setGrafiek] = useState<GrafiekReeks[]>([]);
  const [benchmark, setBenchmark] = useState<number | null>(null);
  const [transaksies, setTransaksies] = useState<Transaksie[]>([]);
  const [besig, setBesig] = useState(false);
  const [fout, setFout] = useState("");

  const laai = useCallback(async () => {
    try {
      const res = await fetch("/api/liga");
      if (res.ok) {
        const d = await res.json();
        setEk(d.ek);
        setRanglys(d.ranglys);
        setKwartaal(d.kwartaal ?? []);
        setJaar(d.jaar ?? []);
        setGrafiek(d.grafiek ?? []);
        setBenchmark(d.benchmark ?? null);
        setTransaksies(d.transaksies ?? []);
      }
    } catch {
      /* volgende keer */
    }
  }, []);

  useEffect(() => {
    laai();
  }, [laai]);

  if (ek === undefined) return <p className="py-8 text-sm text-ink/50">Laai die Beursliga…</p>;
  if (ek === null) return <SluitAan profielNaam={profielNaam} klaar={laai} />;

  const myn = ranglys.find((r) => r.ek);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Portefeulje ek={ek} herlaai={laai} besig={besig} setBesig={setBesig} fout={fout} setFout={setFout} />
        {benchmark != null && myn ? (
          <p className="flex items-center gap-2 border-2 border-ink bg-offwhite px-4 py-2.5 text-sm">
            <span aria-hidden className={`size-2 rounded-full ${myn.opbrengs >= benchmark ? "bg-green" : "bg-red"}`} />
            <span className="font-semibold">
              Jy: {myn.opbrengs >= 0 ? "+" : ""}
              {myn.opbrengs.toFixed(2)}% · Top 40: {benchmark >= 0 ? "+" : ""}
              {benchmark.toFixed(2)}%
            </span>
            <span className="text-ink/60">
              — jy {myn.opbrengs >= benchmark ? "klop" : "loop agter"} die mark dié maand
            </span>
          </p>
        ) : null}
        <MaandGrafiek reekse={grafiek} />
      </div>
      <div className="space-y-6">
        <Ranglys maand={ranglys} kwartaal={kwartaal} jaar={jaar} />
        <TransaksieVoer transaksies={transaksies} />
      </div>
    </div>
  );
}

/* ---------- aanboording ---------- */

function SluitAan({ profielNaam, klaar }: { profielNaam: string; klaar: () => void }) {
  const [naam, setNaam] = useState(profielNaam);
  const [foto, setFoto] = useState<File | null>(null);
  const [voorskou, setVoorskou] = useState<string | null>(null);
  const [besig, setBesig] = useState(false);
  const [fout, setFout] = useState("");
  const lêerRef = useRef<HTMLInputElement>(null);

  const kies = (f: File | null) => {
    setFoto(f);
    setVoorskou(f ? URL.createObjectURL(f) : null);
  };

  const aansluit = async () => {
    setBesig(true);
    setFout("");
    try {
      if (foto) {
        const vorm = new FormData();
        vorm.append("foto", foto);
        await fetch("/api/profiel/avatar", { method: "POST", body: vorm });
      }
      const res = await fetch("/api/liga", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aksie: "sluit_aan", naam }),
      });
      const d = await res.json();
      if (!res.ok) {
        setFout(d.fout ?? "iets is fout");
        return;
      }
      klaar();
    } finally {
      setBesig(false);
    }
  };

  return (
    <div className="max-w-xl border-2 border-ink bg-offwhite p-6">
      <p className="text-xs font-semibold tracking-[0.16em]">
        SLUIT AAN BY DIE BEURSLIGA
        <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink/70">
        R100 000 denkbeeldige geld, net JSE-aandele, elke maand &apos;n nuwe rondte. Vroeë
        aansluiters kry &apos;n blywende lidnommer — #01 is #01 vir altyd.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={() => lêerRef.current?.click()}
          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-paper text-xs text-ink/50 hover:border-red"
        >
          {voorskou ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={voorskou} alt="" className="size-full object-cover" />
          ) : (
            "+ foto"
          )}
        </button>
        <input
          ref={lêerRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => kies(e.target.files?.[0] ?? null)}
        />
        <div className="min-w-0 flex-1">
          <label className="text-xs font-semibold tracking-[0.1em] text-ink/50">JOU SPELERSNAAM</label>
          <input
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            maxLength={40}
            placeholder="bv. Piet die Bul"
            className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
          />
        </div>
      </div>
      {fout ? <p className="mt-3 text-sm text-red">{fout}</p> : null}
      <button
        onClick={aansluit}
        disabled={besig || naam.trim().length < 2}
        className="mt-4 border-2 border-ink bg-ink px-5 py-2 text-sm font-bold text-offwhite hover:border-red hover:bg-red disabled:opacity-50"
      >
        {besig ? "Besig…" : "Sluit aan →"}
      </button>
    </div>
  );
}

/* ---------- my portefeulje + handel ---------- */

function Portefeulje({
  ek,
  herlaai,
  besig,
  setBesig,
  fout,
  setFout,
}: {
  ek: Ek;
  herlaai: () => void;
  besig: boolean;
  setBesig: (b: boolean) => void;
  fout: string;
  setFout: (f: string) => void;
}) {
  const [soek, setSoek] = useState("");
  const [resultate, setResultate] = useState<SoekResultaat[]>([]);
  const [keuse, setKeuse] = useState<SoekResultaat | null>(null);
  const [modus, setModus] = useState<"rand" | "aandele">("rand");
  const [invoer, setInvoer] = useState("");
  const [keusePrys, setKeusePrys] = useState<number | null>(null);

  // prys vir die voorskou sodra 'n aandeel gekies is
  useEffect(() => {
    if (!keuse) {
      setKeusePrys(null);
      return;
    }
    let aktief = true;
    fetch(`/api/markte/quotes?ekstra=${encodeURIComponent(keuse.simbool)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!aktief || !d) return;
        const k = (d.kwotasies as { simbool: string; prys: number }[]).find((x) => x.simbool === keuse.simbool);
        setKeusePrys(k?.prys ?? null);
      })
      .catch(() => {});
    return () => {
      aktief = false;
    };
  }, [keuse]);

  useEffect(() => {
    const q = soek.trim();
    if (q.length < 2 || keuse) {
      setResultate([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/markte/soek?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const { resultate: r } = await res.json();
          setResultate((r as SoekResultaat[]).filter((x) => x.simbool.endsWith(".JO")).slice(0, 6));
        }
      } catch {
        /* stil */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [soek, keuse]);

  const doen = async (
    aksie: "koop" | "verkoop",
    simbool: string,
    naam: string,
    opsies: { aantal?: number; bedrag?: number }
  ) => {
    setBesig(true);
    setFout("");
    try {
      const res = await fetch("/api/liga", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aksie, simbool, aandeelNaam: naam, ...opsies }),
      });
      const d = await res.json();
      if (!res.ok) {
        setFout(d.fout ?? "iets is fout");
        return;
      }
      setKeuse(null);
      setSoek("");
      setInvoer("");
      herlaai();
    } finally {
      setBesig(false);
    }
  };

  const getal = Number(invoer) || 0;
  const voorskou =
    keuse && keusePrys && getal > 0
      ? modus === "rand"
        ? `≈ ${Math.floor(getal / keusePrys)} aandele teen R ${keusePrys.toFixed(2)}`
        : `= R ${fmtR.format(getal * keusePrys)} teen R ${keusePrys.toFixed(2)}`
      : keuse && keusePrys
        ? `prys: R ${keusePrys.toFixed(2)}`
        : null;

  const waarde = ek.kontant + ek.houdings.reduce((t, h) => t + (h.prys ?? h.koopprys) * h.aantal, 0);

  return (
    <section className="border-2 border-ink bg-offwhite">
      <h2 className="flex items-baseline justify-between border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
        <span>
          MY BEURSLIGA-PORTEFEULJE <span className="ml-1 text-red">{nr(ek.nommer)}</span>
        </span>
        <span className="font-bold normal-case tracking-normal">R {fmtR.format(waarde)}</span>
      </h2>
      <div className="px-4 py-3">
        <p className="text-sm text-ink/70">
          Kontant: <span className="font-bold tabular-nums">R {fmtR.format(ek.kontant)}</span>
        </p>

        <ul className="mt-2 divide-y divide-ink/10 border-y border-ink/15">
          {ek.houdings.map((h) => {
            const nou = h.prys ?? h.koopprys;
            const wv = (nou - h.koopprys) * h.aantal;
            return (
              <li key={h.simbool} className="py-2">
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {h.naam ?? h.simbool}{" "}
                    <span className="text-xs font-normal text-ink/50">× {fmtR.format(h.aantal)}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">R {fmtR.format(nou * h.aantal)}</span>
                  <button
                    onClick={() => doen("verkoop", h.simbool, h.naam ?? h.simbool, { aantal: h.aantal })}
                    disabled={besig}
                    className="border border-ink/30 px-2 py-0.5 text-xs font-semibold hover:border-red hover:text-red disabled:opacity-50"
                  >
                    Verkoop
                  </button>
                </div>
                <p className="mt-0.5 flex gap-4 text-xs tabular-nums text-ink/60">
                  <span className={wv >= 0 ? "text-green" : "text-red"}>
                    {wv >= 0 ? "+" : "−"}R {fmtR.format(Math.abs(wv))} sedert koop
                  </span>
                  {h.dagDelta != null ? (
                    <span className={h.dagDelta >= 0 ? "text-green" : "text-red"}>
                      {h.dagDelta >= 0 ? "▲ +" : "▼ "}
                      {h.dagDelta.toFixed(2)}% vandag
                    </span>
                  ) : null}
                </p>
              </li>
            );
          })}
          {ek.houdings.length === 0 ? (
            <li className="py-3 text-sm text-ink/50">Nog niks gekoop nie — begin hieronder.</li>
          ) : null}
        </ul>

        <div className="relative mt-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={keuse ? `${keuse.naam} (${keuse.simbool})` : soek}
              onChange={(e) => {
                setKeuse(null);
                setSoek(e.target.value);
              }}
              placeholder="Soek 'n JSE-aandeel…"
              className="min-w-0 flex-1 basis-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red sm:basis-auto"
            />
            <span className="flex border-2 border-ink">
              {(
                [
                  { w: "rand", n: "R" },
                  { w: "aandele", n: "aandele" },
                ] as const
              ).map((o) => (
                <button
                  key={o.w}
                  onClick={() => setModus(o.w)}
                  className={`px-3 py-2 text-sm font-bold ${
                    modus === o.w ? "bg-ink text-offwhite" : "bg-paper hover:bg-offwhite"
                  }`}
                >
                  {o.n}
                </button>
              ))}
            </span>
            <input
              value={invoer}
              onChange={(e) => setInvoer(e.target.value.replace(/\D/g, ""))}
              placeholder={modus === "rand" ? "Bedrag in R" : "Aantal aandele"}
              inputMode="numeric"
              className="w-32 border-2 border-ink bg-paper px-3 py-2 text-sm tabular-nums outline-none focus:border-red"
            />
            <button
              onClick={() =>
                keuse &&
                doen("koop", keuse.simbool, keuse.naam, modus === "rand" ? { bedrag: getal } : { aantal: getal })
              }
              disabled={besig || !keuse || !getal}
              className="border-2 border-ink bg-ink px-4 py-2 text-sm font-bold text-offwhite hover:border-red hover:bg-red disabled:opacity-50"
            >
              Koop
            </button>
          </div>
          {voorskou ? <p className="mt-1.5 text-xs tabular-nums text-ink/60">{voorskou}</p> : null}
          {resultate.length ? (
            <ul className="absolute inset-x-0 top-full z-10 border-2 border-t-0 border-ink bg-offwhite">
              {resultate.map((r) => (
                <li key={r.simbool}>
                  <button
                    onClick={() => {
                      setKeuse(r);
                      setResultate([]);
                    }}
                    className="flex w-full items-baseline justify-between px-3 py-2 text-left text-sm hover:bg-paper"
                  >
                    <span className="font-semibold">{r.naam}</span>
                    <span className="text-xs text-ink/50">{r.simbool}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {fout ? <p className="mt-2 text-sm text-red">{fout}</p> : null}
        <p className="mt-2 text-xs text-ink/50">
          Pryse ±15 min vertraag · net JSE-aandele · rondte eindig oor{" "}
          {(() => {
            const nou = new Date();
            const einde = new Date(nou.getFullYear(), nou.getMonth() + 1, 1);
            return Math.max(1, Math.ceil((einde.getTime() - nou.getTime()) / 86400000));
          })()}{" "}
          dae
        </p>
      </div>
    </section>
  );
}

/* ---------- ranglys ---------- */

function Ranglys({ maand, kwartaal, jaar }: { maand: RanglysRy[]; kwartaal: RanglysRy[]; jaar: RanglysRy[] }) {
  const [periode, setPeriode] = useState<"maand" | "kwartaal" | "jaar">("maand");
  const [oopSpeler, setOopSpeler] = useState<number | null>(null);
  const ranglys = periode === "maand" ? maand : periode === "kwartaal" ? kwartaal : jaar;
  return (
    <section className="border-2 border-ink bg-offwhite">
      <h2 className="flex items-center justify-between border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
        RANGLYS
        <span className="flex border border-ink/30 font-semibold normal-case tracking-normal">
          {(
            [
              { w: "maand", n: "Maand" },
              { w: "kwartaal", n: "Kwartaal" },
              { w: "jaar", n: "Jaar" },
            ] as const
          ).map((o) => (
            <button
              key={o.w}
              onClick={() => setPeriode(o.w)}
              className={`px-2.5 py-0.5 text-xs font-semibold ${
                periode === o.w ? "bg-ink text-offwhite" : "hover:bg-paper"
              }`}
            >
              {o.n}
            </button>
          ))}
        </span>
      </h2>
      <ul className="divide-y divide-ink/10">
        {ranglys.map((r) => (
          <li key={r.nommer} className={r.ek ? "bg-paper" : ""}>
            <button
              onClick={() => setOopSpeler(oopSpeler === r.nommer ? null : r.nommer)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-paper"
            >
            <span className="w-6 text-sm font-bold tabular-nums text-ink/40">{r.posisie}</span>
            {r.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.avatar} alt="" className="size-8 shrink-0 rounded-full border border-ink/20 object-cover" />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-ink/20 bg-paper text-xs font-bold text-ink/50">
                {r.naam.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {r.naam} <span className="font-normal text-red">{nr(r.nommer)}</span>
              {r.ek ? <span className="ml-1 text-xs font-normal text-ink/50">(jy)</span> : null}
            </span>
            {r.waarde != null ? (
              <span className="text-sm tabular-nums text-ink/60">R {fmtR.format(r.waarde)}</span>
            ) : (
              <span className="text-xs tabular-nums text-ink/40">{r.maande} mnd</span>
            )}
            <span className={`w-20 text-right text-sm font-bold tabular-nums ${r.opbrengs >= 0 ? "text-green" : "text-red"}`}>
              {r.opbrengs >= 0 ? "+" : ""}
              {r.opbrengs.toFixed(2)}%
            </span>
            </button>
            {oopSpeler === r.nommer && r.houdings ? (
              <ul className="border-t border-ink/10 bg-paper/60 px-4 py-1.5">
                {r.houdings.map((h) => (
                  <li key={h.simbool} className="flex items-baseline gap-3 py-1 text-xs">
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {h.naam ?? h.simbool} <span className="font-normal text-ink/50">× {fmtR.format(h.aantal)}</span>
                    </span>
                    <span className="tabular-nums text-ink/60">R {fmtR.format(h.waarde)}</span>
                  </li>
                ))}
                {r.houdings.length === 0 ? (
                  <li className="py-1 text-xs text-ink/50">alles nog kontant</li>
                ) : null}
              </ul>
            ) : null}
          </li>
        ))}
        {ranglys.length === 0 ? <li className="px-4 py-6 text-sm text-ink/50">Nog geen spelers nie.</li> : null}
      </ul>
    </section>
  );
}

/* ---------- maand-grafiek ---------- */

const LYN_KLEURE = ["#F03028", "#1A1A1A", "#3E7C6F", "#B0736F", "#8A6FB0", "#C08A2D"];

function MaandGrafiek({ reekse }: { reekse: GrafiekReeks[] }) {
  const met = reekse.filter((r) => r.punte.length > 0);
  if (!met.length) return null;
  const enkelPunt = met.every((r) => r.punte.length < 2);
  const w = 560;
  const h = 180;
  const alles = met.flatMap((r) => r.punte.map((p) => p.waarde));
  const min = Math.min(...alles, 100000) * 0.998;
  const maks = Math.max(...alles, 100000) * 1.002;
  const dae = [...new Set(met.flatMap((r) => r.punte.map((p) => p.datum)))].sort();
  const x = (datum: string) => (dae.length < 2 ? w : (dae.indexOf(datum) / (dae.length - 1)) * w);
  const y = (v: number) => h - ((v - min) / (maks - min)) * (h - 12) - 6;

  return (
    <section className="border-2 border-ink bg-offwhite">
      <h2 className="border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
        DIE MAAND SE VERLOOP
      </h2>
      <div className="px-4 py-3">
        {enkelPunt ? (
          <p className="text-sm text-ink/50">
            Die grafiek begin môre teken — een punt per beursdag, van vandag af.
          </p>
        ) : (
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
            <line x1="0" x2={w} y1={y(100000)} y2={y(100000)} stroke="#1A1A1A" strokeOpacity="0.25" strokeDasharray="4 4" />
            {met.map((r, i) => (
              <polyline
                key={r.nommer}
                points={r.punte.map((p) => `${x(p.datum)},${y(p.waarde)}`).join(" ")}
                fill="none"
                stroke={LYN_KLEURE[i % LYN_KLEURE.length]}
                strokeWidth={r.ek ? 3 : 2}
                strokeOpacity={r.ek ? 1 : 0.75}
              />
            ))}
          </svg>
        )}
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {met.map((r, i) => (
            <span key={r.nommer} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: LYN_KLEURE[i % LYN_KLEURE.length] }} />
              {r.naam} {nr(r.nommer)}
              {r.ek ? " (jy)" : ""}
            </span>
          ))}
          <span className="text-ink/40">--- R 100 000</span>
        </p>
      </div>
    </section>
  );
}

/* ---------- transaksie-voer ---------- */

function TransaksieVoer({ transaksies }: { transaksies: Transaksie[] }) {
  if (!transaksies.length) return null;
  const tydFmt = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" });
  const dagFmt = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short" });
  const wanneer = (iso: string) => {
    const d = new Date(iso);
    return Date.now() - d.getTime() < 24 * 60 * 60 * 1000 ? tydFmt.format(d) : dagFmt.format(d);
  };
  return (
    <section className="border-2 border-ink bg-offwhite">
      <h2 className="border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
        TRANSAKSIES
      </h2>
      <ul className="divide-y divide-ink/10">
        {transaksies.map((t, i) => (
          <li key={i} className="flex items-baseline gap-2 px-4 py-1.5 text-sm">
            <span className="text-xs tabular-nums text-ink/40">{wanneer(t.tyd)}</span>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold">
                {t.speler} <span className="font-normal text-red">{nr(t.nommer)}</span>
              </span>{" "}
              het {fmtR.format(t.aantal)} {t.naam} {t.aksie === "koop" ? "gekoop" : "verkoop"}
            </span>
            <span className="text-xs tabular-nums text-ink/50">@ R {t.prys.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
