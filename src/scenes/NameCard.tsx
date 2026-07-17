import React from "react";
import { COLORS } from "../config";
import { fontFamily } from "../fonts";

export const NameCard: React.FC<{
  lines: string[];
  dark?: boolean;
  fontSize?: number;
}> = ({ lines, dark = false, fontSize = 88 }) => (
  <div
    style={{
      fontFamily,
      fontWeight: 700,
      fontSize,
      lineHeight: 1.04,
      letterSpacing: "-0.02em",
      color: dark ? COLORS.offWhite : COLORS.ink,
      textAlign: "center",
    }}
  >
    {lines.map((line) => (
      <div key={line}>{line}</div>
    ))}
  </div>
);
