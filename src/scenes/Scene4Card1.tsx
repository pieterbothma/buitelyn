import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, PRESENTERS } from "../config";
import { PaperGrid } from "../components/PaperGrid";
import { PrintMarks } from "../components/PrintMarks";
import { TypeTexture } from "../components/TypeTexture";
import { TickerStrip } from "../components/TickerStrip";
import { MosaicCard } from "../components/MosaicCard";
import { NameCard } from "./NameCard";

export const Scene4Card1: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 26], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <PaperGrid />
      <TypeTexture
        seed="scene4"
        mode="tickers"
        count={20}
        drift={frame * 1.4}
        opacity={0.16}
      />
      <PrintMarks />
      <TickerStrip offset={frame * 2.2} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <MosaicCard
          progress={progress}
          width={720}
          height={380}
          background={COLORS.offWhite}
          seed="card1"
        >
          <NameCard lines={PRESENTERS[0].lines} />
        </MosaicCard>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
