import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { beatPulse, COLORS, SCENES } from "../config";
import { fontFamily } from "../fonts";
import { PaperGrid } from "../components/PaperGrid";
import { PrintMarks } from "../components/PrintMarks";
import { TypeTexture } from "../components/TypeTexture";
import { LogoBox } from "../components/LogoBox";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene6Resolve: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const guides = interpolate(frame, [0, 40], [0, 1], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const pop = spring({
    frame: frame - 20,
    fps,
    config: { damping: 12, mass: 0.9, stiffness: 120 },
  });
  // Slow push-in over the long hold keeps the final scene alive.
  const zoom = interpolate(frame, [0, SCENES.resolve.duration], [1, 1.05]);
  const dotScale = beatPulse(frame + SCENES.resolve.from, 0.35);
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <PaperGrid />
      <TypeTexture seed="scene6" mode="wall" count={54} opacity={0.16} />
      <PrintMarks />
      <div
        style={{
          position: "absolute",
          left: 220,
          top: 120,
          fontFamily,
          fontWeight: 700,
          fontSize: 640,
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: `3px ${COLORS.ink}`,
          opacity: guides * 0.7,
        }}
      >
        B
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[
          { cx: 480, cy: 320, r: 150 },
          { cx: 480, cy: 620, r: 185 },
        ].map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="none"
            stroke={COLORS.ink}
            strokeWidth={2}
            strokeOpacity={0.5}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - guides}
          />
        ))}
        <line
          x1={240}
          y1={140}
          x2={720}
          y2={800}
          stroke={COLORS.ink}
          strokeWidth={1.5}
          strokeOpacity={0.4 * guides}
        />
        <line
          x1={720}
          y1={140}
          x2={240}
          y2={800}
          stroke={COLORS.ink}
          strokeWidth={1.5}
          strokeOpacity={0.4 * guides}
        />
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${pop})` }}>
          <LogoBox width={460} dotScale={dotScale} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
