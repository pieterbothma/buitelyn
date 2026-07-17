import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SCENES } from "../config";
import { PaperGrid } from "../components/PaperGrid";
import { PrintMarks } from "../components/PrintMarks";
import { TypeTexture } from "../components/TypeTexture";
import { FrontPage } from "../components/FrontPage";
import { LogoBox } from "../components/LogoBox";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene6Resolve: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Classic spinning-newspaper arrival, settling with a slight editorial tilt.
  const spin = spring({
    frame,
    fps,
    config: { damping: 16, mass: 1, stiffness: 60 },
  });
  const rotation = interpolate(spin, [0, 1], [-900, -3]);
  const pageScale = Math.max(0.001, spin);

  // Logo builds itself: border draws wide, box grows tall into the square
  // mark, and only then does the REC light come on — we're filming now.
  const boxDraw = interpolate(frame, [34, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const textIn = interpolate(frame, [54, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const grow = spring({
    frame: frame - 74,
    fps,
    config: { damping: 15, mass: 0.9, stiffness: 90 },
  });
  const dotPop = spring({
    frame: frame - 104,
    fps,
    config: { damping: 10, mass: 0.6, stiffness: 200 },
  });
  // Flickering REC light: seeded per 3-frame bucket, mostly on.
  const dotBlink =
    frame < 112 ? 1 : random(`rec-${Math.floor(frame / 3)}`) > 0.28 ? 1 : 0.35;

  // Slow push-in keeps the long hold alive.
  const zoom = interpolate(frame, [0, SCENES.resolve.duration], [1, 1.05]);

  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <PaperGrid />
      <TypeTexture seed="scene6" mode="wall" count={44} opacity={0.13} />
      <PrintMarks />
      <div
        style={{
          position: "absolute",
          left: 190,
          top: 60,
          transform: `rotate(${rotation}deg) scale(${pageScale})`,
        }}
      >
        <FrontPage width={700} />
      </div>
      {/* bottom-anchored so the box grows upward into the square */}
      <div
        style={{
          position: "absolute",
          left: 1150,
          bottom: 270,
        }}
      >
        <LogoBox
          width={520}
          grow={grow}
          boxDraw={boxDraw}
          textIn={textIn}
          dotScale={dotPop}
          dotOpacity={dotBlink}
        />
      </div>
    </AbsoluteFill>
  );
};
