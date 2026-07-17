import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../config";
import { Wordmark } from "../components/Wordmark";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene1Tease: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 18], [0, 100], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const draw = interpolate(frame, [6, 26], [0, 1], {
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
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <path
            d="M 103 -4 L 103 112 L 55 112"
            fill="none"
            stroke={COLORS.ink}
            strokeWidth={7}
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
