import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../config";
import { Wordmark } from "../components/Wordmark";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene1Tease: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 26], [0, 100], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const cursorDown = interpolate(frame, [10, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const lip = interpolate(frame, [24, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.offWhite,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative" }}>
        <div style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
          <Wordmark fontSize={200} />
        </div>
        <div
          style={{
            position: "absolute",
            right: -44,
            top: -10,
            width: 7,
            height: `${cursorDown * 115}%`,
            backgroundColor: COLORS.ink,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -44,
            bottom: -26,
            height: 7,
            width: `${lip * 48}%`,
            backgroundColor: COLORS.ink,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
