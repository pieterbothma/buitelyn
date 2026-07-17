import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, PRESENTERS } from "../config";
import { PaperGrid } from "../components/PaperGrid";
import { TypeTexture } from "../components/TypeTexture";
import { Sparkle } from "../components/Sparkle";
import { NameCard } from "./NameCard";

export const Scene5Card2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.9 } });
  const glint = interpolate(frame, [10, 20, 32], [0, 1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <PaperGrid />
      <TypeTexture seed="scene5" count={44} drift={frame * 0.8} opacity={0.16} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            width: 760,
            height: 400,
            backgroundColor: COLORS.ink,
            border: `10px solid ${COLORS.ink}`,
            boxShadow: `inset 0 0 0 6px ${COLORS.offWhite}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${0.85 + enter * 0.15}) translateY(${(1 - enter) * 60}px)`,
            opacity: Math.min(1, enter * 2),
          }}
        >
          <NameCard lines={PRESENTERS[1].lines} dark fontSize={76} />
          <div
            style={{
              position: "absolute",
              top: 18,
              right: 26,
              transform: `scale(${glint})`,
            }}
          >
            <Sparkle size={44} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
