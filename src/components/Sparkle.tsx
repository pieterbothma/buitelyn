import React from "react";

export const Sparkle: React.FC<{ size: number; color?: string }> = ({
  size,
  color = "#FFFFFF",
}) => {
  const h = size / 2;
  const d = `M ${h} 0 Q ${h} ${h} ${size} ${h} Q ${h} ${h} ${h} ${size} Q ${h} ${h} 0 ${h} Q ${h} ${h} ${h} 0 Z`;
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <path d={d} fill={color} />
    </svg>
  );
};
