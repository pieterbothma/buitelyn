import React from "react";
import { COLORS } from "../config";

export const RedDot: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: COLORS.red,
    }}
  />
);
