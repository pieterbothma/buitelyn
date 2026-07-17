import { AbsoluteFill } from "remotion";
import { COLORS } from "./config";
import { fontFamily } from "./fonts";

export const BuitelynIntro: React.FC<{ audioFile: string | null }> = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.paper,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ fontFamily, fontWeight: 800, fontSize: 120, color: COLORS.ink }}>
        Buitelyn
      </div>
    </AbsoluteFill>
  );
};
