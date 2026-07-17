import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { COLORS, SCENES } from "./config";
import { Scene1Tease } from "./scenes/Scene1Tease";
import { Scene2Spirograph } from "./scenes/Scene2Spirograph";
import { Scene3BrandHit } from "./scenes/Scene3BrandHit";
import { Scene4Card1 } from "./scenes/Scene4Card1";
import { Scene5Card2 } from "./scenes/Scene5Card2";

export const BuitelynIntro: React.FC<{ audioFile: string | null }> = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
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
    </AbsoluteFill>
  );
};
