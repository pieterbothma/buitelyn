import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio } from "@remotion/media";
import { COLORS, SCENES } from "./config";
import { Scene1Tease } from "./scenes/Scene1Tease";
import { Scene2Spirograph } from "./scenes/Scene2Spirograph";
import { Scene3BrandHit } from "./scenes/Scene3BrandHit";
import { Scene4Card1 } from "./scenes/Scene4Card1";
import { Scene5Card2 } from "./scenes/Scene5Card2";
import { Scene6Resolve } from "./scenes/Scene6Resolve";
import { Scene7Out } from "./scenes/Scene7Out";

// One-beat paper flash on a hard cut — reads like a press-photo flash.
const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 4], [0.85, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{ backgroundColor: COLORS.offWhite, opacity, pointerEvents: "none" }}
    />
  );
};

export const BuitelynIntro: React.FC<{ audioFile: string | null }> = ({
  audioFile,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      <Sequence from={SCENES.tease.from} durationInFrames={SCENES.tease.duration}>
        <Scene1Tease />
      </Sequence>
      <Sequence
        from={SCENES.spirograph.from}
        durationInFrames={SCENES.spirograph.duration}
      >
        <Scene2Spirograph />
      </Sequence>
      <Sequence
        from={SCENES.brandHit.from}
        durationInFrames={SCENES.brandHit.duration}
      >
        <Scene3BrandHit />
      </Sequence>
      <Sequence from={SCENES.card1.from} durationInFrames={SCENES.card1.duration}>
        <Scene4Card1 />
      </Sequence>
      <Sequence from={SCENES.card2.from} durationInFrames={SCENES.card2.duration}>
        <Scene5Card2 />
      </Sequence>
      <Sequence
        from={SCENES.resolve.from}
        durationInFrames={SCENES.resolve.duration}
      >
        <Scene6Resolve />
      </Sequence>
      <Sequence from={SCENES.card1.from} durationInFrames={5}>
        <Flash />
      </Sequence>
      <Sequence from={SCENES.card2.from} durationInFrames={5}>
        <Flash />
      </Sequence>
      <Sequence from={SCENES.out.from} durationInFrames={SCENES.out.duration}>
        <Scene7Out />
      </Sequence>
    </AbsoluteFill>
  );
};
