import "./index.css";
import { Composition } from "remotion";
import { BuitelynIntro } from "./Composition";
import { ComponentCheck } from "./ComponentCheck";
import { VIDEO } from "./config";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BuitelynIntro"
        component={BuitelynIntro}
        durationInFrames={VIDEO.durationInFrames}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={{ audioFile: null }}
      />
      <Composition
        id="ComponentCheck"
        component={ComponentCheck}
        durationInFrames={30}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
