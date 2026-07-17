import React from "react";
import { AbsoluteFill, random } from "remotion";
import { COLORS, PRESENTERS, VIDEO } from "../config";
import { fontFamily } from "../fonts";

const GLYPHS = [
  "B",
  "S",
  "ET",
  "P",
  "Q",
  "W",
  "V",
  "M",
  "Z",
  "N",
  "Buitelyn",
  ...PRESENTERS.map((p) => p.lines.join(" ")),
];

export const TypeTexture: React.FC<{
  seed: string;
  count?: number;
  drift?: number;
  opacity?: number;
}> = ({ seed, count = 36, drift = 0, opacity = 0.12 }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    {Array.from({ length: count }, (_, i) => {
      const rx = random(`${seed}-x-${i}`);
      const ry = random(`${seed}-y-${i}`);
      const rs = random(`${seed}-s-${i}`);
      const rg = random(`${seed}-g-${i}`);
      const glyph = GLYPHS[Math.floor(rg * GLYPHS.length)];
      const big = glyph.length <= 2;
      const size = big ? 90 + rs * 320 : 22 + rs * 26;
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
            fontWeight: rs > 0.6 ? 700 : 400,
            fontSize: size,
            color: COLORS.ink,
            opacity,
            whiteSpace: "nowrap",
          }}
        >
          {glyph}
        </div>
      );
    })}
  </AbsoluteFill>
);
