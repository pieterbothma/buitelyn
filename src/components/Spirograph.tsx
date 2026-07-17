import React from "react";
import { COLORS } from "../config";

export const Spirograph: React.FC<{
  size: number;
  progress: number;
  rings?: number;
  strokeWidth?: number;
}> = ({ size, progress, rings = 16, strokeWidth = 2.5 }) => {
  const c = size / 2;
  return (
    <svg
      width={size}
      height={size}
      style={{ display: "block", overflow: "visible" }}
    >
      {Array.from({ length: rings }, (_, i) => {
        const angle = (i * 360) / rings;
        const delay = i / (rings * 2);
        const local = Math.min(1, Math.max(0, (progress - delay) / 0.5));
        return (
          <g key={i} transform={`rotate(${angle} ${c} ${c})`}>
            <circle
              cx={c}
              cy={c * 0.58}
              r={c * 0.42}
              fill="none"
              stroke={COLORS.ink}
              strokeWidth={strokeWidth}
              strokeOpacity={0.9}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - local}
            />
          </g>
        );
      })}
    </svg>
  );
};
