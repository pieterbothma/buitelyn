import React from "react";
import { COLORS } from "../config";
import { Wordmark } from "./Wordmark";

export const LogoBox: React.FC<{ width?: number; dotScale?: number }> = ({
  width = 420,
  dotScale = 1,
}) => {
  const height = width * 0.36;
  const border = Math.max(4, width * 0.018);
  return (
    <div
      style={{
        width,
        height,
        border: `${border}px solid ${COLORS.ink}`,
        backgroundColor: COLORS.offWhite,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Wordmark fontSize={width * 0.16} />
      <div
        style={{
          position: "absolute",
          top: height * 0.13,
          right: width * 0.055,
          width: width * 0.05,
          height: width * 0.05,
          borderRadius: "50%",
          backgroundColor: COLORS.red,
          transform: `scale(${dotScale})`,
        }}
      />
    </div>
  );
};
