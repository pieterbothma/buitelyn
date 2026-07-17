import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { PaperGrid } from "../components/PaperGrid";
import { PrintMarks } from "../components/PrintMarks";
import { TypeTexture } from "../components/TypeTexture";
import { Spirograph } from "../components/Spirograph";
import { RedDot } from "../components/RedDot";
import { Wordmark } from "../components/Wordmark";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene2Spirograph: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 56], [0, 1], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const wordX = interpolate(frame, [8, 60], [1150, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const orbit = interpolate(frame, [0, 60], [Math.PI * 1.6, Math.PI * -0.25], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const dotX = 960 + Math.cos(orbit) * 450;
  const dotY = 480 + Math.sin(orbit) * 450;
  return (
    <AbsoluteFill>
      <PaperGrid />
      <TypeTexture
        seed="scene2"
        mode="sections"
        count={16}
        drift={frame * 0.5}
        opacity={0.09}
      />
      <PrintMarks />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: `translateX(${wordX}px)`,
        }}
      >
        <Wordmark fontSize={170} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Spirograph size={780} progress={draw} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: dotX - 28, top: dotY - 28 }}>
        <RedDot size={56} />
      </div>
    </AbsoluteFill>
  );
};
