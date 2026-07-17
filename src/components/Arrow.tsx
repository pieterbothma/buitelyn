import React from "react";
import { COLORS } from "../config";

// CSS-triangle market arrow — font-independent, so no glyph fallback issues.
export const Arrow: React.FC<{ up: boolean; size: number }> = ({
  up,
  size,
}) => (
  <div
    style={{
      width: 0,
      height: 0,
      display: "inline-block",
      borderLeft: `${size * 0.65}px solid transparent`,
      borderRight: `${size * 0.65}px solid transparent`,
      ...(up
        ? { borderBottom: `${size}px solid ${COLORS.green}` }
        : { borderTop: `${size}px solid ${COLORS.red}` }),
    }}
  />
);
