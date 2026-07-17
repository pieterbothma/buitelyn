import React from "react";
import { COLORS } from "../config";
import { fontFamily } from "../fonts";
import { Arrow } from "./Arrow";
import { TICKERS } from "./TypeTexture";

const Entry: React.FC<{ label: string; up: boolean; value: string }> = ({
  label,
  up,
  value,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      fontFamily,
      fontWeight: 700,
      fontSize: 30,
      color: COLORS.ink,
      letterSpacing: "0.04em",
    }}
  >
    {label}
    <Arrow up={up} size={17} />
    <span style={{ color: up ? COLORS.green : COLORS.red }}>{value}</span>
  </div>
);

export const TickerStrip: React.FC<{ offset: number }> = ({ offset }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 60,
      borderTop: `3px solid ${COLORS.ink}`,
      borderBottom: `3px solid ${COLORS.ink}`,
      backgroundColor: COLORS.paper,
      overflow: "hidden",
      padding: "16px 0",
    }}
  >
    <div
      style={{
        display: "flex",
        gap: 80,
        transform: `translateX(${-offset}px)`,
        whiteSpace: "nowrap",
        width: "max-content",
      }}
    >
      {[0, 1, 2].flatMap((rep) =>
        TICKERS.map((t, i) => (
          <Entry key={`${rep}-${i}`} label={t.label} up={t.up} value={t.value} />
        ))
      )}
    </div>
  </div>
);
