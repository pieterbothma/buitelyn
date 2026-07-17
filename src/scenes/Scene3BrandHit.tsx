import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../config";
import { PaperGrid } from "../components/PaperGrid";
import { Wordmark } from "../components/Wordmark";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

const seg = (p: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (p - a) / (b - a)));

export const Scene3BrandHit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const circle = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const boxDraw = interpolate(frame, [16, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <AbsoluteFill>
      <PaperGrid />
      <div
        style={{
          position: "absolute",
          left: "60%",
          top: "50%",
          width: 560,
          height: 560,
          borderRadius: "50%",
          backgroundColor: COLORS.red,
          transform: `translate(-50%, -50%) scale(${circle})`,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", padding: "60px 80px" }}>
          <Wordmark fontSize={210} />
          {/* box draws clockwise from top-left: top → right → bottom → left */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: 6,
              width: `${seg(boxDraw, 0, 0.25) * 100}%`,
              backgroundColor: COLORS.ink,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 6,
              height: `${seg(boxDraw, 0.25, 0.5) * 100}%`,
              backgroundColor: COLORS.ink,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              height: 6,
              width: `${seg(boxDraw, 0.5, 0.75) * 100}%`,
              backgroundColor: COLORS.ink,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 6,
              height: `${seg(boxDraw, 0.75, 1) * 100}%`,
              backgroundColor: COLORS.ink,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
