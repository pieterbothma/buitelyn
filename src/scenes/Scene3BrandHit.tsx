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
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
          >
            <rect
              x={0}
              y={0}
              width={100}
              height={100}
              fill="none"
              stroke={COLORS.ink}
              strokeWidth={6}
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - boxDraw}
            />
          </svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
