import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, PRESENTERS } from "../config";
import { PaperGrid } from "../components/PaperGrid";
import { PrintMarks } from "../components/PrintMarks";
import { TypeTexture } from "../components/TypeTexture";
import { TickerStrip } from "../components/TickerStrip";
import { NameCard } from "./NameCard";

// Continue the ticker scroll seamlessly from where Scene 4 leaves off.
const SCENE5_TICKER_PHASE = 58;

export const Scene5Card2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.9 } });
  return (
    <AbsoluteFill>
      <PaperGrid />
      <TypeTexture
        seed="scene5"
        mode="tickers"
        count={34}
        drift={frame * 0.8}
        opacity={0.16}
      />
      <PrintMarks />
      <TickerStrip offset={(frame + SCENE5_TICKER_PHASE) * 2.2} />
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
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
