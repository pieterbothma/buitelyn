import React from "react";
import { interpolate, random } from "remotion";

export const MosaicCard: React.FC<{
  progress: number;
  width: number;
  height: number;
  background: string;
  rows?: number;
  cols?: number;
  seed?: string;
  children: React.ReactNode;
}> = ({
  progress,
  width,
  height,
  background,
  rows = 4,
  cols = 6,
  seed = "mosaic",
  children,
}) => {
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const delay = random(`${seed}-${i}`) * 0.5;
      tiles.push(
        <div
          key={i}
          style={{
            position: "absolute",
            left: (c * width) / cols,
            top: (r * height) / rows,
            width: width / cols + 1,
            height: height / rows + 1,
            backgroundColor: background,
            opacity: progress > delay ? 1 : 0,
          }}
        />
      );
    }
  }
  const contentOpacity = interpolate(progress, [0.5, 0.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "relative", width, height }}>
      {tiles}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: contentOpacity,
        }}
      >
        {children}
      </div>
    </div>
  );
};
