import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

// Fade-to-black overlay riding on top of the resolve while the music decays.
export const Scene7Out: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 26], [0, 1], {
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ backgroundColor: "#000000", opacity }} />;
};
