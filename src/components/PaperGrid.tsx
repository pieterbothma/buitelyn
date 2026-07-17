import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, VIDEO } from "../config";

const CELL = 96;

export const PaperGrid: React.FC<{ background?: string }> = ({
  background = COLORS.paper,
}) => {
  const { width: w, height: h } = VIDEO;
  const lines: React.ReactNode[] = [];
  for (let x = CELL; x < w; x += CELL) {
    lines.push(
      <line
        key={`v${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={h}
        stroke={COLORS.ink}
        strokeOpacity={0.07}
        strokeWidth={1.5}
      />
    );
  }
  for (let y = CELL; y < h; y += CELL) {
    lines.push(
      <line
        key={`h${y}`}
        x1={0}
        y1={y}
        x2={w}
        y2={y}
        stroke={COLORS.ink}
        strokeOpacity={0.07}
        strokeWidth={1.5}
      />
    );
  }
  const guides: [number, number, number, number][] = [
    [0, h, w * 0.5, h * 0.42],
    [w, h, w * 0.5, h * 0.42],
    [0, h * 0.78, w * 0.5, h * 0.42],
    [w, h * 0.78, w * 0.5, h * 0.42],
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <svg width={w} height={h}>
        {lines}
        {guides.map(([x1, y1, x2, y2], i) => (
          <line
            key={`g${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={COLORS.ink}
            strokeOpacity={0.05}
            strokeWidth={1.5}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
