import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Buitelyn grafiek-bouer: landskap 1600×900, League Spartan, papier/ink.
 *  Lyne as inline-SVG-paaie; alle teks as divs (satori-fonthantering). */

export type GrafiekTipe = "vergelyking" | "enkel" | "staaf";
export type GrafiekReeks = { simbool: string; naam: string; punte: { t: number; p: number }[] };

export type GrafiekOpsies = {
  tipe: GrafiekTipe;
  reekse: GrafiekReeks[];
  raam: "poskaart" | "kaal";
  opskrif: string;
  subtitel: string;
  geldeenheid?: string; // vir enkel-tipe se as-etikette
  datum: string; // YYYY-MM-DD
};

export const LYN_KLEURE = ["#F03028", "#1A1A1A", "#3E7C6F", "#B0736F", "#8A6FB0", "#C08A2D"];

const W = 1600;
const H = 900;

function formateerWaarde(v: number, geld?: string): string {
  const n = new Intl.NumberFormat("af-ZA", { maximumFractionDigits: Math.abs(v) < 10 ? 2 : 0 }).format(v);
  if (!geld) return `${v >= 0 ? "+" : ""}${n}%`;
  const teken = geld === "ZAR" ? "R " : geld === "USD" ? "$ " : geld === "GBP" ? "£ " : geld === "HKD" ? "HK$ " : "";
  return `${teken}${n}`;
}

function asDatum(t: number): string {
  return new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", month: "short", year: "2-digit" }).format(
    new Date(t * 1000)
  );
}

/** Bou plot-data: genormaliseerde (of rou) reekse, y-domein, ruitlyn-waardes. */
function bouPlot(opsies: GrafiekOpsies) {
  const persent = opsies.tipe === "vergelyking";
  const reekse = opsies.reekse.map((r) => ({
    ...r,
    waardes: persent
      ? r.punte.map((p) => ((p.p - r.punte[0].p) / r.punte[0].p) * 100)
      : r.punte.map((p) => p.p),
  }));
  const alles = reekse.flatMap((r) => r.waardes);
  let min = Math.min(...alles);
  let maks = Math.max(...alles);
  if (persent) {
    min = Math.min(min, 0);
    maks = Math.max(maks, 0);
  }
  const span = maks - min || 1;
  min -= span * 0.06;
  maks += span * 0.06;
  // Ruitlyne op mooi ronde waardes (1/2/5 × 10^n)
  const rouStap = (maks - min) / 4.5;
  const mag = Math.pow(10, Math.floor(Math.log10(rouStap)));
  const stap = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= rouStap) ?? rouStap;
  const ruite: number[] = [];
  for (let v = Math.ceil(min / stap) * stap; v <= maks; v += stap) ruite.push(Math.round(v * 100) / 100);
  return { reekse, min, maks, ruite, persent };
}

function lynPad(waardes: number[], min: number, maks: number, w: number, h: number): string {
  const n = waardes.length;
  if (n < 2) return "";
  return waardes
    .map((v, i) => {
      const x = (i / (n - 1)) * w;
      const y = h - ((v - min) / (maks - min)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export async function renderGrafiekPng(opsies: GrafiekOpsies): Promise<Buffer> {
  const [medium, bold] = await Promise.all([
    readFile(path.join(process.cwd(), "assets/LeagueSpartan-500.ttf")),
    readFile(path.join(process.cwd(), "assets/LeagueSpartan-700.ttf")),
  ]);
  const isPoskaart = opsies.raam === "poskaart";
  const datumWoorde = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${opsies.datum}T12:00:00Z`));

  // Plot-afmetings binne die kaart
  const plotW = isPoskaart ? 1280 : 1360;
  const plotH = isPoskaart ? 430 : 560;

  let inhoud: ReactNode;

  if (opsies.tipe === "staaf") {
    // Periode-% as vertikale stawe
    const stawe = opsies.reekse.map((r, i) => ({
      naam: r.naam,
      simbool: r.simbool,
      kleur: LYN_KLEURE[i % LYN_KLEURE.length],
      persent: r.punte.length > 1 ? ((r.punte[r.punte.length - 1].p - r.punte[0].p) / r.punte[0].p) * 100 : 0,
    }));
    const maksAbs = Math.max(...stawe.map((s) => Math.abs(s.persent)), 1);
    inhoud = (
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 48, width: plotW, height: plotH }}>
        {stawe.map((s) => {
          const hoogte = Math.max(14, (Math.abs(s.persent) / maksAbs) * (plotH - 130));
          return (
            <div key={s.simbool} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: s.persent >= 0 ? "#0E8345" : "#F03028" }}>
                {formateerWaarde(s.persent)}
              </div>
              <div style={{ display: "flex", width: 110, height: hoogte, backgroundColor: s.kleur }} />
              <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#1A1A1A" }}>{s.simbool.replace(".JO", "")}</div>
              {s.naam && s.naam !== s.simbool ? (
                <div style={{ display: "flex", fontSize: 20, fontWeight: 500, color: "#575652" }}>{s.naam.slice(0, 18)}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  } else {
    const { reekse, min, maks, ruite, persent } = bouPlot(opsies);
    const eerste = opsies.reekse[0]?.punte ?? [];
    const xEtikette = [0, 0.25, 0.5, 0.75, 1]
      .map((f) => eerste[Math.round(f * (eerste.length - 1))])
      .filter(Boolean)
      .map((p) => asDatum(p.t));
    const nulY = persent ? plotH - ((0 - min) / (maks - min)) * plotH : null;
    inhoud = (
      <div style={{ display: "flex", flexDirection: "column", width: plotW }}>
        <div style={{ display: "flex", width: plotW, height: plotH, position: "relative" }}>
          {/* ruitlyn-etikette + lyne */}
          {ruite.map((r, i) => {
            const y = plotH - ((r - min) / (maks - min)) * plotH;
            return (
              <div key={i} style={{ position: "absolute", top: y - 12, left: 0, width: plotW, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", width: 96, fontSize: 20, fontWeight: 500, color: "#57565299", justifyContent: "flex-end" }}>
                  {formateerWaarde(r, persent ? undefined : opsies.geldeenheid)}
                </div>
                <div style={{ display: "flex", flex: 1, height: 1, backgroundColor: "#1A1A1A14" }} />
              </div>
            );
          })}
          <svg
            width={plotW - 116}
            height={plotH}
            viewBox={`0 0 ${plotW - 116} ${plotH}`}
            style={{ position: "absolute", top: 0, left: 106 }}
          >
            {nulY != null ? (
              <path d={`M0,${nulY} L${plotW - 116},${nulY}`} stroke="#1A1A1A66" strokeWidth={2} strokeDasharray="2 8" fill="none" />
            ) : null}
            {reekse.map((r, i) => (
              <path
                key={r.simbool}
                d={lynPad(r.waardes, min, maks, plotW - 116, plotH)}
                stroke={LYN_KLEURE[i % LYN_KLEURE.length]}
                strokeWidth={5}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 106, paddingTop: 14 }}>
          {xEtikette.map((e, i) => (
            <div key={i} style={{ display: "flex", fontSize: 20, fontWeight: 500, color: "#57565299" }}>
              {e}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const legende =
    opsies.tipe !== "staaf" ? (
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {opsies.reekse.map((r, i) => (
          <div
            key={r.simbool}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "2px solid #1A1A1A",
              backgroundColor: "#F7F6F2",
              padding: "8px 16px",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            <div style={{ display: "flex", width: 18, height: 18, backgroundColor: LYN_KLEURE[i % LYN_KLEURE.length] }} />
            {r.simbool.replace(".JO", "")}
            {r.naam && r.naam !== r.simbool ? (
              <div style={{ display: "flex", fontWeight: 500, color: "#575652", fontSize: 20 }}>{r.naam.slice(0, 22)}</div>
            ) : null}
          </div>
        ))}
      </div>
    ) : null;

  const res = new ImageResponse(
    isPoskaart ? (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#EBEAE6",
          padding: 44,
          fontFamily: "LeagueSpartan",
          color: "#1A1A1A",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, border: "6px solid #1A1A1A", backgroundColor: "#F7F6F2", padding: "36px 44px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.05 }}>{opsies.opskrif}</div>
              {opsies.subtitel ? (
                <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: "#575652" }}>{opsies.subtitel}</div>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: 4 }}>BUITELYN</div>
              <div style={{ display: "flex", width: 28, height: 28, borderRadius: 999, backgroundColor: "#F03028" }} />
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", marginTop: 10 }}>{inhoud}</div>
          {legende ? <div style={{ display: "flex", marginTop: 8 }}>{legende}</div> : null}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "3px solid #1A1A1A",
              paddingTop: 16,
              marginTop: 16,
              fontSize: 22,
              fontWeight: 500,
              color: "#575652",
            }}
          >
            <div style={{ display: "flex" }}>{datumWoorde} · data ±15 min vertraag</div>
            <div style={{ display: "flex", fontWeight: 700, color: "#1A1A1A" }}>buitelyn.com/markte</div>
          </div>
        </div>
      </div>
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F7F6F2",
          padding: 56,
          fontFamily: "LeagueSpartan",
          color: "#1A1A1A",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700, lineHeight: 1.05 }}>{opsies.opskrif}</div>
            {opsies.subtitel ? (
              <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: "#575652" }}>{opsies.subtitel}</div>
            ) : null}
          </div>
          {legende}
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>{inhoud}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 500, color: "#57565299" }}>
          <div style={{ display: "flex" }}>{datumWoorde} · data ±15 min vertraag</div>
          <div style={{ display: "flex", fontWeight: 700, color: "#1A1A1A" }}>buitelyn.com/markte</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "LeagueSpartan", data: medium, weight: 500 },
        { name: "LeagueSpartan", data: bold, weight: 700 },
      ],
    }
  );
  return Buffer.from(await res.arrayBuffer());
}
