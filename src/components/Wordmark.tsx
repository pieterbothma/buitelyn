import React from "react";
import { COLORS } from "../config";
import { fontFamily } from "../fonts";

export const Wordmark: React.FC<{ fontSize: number; color?: string }> = ({
  fontSize,
  color = COLORS.ink,
}) => (
  <div
    style={{
      fontFamily,
      fontWeight: 700,
      fontSize,
      letterSpacing: "-0.04em",
      color,
      lineHeight: 1,
    }}
  >
    Buitelyn
  </div>
);
