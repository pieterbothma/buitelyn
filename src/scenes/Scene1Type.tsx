import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
} from "remotion";
import { COLORS } from "../config";
import { fontFamily } from "../fonts";
import { PaperGrid } from "../components/PaperGrid";
import { PrintMarks } from "../components/PrintMarks";
import { TypeTexture } from "../components/TypeTexture";
import { Globe } from "../components/Globe";

const WORD = "Buitelyn";
const TYPE_START = 14;
const CHAR_FRAMES = 8;
const FONT_SIZE = 210;

// Where the red circle lives in Scene3BrandHit — the globe turns here, and
// the drop detonates the red circle exactly over it.
export const CIRCLE_X = 1920 * 0.6;
export const CIRCLE_Y = 1080 * 0.5;
export const CIRCLE_SIZE = 560;

export const Scene1Type: React.FC = () => {
  const frame = useCurrentFrame();

  // Irregular typewriter rhythm — each character lands with seeded jitter.
  const typedCount = WORD.split("").filter((_, i) => {
    const at = TYPE_START + i * CHAR_FRAMES + Math.floor(random(`type-${i}`) * 5);
    return frame >= at;
  }).length;
  const cursorVisible = Math.floor(frame / 8) % 2 === 0;

  // The clean page gains its grid + newsprint texture as the music builds.
  const gridIn = interpolate(frame, [24, 64], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The world starts turning behind the headline.
  const globeDraw = interpolate(frame, [26, 84], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.offWhite }}>
      <AbsoluteFill style={{ opacity: gridIn }}>
        <PaperGrid />
        <TypeTexture
          seed="scene1"
          mode="sections"
          count={16}
          drift={frame * 0.5}
          opacity={0.09}
        />
        <PrintMarks />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: CIRCLE_X - CIRCLE_SIZE / 2,
          top: CIRCLE_Y - CIRCLE_SIZE / 2,
        }}
      >
        <Globe size={CIRCLE_SIZE} rotation={frame * 1.3} progress={globeDraw} />
      </div>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            fontFamily,
            fontWeight: 700,
            fontSize: FONT_SIZE,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: COLORS.ink,
          }}
        >
          {/* invisible full word reserves the final centered width */}
          <span style={{ opacity: 0 }}>{WORD}</span>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span>{WORD.slice(0, typedCount)}</span>
            <div
              style={{
                width: 12,
                height: FONT_SIZE * 0.78,
                marginLeft: 14,
                backgroundColor: COLORS.ink,
                opacity: cursorVisible ? 1 : 0,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
