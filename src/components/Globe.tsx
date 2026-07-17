import React from "react";
import { COLORS } from "../config";

const DEG = Math.PI / 180;
const TILT = 0.26; // slight axial tilt so latitude lines read as ellipses

// Wireframe orthographic globe, line-art to match the print aesthetic.
// rotation in degrees spins the meridians; progress 0→1 draws it in.
export const Globe: React.FC<{
  size: number;
  rotation: number;
  progress?: number;
  strokeWidth?: number;
}> = ({ size, rotation, progress = 1, strokeWidth = 2.5 }) => {
  const R = size / 2;
  const seg = (a: number, b: number) =>
    Math.min(1, Math.max(0, (progress - a) / (b - a)));
  const stroke = {
    fill: "none" as const,
    stroke: COLORS.ink,
    strokeWidth,
    strokeOpacity: 0.85,
  };
  const lats = [-50, -25, 0, 25, 50];
  const meridians = Array.from({ length: 6 }, (_, i) => i * 30);
  return (
    <svg width={size} height={size} style={{ display: "block", overflow: "visible" }}>
      <circle
        cx={R}
        cy={R}
        r={R - strokeWidth}
        {...stroke}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - seg(0, 0.35)}
      />
      {lats.map((phi, i) => {
        const rx = (R - strokeWidth) * Math.cos(phi * DEG);
        return (
          <ellipse
            key={`lat${i}`}
            cx={R}
            cy={R - (R - strokeWidth) * Math.sin(phi * DEG) * Math.sqrt(1 - TILT * TILT)}
            rx={rx}
            ry={Math.max(0.5, rx * TILT)}
            {...stroke}
            strokeOpacity={0.55}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - seg(0.2 + i * 0.05, 0.6 + i * 0.05)}
          />
        );
      })}
      {meridians.map((base, i) => {
        const lambda = ((rotation + base) % 180) - 90;
        const rx = (R - strokeWidth) * Math.abs(Math.sin(lambda * DEG));
        return (
          <ellipse
            key={`mer${i}`}
            cx={R}
            cy={R}
            rx={Math.max(0.5, rx)}
            ry={R - strokeWidth}
            {...stroke}
            strokeOpacity={0.55}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - seg(0.35 + i * 0.06, 0.75 + i * 0.06)}
          />
        );
      })}
    </svg>
  );
};
