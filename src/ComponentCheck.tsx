import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "./config";
import { PaperGrid } from "./components/PaperGrid";
import { Wordmark } from "./components/Wordmark";
import { RedDot } from "./components/RedDot";
import { Sparkle } from "./components/Sparkle";
import { LogoBox } from "./components/LogoBox";

export const ComponentCheck: React.FC = () => (
  <AbsoluteFill>
    <PaperGrid />
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
      }}
    >
      <Wordmark fontSize={120} />
      <RedDot size={64} />
      <div style={{ backgroundColor: COLORS.ink, padding: 20 }}>
        <Sparkle size={48} />
      </div>
      <LogoBox width={380} />
    </AbsoluteFill>
  </AbsoluteFill>
);
