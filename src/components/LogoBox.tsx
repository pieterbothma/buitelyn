import React from "react";
import { COLORS } from "../config";
import { Wordmark } from "./Wordmark";

const seg = (p: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (p - a) / (b - a)));

// Final logo lock-up, matching the square brand mark: wordmark sits on the
// bottom edge (descender crossing the border), red dot top-right inside.
// boxDraw 0→1 draws the border of the wide banner; grow 0→1 stretches it
// upward into the square; the dot arrives after (dotScale/dotOpacity).
export const LogoBox: React.FC<{
  width?: number;
  grow?: number;
  boxDraw?: number;
  textIn?: number;
  dotScale?: number;
  dotOpacity?: number;
}> = ({
  width = 420,
  grow = 1,
  boxDraw = 1,
  textIn = 1,
  dotScale = 1,
  dotOpacity = 1,
}) => {
  const height = width * (0.36 + grow * 0.64);
  const b = Math.max(4, width * 0.016);
  const edge: React.CSSProperties = {
    position: "absolute",
    backgroundColor: COLORS.ink,
  };
  return (
    <div style={{ width, height, position: "relative" }}>
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
          left: width * 0.06,
          bottom: -width * 0.025,
          opacity: textIn,
        }}
      >
        <Wordmark fontSize={width * 0.205} />
      </div>
      <div style={{ ...edge, left: 0, top: 0, height: b, width: `${seg(boxDraw, 0, 0.25) * 100}%` }} />
      <div style={{ ...edge, right: 0, top: 0, width: b, height: `${seg(boxDraw, 0.25, 0.5) * 100}%` }} />
      <div style={{ ...edge, right: 0, bottom: 0, height: b, width: `${seg(boxDraw, 0.5, 0.75) * 100}%` }} />
      <div style={{ ...edge, left: 0, bottom: 0, width: b, height: `${seg(boxDraw, 0.75, 1) * 100}%` }} />
      <div
        style={{
          position: "absolute",
          top: width * 0.06,
          right: width * 0.06,
          width: width * 0.07,
          height: width * 0.07,
          borderRadius: "50%",
          backgroundColor: COLORS.red,
          transform: `scale(${dotScale})`,
          opacity: dotOpacity,
        }}
      />
    </div>
  );
};
