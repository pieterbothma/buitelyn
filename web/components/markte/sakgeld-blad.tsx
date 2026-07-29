"use client";

import { useState } from "react";
import type { SakgeldSyfer } from "@/app/markte/page";

const fmtR = new Intl.NumberFormat("af-ZA", { maximumFractionDigits: 0 });

const VERDUIDELIK: Record<string, string> = {
  repo: "Die Reserwebank se koers — die anker waarvan alle leenkoste afhang.",
  prima: "Wat banke hul beste kliënte vra; jou verband is gewoonlik prima plus of minus iets.",
  kpi: "Hoe vinnig verbruikerspryse styg — die amptelike inflasiesyfer.",
  ppi: "Fabriekshek-inflasie — wys dikwels waarheen KPI oppad is.",
  petrol95: "Amptelike binnelandse pompprys; verander die eerste Woensdag van die maand.",
  diesel: "Binnelandse groothandel-diesel — die koste agter vervoer en kos.",
};

export function SakgeldBlad({ syfers }: { syfers: SakgeldSyfer[] }) {
  const kry = (sleutel: string) => syfers.find((s) => s.sleutel === sleutel)?.waarde ?? null;
  const prima = kry("prima") ?? 10.5;
  const kpi = kry("kpi") ?? 5;
  const petrol = kry("petrol95") ?? 26;

  return (
    <div className="space-y-6">
      {/* syfer-kaarte */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {syfers.map((s) => (
          <div key={s.sleutel} className="border-2 border-ink bg-offwhite px-4 py-3">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink/50">{s.naam.toUpperCase()}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight">
              {s.eenheid === "R/l" ? `R ${Number(s.waarde).toFixed(2)}` : `${Number(s.waarde).toFixed(s.sleutel === "kpi" || s.sleutel === "ppi" ? 1 : 2)}%`}
              {s.eenheid === "R/l" ? <span className="text-sm font-normal text-ink/50">/liter</span> : null}
            </p>
            {s.datum_effektief ? (
              <p className="text-xs tabular-nums text-ink/40">{s.datum_effektief}</p>
            ) : null}
            <p className="mt-1 text-xs leading-snug text-ink/60">{VERDUIDELIK[s.sleutel] ?? ""}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Verband prima={prima} />
        <Petrol prys={petrol} />
        <Inflasie kpi={kpi} />
        <Spaargroei />
      </div>

      <p className="text-xs text-ink/50">
        Kalkulators is skattings vir konteks — nie finansiële advies nie. Koerse en pryse:
        SA Reserwebank en amptelike brandstofpryse.
      </p>
    </div>
  );
}

function Kalkulator({ titel, kinders }: { titel: string; kinders: React.ReactNode }) {
  return (
    <section className="border-2 border-ink bg-offwhite">
      <h2 className="border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">{titel}</h2>
      <div className="space-y-3 px-4 py-3">{kinders}</div>
    </section>
  );
}

function Veld({
  etiket,
  waarde,
  stel,
  suffix,
}: {
  etiket: string;
  waarde: string;
  stel: (v: string) => void;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-44 shrink-0 text-ink/70">{etiket}</span>
      <input
        value={waarde}
        onChange={(e) => stel(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        className="min-w-0 flex-1 border-2 border-ink bg-paper px-2 py-1.5 tabular-nums outline-none focus:border-red"
      />
      {suffix ? <span className="text-xs text-ink/50">{suffix}</span> : null}
    </label>
  );
}

function Uitslag({ reels }: { reels: (string | null)[] }) {
  return (
    <div className="border-t border-ink/15 pt-2">
      {reels.filter(Boolean).map((r, i) => (
        <p key={i} className={i === 0 ? "text-lg font-extrabold tabular-nums" : "mt-0.5 text-sm tabular-nums text-ink/70"}>
          {r}
        </p>
      ))}
    </div>
  );
}

/** Maandelikse paaiement: P·(r/12) / (1 − (1+r/12)^−n) */
function paaiement(bedrag: number, jaarKoers: number, maande: number): number {
  const r = jaarKoers / 100 / 12;
  if (r === 0) return bedrag / maande;
  return (bedrag * r) / (1 - Math.pow(1 + r, -maande));
}

function Verband({ prima }: { prima: number }) {
  const [bedrag, setBedrag] = useState("1500000");
  const [jare, setJare] = useState("20");
  const [koers, setKoers] = useState(prima.toFixed(2));
  const b = Number(bedrag) || 0;
  const n = (Number(jare) || 20) * 12;
  const k = Number(koers) || prima;
  const p = b > 0 ? paaiement(b, k, n) : 0;
  const pOp = b > 0 ? paaiement(b, k + 0.25, n) : 0;
  const totaal = p * n;
  return (
    <Kalkulator
      titel="VERBAND-KALKULATOR"
      kinders={
        <>
          <Veld etiket="Leningsbedrag (R)" waarde={bedrag} stel={setBedrag} />
          <Veld etiket="Termyn (jare)" waarde={jare} stel={setJare} />
          <Veld etiket="Rentekoers (%)" waarde={koers} stel={setKoers} suffix={`prima is ${prima.toFixed(2)}%`} />
          {b > 0 ? (
            <Uitslag
              reels={[
                `R ${fmtR.format(p)} per maand`,
                `As die repokoers met 0,25% styg: R ${fmtR.format(pOp)} (+R ${fmtR.format(pOp - p)})`,
                `Totaal oor ${jare} jaar: R ${fmtR.format(totaal)} (rente R ${fmtR.format(totaal - b)})`,
              ]}
            />
          ) : null}
        </>
      }
    />
  );
}

function Petrol({ prys }: { prys: number }) {
  const [km, setKm] = useState("1500");
  const [verbruik, setVerbruik] = useState("8");
  const maandKoste = ((Number(km) || 0) / 100) * (Number(verbruik) || 0) * prys;
  return (
    <Kalkulator
      titel="PETROL-KALKULATOR"
      kinders={
        <>
          <Veld etiket="Km per maand" waarde={km} stel={setKm} />
          <Veld etiket="Verbruik (l/100km)" waarde={verbruik} stel={setVerbruik} />
          {maandKoste > 0 ? (
            <Uitslag
              reels={[
                `R ${fmtR.format(maandKoste)} per maand`,
                `Teen die huidige petrolprys van R ${prys.toFixed(2)}/l · R ${fmtR.format(maandKoste * 12)} per jaar`,
                `As petrol met R1/l styg: +R ${fmtR.format(((Number(km) || 0) / 100) * (Number(verbruik) || 0))} per maand`,
              ]}
            />
          ) : null}
        </>
      }
    />
  );
}

function Inflasie({ kpi }: { kpi: number }) {
  const [bedrag, setBedrag] = useState("10000");
  const [jare, setJare] = useState("10");
  const b = Number(bedrag) || 0;
  const j = Number(jare) || 0;
  const koopkrag = b / Math.pow(1 + kpi / 100, j);
  const nodig = b * Math.pow(1 + kpi / 100, j);
  return (
    <Kalkulator
      titel="INFLASIE-KALKULATOR"
      kinders={
        <>
          <Veld etiket="Bedrag vandag (R)" waarde={bedrag} stel={setBedrag} />
          <Veld etiket="Oor hoeveel jaar" waarde={jare} stel={setJare} />
          {b > 0 && j > 0 ? (
            <Uitslag
              reels={[
                `R ${fmtR.format(koopkrag)} se koopkrag oor ${j} jaar`,
                `Teen die huidige inflasie van ${kpi.toFixed(1)}% — jy sal R ${fmtR.format(nodig)} nodig hê om te koop wat R ${fmtR.format(b)} vandag koop.`,
              ]}
            />
          ) : null}
        </>
      }
    />
  );
}

function Spaargroei() {
  const [maandeliks, setMaandeliks] = useState("1000");
  const [jare, setJare] = useState("15");
  const [opbrengs, setOpbrengs] = useState("10");
  const m = Number(maandeliks) || 0;
  const n = (Number(jare) || 0) * 12;
  const r = (Number(opbrengs) || 0) / 100 / 12;
  const fv = r > 0 ? m * ((Math.pow(1 + r, n) - 1) / r) : m * n;
  const inbetaal = m * n;
  return (
    <Kalkulator
      titel="SPAARGROEI-KALKULATOR"
      kinders={
        <>
          <Veld etiket="Maandeliks (R)" waarde={maandeliks} stel={setMaandeliks} />
          <Veld etiket="Jare" waarde={jare} stel={setJare} />
          <Veld etiket="Verwagte opbrengs (%)" waarde={opbrengs} stel={setOpbrengs} suffix="per jaar" />
          {m > 0 && n > 0 ? (
            <Uitslag
              reels={[
                `R ${fmtR.format(fv)} oor ${jare} jaar`,
                `Jy betaal R ${fmtR.format(inbetaal)} in; groei gee jou R ${fmtR.format(fv - inbetaal)} verniet by.`,
                `Saamgestelde rente — die agtste wonderwerk.`,
              ]}
            />
          ) : null}
        </>
      }
    />
  );
}
