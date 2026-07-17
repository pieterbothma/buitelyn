import React from "react";
import { COLORS } from "../config";
import { Wordmark } from "./Wordmark";

const seg = (p: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (p - a) / (b - a)));

// Final logo lock-up. The box border draws itself clockwise (boxDraw 0→1),
// the wordmark settles in (textIn), then the red dot arrives like a camera's
// REC light (dotScale to pop it, dotOpacity to blink it).
export const LogoBox: React.FC<{
  width?: number;
  boxDraw?: number;
  textIn?: number;
  dotScale?: number;
  dotOpacity?: number;
}> = ({ width = 420, boxDraw = 1, textIn = 1, dotScale = 1, dotOpacity = 1 }) => {
  const height = width * 0.36;
  const b = Math.max(4, width * 0.018);
  const edge: React.CSSProperties = {
    position: "absolute",
    backgroundColor: COLORS.ink,
  };
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: COLORS.offWhite,
          opacity: Math.min(1, boxDraw * 1.5),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: textIn,
        }}
      >
        <Wordmark fontSize={width * 0.16} />
      </div>
      <div style={{ ...edge, left: 0, top: 0, height: b, width: `${seg(boxDraw, 0, 0.25) * 100}%` }} />
      <div style={{ ...edge, right: 0, top: 0, width: b, height: `${seg(boxDraw, 0.25, 0.5) * 100}%` }} />
      <div style={{ ...edge, right: 0, bottom: 0, height: b, width: `${seg(boxDraw, 0.5, 0.75) * 100}%` }} />
      <div style={{ ...edge, left: 0, bottom: 0, width: b, height: `${seg(boxDraw, 0.75, 1) * 100}%` }} />
      <div
        style={{
          position: "absolute",
          top: height * 0.13,
          right: width * 0.055,
          width: width * 0.05,
          height: width * 0.05,
          borderRadius: "50%",
          backgroundColor: COLORS.red,
          transform: `scale(${dotScale})`,
          opacity: dotOpacity,
        }}
      />
    </div>
  );
};
