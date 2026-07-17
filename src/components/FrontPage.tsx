import React from "react";
import { random } from "remotion";
import { COLORS } from "../config";
import { fontFamily } from "../fonts";
import { Arrow } from "./Arrow";
import { TICKERS } from "./TypeTexture";

const Greek: React.FC<{ seed: string; lines: number }> = ({ seed, lines }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        style={{
          height: 7,
          width: `${
            i === lines - 1 ? 40 : 72 + random(`${seed}-${i}`) * 28
          }%`,
          backgroundColor: COLORS.ink,
          opacity: 0.18,
        }}
      />
    ))}
  </div>
);

// Procedural "Die Buitelyn" front page for the spinning-newspaper resolve.
export const FrontPage: React.FC<{ width?: number }> = ({ width = 720 }) => {
  const height = width * 1.38;
  const pad = width * 0.055;
  const rule = (h: number): React.CSSProperties => ({
    height: h,
    backgroundColor: COLORS.ink,
  });
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: COLORS.offWhite,
        border: `3px solid ${COLORS.ink}`,
        boxShadow: "0 18px 60px rgba(26,26,26,0.18)",
        padding: pad,
        display: "flex",
        flexDirection: "column",
        gap: width * 0.022,
        fontFamily,
        color: COLORS.ink,
        position: "relative",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: width * 0.115,
          textAlign: "center",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        Die Buitelyn
      </div>
      <div style={rule(3)} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 600,
          fontSize: width * 0.024,
          letterSpacing: "0.22em",
        }}
      >
        <span>EERSTE UITGAWE</span>
        <span>VANDAG</span>
        <span>BL. 1</span>
      </div>
      <div style={rule(2)} />
      <div
        style={{
          fontWeight: 800,
          fontSize: width * 0.085,
          lineHeight: 1.04,
          letterSpacing: "-0.01em",
          textTransform: "uppercase",
        }}
      >
        Vandag op
        <br />
        Die Buitelyn
      </div>
      <div
        style={{
          fontWeight: 600,
          fontSize: width * 0.026,
          letterSpacing: "0.18em",
          opacity: 0.7,
        }}
      >
        MARKTE · POLITIEK · SPORT · TEGNOLOGIE
      </div>
      <div style={rule(2)} />
      <div style={{ display: "flex", gap: pad * 0.8, flex: 1 }}>
        <Greek seed="col1" lines={14} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {/* "photo" block carrying the brand mark */}
          <div
            style={{
              height: width * 0.28,
              border: `3px solid ${COLORS.ink}`,
              position: "relative",
              backgroundColor: COLORS.paper,
            }}
          >
            <div
              style={{
                position: "absolute",
                right: "14%",
                top: "18%",
                width: width * 0.07,
                height: width * 0.07,
                borderRadius: "50%",
                backgroundColor: COLORS.red,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "10%",
                bottom: "12%",
                fontWeight: 700,
                fontSize: width * 0.045,
                letterSpacing: "-0.03em",
              }}
            >
              Buitelyn
            </div>
          </div>
          <Greek seed="col2" lines={8} />
        </div>
        <Greek seed="col3" lines={14} />
      </div>
      <div style={rule(2)} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 700,
          fontSize: width * 0.026,
        }}
      >
        {TICKERS.slice(0, 4).map((t) => (
          <div
            key={t.label}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            {t.label}
            <Arrow up={t.up} size={width * 0.016} />
            <span style={{ color: t.up ? COLORS.green : COLORS.red }}>
              {t.value}
            </span>
          </div>
        ))}
      </div>
      {/* centre fold crease */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 2,
          backgroundColor: COLORS.ink,
          opacity: 0.14,
        }}
      />
    </div>
  );
};
