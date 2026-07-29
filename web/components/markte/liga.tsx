"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Houding = { simbool: string; naam: string | null; aantal: number; koopprys: number; prys: number | null };
type Ek = { nommer: number; naam: string; kontant: number; houdings: Houding[] };
type RanglysRy = { posisie: number; nommer: number; naam: string; avatar: string | null; waarde?: number; opbrengs: number; maande?: number; ek: boolean };
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Portefeulje ek={ek} herlaai={laai} besig={besig} setBesig={setBesig} fout={fout} setFout={setFout} />
      <Ranglys maand={ranglys} kwartaal={kwartaal} jaar={jaar} />
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
            const delta = ((nou - h.koopprys) / h.koopprys) * 100;
            return (
              <li key={h.simbool} className="flex items-baseline gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {h.naam ?? h.simbool} <span className="text-xs font-normal text-ink/50">× {fmtR.format(h.aantal)}</span>
                </span>
                <span className="text-sm tabular-nums">R {fmtR.format(nou * h.aantal)}</span>
                <span className={`w-20 text-right text-sm font-semibold tabular-nums ${delta >= 0 ? "text-green" : "text-red"}`}>
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(1)}%
                </span>
                <button
                  onClick={() => doen("verkoop", h.simbool, h.naam ?? h.simbool, { aantal: h.aantal })}
                  disabled={besig}
                  className="border border-ink/30 px-2 py-0.5 text-xs font-semibold hover:border-red hover:text-red disabled:opacity-50"
                >
                  Verkoop
                </button>
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
        <p className="mt-2 text-xs text-ink/50">Pryse ±15 min vertraag · net JSE-aandele · rondte eindig einde van die maand</p>
      </div>
    </section>
  );
}

/* ---------- ranglys ---------- */

function Ranglys({ maand, kwartaal, jaar }: { maand: RanglysRy[]; kwartaal: RanglysRy[]; jaar: RanglysRy[] }) {
  const [periode, setPeriode] = useState<"maand" | "kwartaal" | "jaar">("maand");
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
          <li key={r.nommer} className={`flex items-center gap-3 px-4 py-2 ${r.ek ? "bg-paper" : ""}`}>
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
          </li>
        ))}
        {ranglys.length === 0 ? <li className="px-4 py-6 text-sm text-ink/50">Nog geen spelers nie.</li> : null}
      </ul>
    </section>
  );
}
