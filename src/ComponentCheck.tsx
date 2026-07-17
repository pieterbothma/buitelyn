import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "./config";
import { fontFamily } from "./fonts";
import { PaperGrid } from "./components/PaperGrid";
import { Wordmark } from "./components/Wordmark";
import { RedDot } from "./components/RedDot";
import { Sparkle } from "./components/Sparkle";
import { LogoBox } from "./components/LogoBox";
import { Spirograph } from "./components/Spirograph";
import { TypeTexture } from "./components/TypeTexture";
import { MosaicCard } from "./components/MosaicCard";

export const ComponentCheck: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <PaperGrid />
      <TypeTexture seed="check" opacity={0.1} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "space-evenly",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-evenly",
          }}
        >
          <Wordmark fontSize={120} />
          <RedDot size={64} />
          <div style={{ backgroundColor: COLORS.ink, padding: 20 }}>
            <Sparkle size={48} />
          </div>
          <LogoBox width={380} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-evenly",
          }}
        >
          <Spirograph size={360} progress={progress} />
          <MosaicCard
            progress={progress}
            width={420}
            height={220}
            background={COLORS.offWhite}
          >
            <div
              style={{
                fontFamily,
                fontWeight: 700,
                fontSize: 48,
                color: COLORS.ink,
              }}
            >
              Suzaan Steyn
            </div>
          </MosaicCard>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
