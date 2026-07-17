import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
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

  // Logo builds itself, then the REC light comes on: we're filming now.
  const boxDraw = interpolate(frame, [34, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const textIn = interpolate(frame, [60, 76], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dotPop = spring({
    frame: frame - 84,
    fps,
    config: { damping: 10, mass: 0.6, stiffness: 200 },
  });
  // Steady REC blink once it has landed: ~20 frames on, 8 off.
  const dotBlink = frame < 100 ? 1 : frame % 28 < 20 ? 1 : 0.3;

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
      <div
        style={{
          position: "absolute",
          left: 1120,
          top: 460,
        }}
      >
        <LogoBox
          width={560}
          boxDraw={boxDraw}
          textIn={textIn}
          dotScale={dotPop}
          dotOpacity={dotBlink}
        />
      </div>
    </AbsoluteFill>
  );
};
