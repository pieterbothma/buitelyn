import React from "react";
import { AbsoluteFill, random } from "remotion";
import { COLORS, PRESENTERS, VIDEO } from "../config";
import { fontFamily } from "../fonts";
import { Arrow } from "./Arrow";

export type TextureMode = "sections" | "numbers" | "tickers" | "wall";

const LETTERS = ["B", "S", "ET", "P", "Q", "W", "V", "M", "Z", "N"];
const SECTIONS = [
  "POLITIEK",
  "MARKTE",
  "SPORT",
  "TEGNOLOGIE",
  "EIENDOM",
  "BUITELAND",
  "MENINGS",
  "RAND",
  "JSE",
  "GOUD",
];
const NUMBERS = [
  "+1,2%",
  "-0,8%",
  "18,42",
  "12 450",
  "+0,4%",
  "R",
  "%",
  "-1,3%",
  "+2,1%",
  "98,7",
];
export const TICKERS = [
  { label: "JSE", up: true, value: "+1,2%" },
  { label: "R/$", up: false, value: "18,42" },
  { label: "GOUD", up: true, value: "+0,4%" },
  { label: "BRENT", up: false, value: "-0,7%" },
  { label: "MTN", up: true, value: "+2,1%" },
  { label: "NPN", up: false, value: "-1,3%" },
];
const NAMES = ["Buitelyn", ...PRESENTERS.map((p) => p.lines.join(" "))];

type Kind = "letter" | "section" | "number" | "ticker" | "name";

// Per-mode weighted pools — the background story arc:
// sections (newspaper) → numbers (data creeps in) → tickers (markets live) → wall (everything).
const MODE_KINDS: Record<TextureMode, [Kind, number][]> = {
  sections: [
    ["section", 0.6],
    ["letter", 0.25],
    ["name", 0.15],
  ],
  numbers: [
    ["number", 0.55],
    ["letter", 0.25],
    ["section", 0.2],
  ],
  tickers: [
    ["ticker", 0.45],
    ["section", 0.3],
    ["number", 0.25],
  ],
  wall: [
    ["letter", 0.3],
    ["section", 0.25],
    ["number", 0.2],
    ["ticker", 0.15],
    ["name", 0.1],
  ],
};

const pickKind = (mode: TextureMode, r: number): Kind => {
  let acc = 0;
  for (const [kind, weight] of MODE_KINDS[mode]) {
    acc += weight;
    if (r < acc) {
      return kind;
    }
  }
  return MODE_KINDS[mode][0][0];
};

const pick = <T,>(arr: T[], r: number): T => arr[Math.floor(r * arr.length)];

const Item: React.FC<{ kind: Kind; rGlyph: number; rSize: number }> = ({
  kind,
  rGlyph,
  rSize,
}) => {
  switch (kind) {
    case "letter":
      return (
        <span style={{ fontWeight: 700, fontSize: 90 + rSize * 320 }}>
          {pick(LETTERS, rGlyph)}
        </span>
      );
    case "section":
      return (
        <span
          style={{
            fontWeight: 700,
            fontSize: 36 + rSize * 84,
            letterSpacing: "0.08em",
          }}
        >
          {pick(SECTIONS, rGlyph)}
        </span>
      );
    case "number":
      return (
        <span style={{ fontWeight: 700, fontSize: 40 + rSize * 140 }}>
          {pick(NUMBERS, rGlyph)}
        </span>
      );
    case "ticker": {
      const t = pick(TICKERS, rGlyph);
      const size = 30 + rSize * 34;
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: size * 0.35,
            fontWeight: 700,
            fontSize: size,
          }}
        >
          {t.label}
          <Arrow up={t.up} size={size * 0.55} />
          {t.value}
        </div>
      );
    }
    case "name":
      return (
        <span style={{ fontWeight: 400, fontSize: 24 + rSize * 24 }}>
          {pick(NAMES, rGlyph)}
        </span>
      );
  }
};

export const TypeTexture: React.FC<{
  seed: string;
  mode?: TextureMode;
  count?: number;
  drift?: number;
  opacity?: number;
}> = ({ seed, mode = "wall", count = 36, drift = 0, opacity = 0.12 }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    {Array.from({ length: count }, (_, i) => {
      const rx = random(`${seed}-x-${i}`);
      const ry = random(`${seed}-y-${i}`);
      const rs = random(`${seed}-s-${i}`);
      const rg = random(`${seed}-g-${i}`);
      const rk = random(`${seed}-k-${i}`);
      const kind = pickKind(mode, rk);
      const span = VIDEO.height + 240;
      const top = ((((ry * span + drift) % span) + span) % span) - 120;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: rx * VIDEO.width - 120,
            top,
            fontFamily,
            color: COLORS.ink,
            opacity,
            whiteSpace: "nowrap",
          }}
        >
          <Item kind={kind} rGlyph={rg} rSize={rs} />
        </div>
      );
    })}
  </AbsoluteFill>
);
