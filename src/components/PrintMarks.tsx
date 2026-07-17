import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "../config";
import { fontFamily } from "../fonts";

const rule = (top: number): React.CSSProperties => ({
  position: "absolute",
  left: 64,
  right: 64,
  top,
  height: 2,
  backgroundColor: COLORS.ink,
  opacity: 0.18,
});

const corner: React.CSSProperties = {
  position: "absolute",
  top: 24,
  fontFamily,
  fontWeight: 600,
  fontSize: 20,
  letterSpacing: "0.22em",
  color: COLORS.ink,
  opacity: 0.28,
};

// Masthead micro-details: double rules + corner folio text, felt more than seen.
export const PrintMarks: React.FC = () => (
  <AbsoluteFill>
    <div style={rule(56)} />
    <div style={rule(62)} />
    <div style={{ ...corner, left: 64 }}>BUITELYN — EERSTE UITGAWE</div>
    <div style={{ ...corner, right: 64 }}>BL. 3</div>
  </AbsoluteFill>
);
