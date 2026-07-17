import "./index.css";
import { Composition } from "remotion";
import { BuitelynIntro } from "./Composition";
import { VIDEO } from "./config";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="BuitelynIntro"
      component={BuitelynIntro}
      durationInFrames={VIDEO.durationInFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{ audioFile: "intro-track.mp3" }}
    />
  );
};
