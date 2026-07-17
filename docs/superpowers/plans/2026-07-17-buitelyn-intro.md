# Buitelyn Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A ~10s, 1920×1080@30fps Remotion intro for the Buitelyn YouTube show, recreating the approved mockup sequence in procedural SVG.

**Architecture:** One Remotion composition (`BuitelynIntro`, 300 frames) assembled from six scene components under `src/scenes/`, sharing motif components (grid paper, spirograph, wordmark, logo box, type texture, mosaic card) under `src/components/`. All text/colours/timings in `src/config.ts`.

**Tech Stack:** Remotion (latest, blank template), TypeScript, `@remotion/google-fonts` (League Spartan), `@remotion/media` (audio slot).

## Global Constraints

- Project root: `/Users/pieterbothma/die buitelyn` (note the space in the path — quote it in every shell command).
- Colours only: paper `#EBEAE6`, off-white `#F7F6F2`, ink `#1A1A1A`, red `#F03028`.
- Presenter names exactly: "Suzaan Steyn", "André-Pierre du Plessis".
- No sponsors anywhere. No baked-in audio; `audioFile` prop defaults to `null`.
- No CSS transitions/animations; motion only via `interpolate()`/`spring()` with `useCurrentFrame()`.
- No `Math.random()`/`Date.now()`; scatter uses Remotion's seeded `random()`.
- Verification per task: `npx tsc --noEmit` + `npx remotion still` frame renders, visually inspected.
- Commit after every task with a `feat:`/`chore:` message.

---

### Task 1: Scaffold project, config, fonts

**Files:**
- Create: Remotion blank project at repo root (scaffold into temp dir, move contents up)
- Create: `src/config.ts`, `src/fonts.ts`
- Modify: `src/Root.tsx`, `src/Composition.tsx` (placeholder wired to config)

**Interfaces:**
- Produces: `VIDEO` (`{width, height, fps, durationInFrames}`), `COLORS` (`{paper, offWhite, ink, red}`), `PRESENTERS` (`[{lines: string[]}, {lines: string[]}]`), `SCENES` (`{tease, spirograph, brandHit, card1, card2, resolve, out}` each `{from, duration}` in frames), `fontFamily` from `src/fonts.ts`.

- [ ] **Step 1: Scaffold**

```bash
cd "/Users/pieterbothma/die buitelyn" \
  && npx create-video@latest --yes --blank --no-tailwind _scaffold \
  && rsync -a _scaffold/ ./ && rm -rf _scaffold \
  && npx remotion add @remotion/google-fonts && npx remotion add @remotion/media
```

Expected: `package.json`, `src/index.ts`, `src/Root.tsx` exist at repo root; deps installed. If `_scaffold` created a nested `.git`, `rsync` must not copy it: add `--exclude .git`.

- [ ] **Step 2: Write `src/config.ts`**

```ts
export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 300,
};

export const COLORS = {
  paper: "#EBEAE6",
  offWhite: "#F7F6F2",
  ink: "#1A1A1A",
  red: "#F03028",
};

export const PRESENTERS: { lines: string[] }[] = [
  { lines: ["Suzaan", "Steyn"] },
  { lines: ["André-Pierre", "du Plessis"] },
];

export const SCENES = {
  tease: { from: 0, duration: 30 },
  spirograph: { from: 30, duration: 54 },
  brandHit: { from: 84, duration: 42 },
  card1: { from: 126, duration: 48 },
  card2: { from: 174, duration: 48 },
  resolve: { from: 222, duration: 63 },
  out: { from: 285, duration: 15 },
} as const;
```

- [ ] **Step 3: Write `src/fonts.ts`**

```ts
import { loadFont } from "@remotion/google-fonts/LeagueSpartan";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "800"],
  subsets: ["latin"],
});
```

- [ ] **Step 4: Wire placeholder composition**

Replace `src/Composition.tsx` with:

```tsx
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
```

Replace `src/Root.tsx` contents with:

```tsx
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
      defaultProps={{ audioFile: null }}
    />
  );
};
```

- [ ] **Step 5: Verify**

```bash
cd "/Users/pieterbothma/die buitelyn" && npx tsc --noEmit \
  && npx remotion still BuitelynIntro out/check-t1.png --frame=10 --scale=0.5
```

Expected: compiles clean; PNG shows "Buitelyn" in League Spartan on warm grey. Inspect the PNG.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Remotion project with Buitelyn config and League Spartan"
```

---

### Task 2: Static motif components

**Files:**
- Create: `src/components/PaperGrid.tsx`, `src/components/Wordmark.tsx`, `src/components/RedDot.tsx`, `src/components/Sparkle.tsx`, `src/components/LogoBox.tsx`
- Modify: `src/Root.tsx` (add temporary `ComponentCheck` composition)
- Create: `src/ComponentCheck.tsx`

**Interfaces:**
- Consumes: `COLORS`, `VIDEO`, `fontFamily` from Task 1.
- Produces:
  - `PaperGrid: React.FC<{ background?: string }>` — full-bleed grid paper background
  - `Wordmark: React.FC<{ fontSize: number; color?: string }>` — "Buitelyn" text
  - `RedDot: React.FC<{ size: number }>` — red circle div
  - `Sparkle: React.FC<{ size: number; color?: string }>` — 4-point glint
  - `LogoBox: React.FC<{ width?: number }>` — boxed wordmark + red dot (final logo)

- [ ] **Step 1: Write `src/components/PaperGrid.tsx`**

```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, VIDEO } from "../config";

const CELL = 96;

export const PaperGrid: React.FC<{ background?: string }> = ({
  background = COLORS.paper,
}) => {
  const { width: w, height: h } = VIDEO;
  const lines: React.ReactNode[] = [];
  for (let x = CELL; x < w; x += CELL) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke={COLORS.ink} strokeOpacity={0.07} strokeWidth={1.5} />
    );
  }
  for (let y = CELL; y < h; y += CELL) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={w} y2={y} stroke={COLORS.ink} strokeOpacity={0.07} strokeWidth={1.5} />
    );
  }
  const guides: [number, number, number, number][] = [
    [0, h, w * 0.5, h * 0.42],
    [w, h, w * 0.5, h * 0.42],
    [0, h * 0.78, w * 0.5, h * 0.42],
    [w, h * 0.78, w * 0.5, h * 0.42],
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <svg width={w} height={h}>
        {lines}
        {guides.map(([x1, y1, x2, y2], i) => (
          <line key={`g${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS.ink} strokeOpacity={0.05} strokeWidth={1.5} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Write `src/components/Wordmark.tsx`**

```tsx
import React from "react";
import { COLORS } from "../config";
import { fontFamily } from "../fonts";

export const Wordmark: React.FC<{ fontSize: number; color?: string }> = ({
  fontSize,
  color = COLORS.ink,
}) => (
  <div
    style={{
      fontFamily,
      fontWeight: 700,
      fontSize,
      letterSpacing: "-0.04em",
      color,
      lineHeight: 1,
    }}
  >
    Buitelyn
  </div>
);
```

- [ ] **Step 3: Write `src/components/RedDot.tsx`**

```tsx
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
```

- [ ] **Step 4: Write `src/components/Sparkle.tsx`**

```tsx
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
```

- [ ] **Step 5: Write `src/components/LogoBox.tsx`**

```tsx
import React from "react";
import { COLORS } from "../config";
import { Wordmark } from "./Wordmark";

export const LogoBox: React.FC<{ width?: number }> = ({ width = 420 }) => {
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
        }}
      />
    </div>
  );
};
```

- [ ] **Step 6: Write `src/ComponentCheck.tsx` and register it**

```tsx
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
```

In `src/Root.tsx`, add below the existing composition (temporary — removed in Task 6):

```tsx
<Composition
  id="ComponentCheck"
  component={ComponentCheck}
  durationInFrames={30}
  fps={VIDEO.fps}
  width={VIDEO.width}
  height={VIDEO.height}
/>
```

with import `import { ComponentCheck } from "./ComponentCheck";`.

- [ ] **Step 7: Verify**

```bash
cd "/Users/pieterbothma/die buitelyn" && npx tsc --noEmit \
  && npx remotion still ComponentCheck out/check-t2.png --frame=0 --scale=0.5
```

Expected: grid paper background with faint lines; wordmark, red dot, sparkle on ink square, boxed logo with red dot. Inspect the PNG against the logo reference images.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add Buitelyn motif components (grid, wordmark, dot, sparkle, logo box)"
```

---

### Task 3: Animated motif components (Spirograph, TypeTexture, MosaicCard)

**Files:**
- Create: `src/components/Spirograph.tsx`, `src/components/TypeTexture.tsx`, `src/components/MosaicCard.tsx`
- Modify: `src/ComponentCheck.tsx` (add the three, animated over its 30 frames)

**Interfaces:**
- Consumes: `COLORS`, `PRESENTERS`, `fontFamily`; Remotion `random`, `interpolate`.
- Produces:
  - `Spirograph: React.FC<{ size: number; progress: number; rings?: number; strokeWidth?: number }>` — `progress` 0→1 draws the rose
  - `TypeTexture: React.FC<{ seed: string; count?: number; drift?: number; opacity?: number }>` — seeded scattered glyphs; `drift` in px shifts them vertically
  - `MosaicCard: React.FC<{ progress: number; width: number; height: number; background: string; rows?: number; cols?: number; seed?: string; children: React.ReactNode }>` — tile-by-tile card build, children fade in at `progress` ≥ 0.5

- [ ] **Step 1: Write `src/components/Spirograph.tsx`**

```tsx
import React from "react";
import { COLORS } from "../config";

export const Spirograph: React.FC<{
  size: number;
  progress: number;
  rings?: number;
  strokeWidth?: number;
}> = ({ size, progress, rings = 16, strokeWidth = 2.5 }) => {
  const c = size / 2;
  return (
    <svg width={size} height={size} style={{ display: "block", overflow: "visible" }}>
      {Array.from({ length: rings }, (_, i) => {
        const angle = (i * 360) / rings;
        const delay = i / (rings * 2);
        const local = Math.min(1, Math.max(0, (progress - delay) / 0.5));
        return (
          <g key={i} transform={`rotate(${angle} ${c} ${c})`}>
            <circle
              cx={c}
              cy={c * 0.58}
              r={c * 0.42}
              fill="none"
              stroke={COLORS.ink}
              strokeWidth={strokeWidth}
              strokeOpacity={0.9}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - local}
            />
          </g>
        );
      })}
    </svg>
  );
};
```

- [ ] **Step 2: Write `src/components/TypeTexture.tsx`**

```tsx
import React from "react";
import { AbsoluteFill, random } from "remotion";
import { COLORS, PRESENTERS, VIDEO } from "../config";
import { fontFamily } from "../fonts";

const GLYPHS = [
  "B", "S", "ET", "P", "Q", "W", "V", "M", "Z", "N",
  "Buitelyn",
  ...PRESENTERS.map((p) => p.lines.join(" ")),
];

export const TypeTexture: React.FC<{
  seed: string;
  count?: number;
  drift?: number;
  opacity?: number;
}> = ({ seed, count = 36, drift = 0, opacity = 0.12 }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    {Array.from({ length: count }, (_, i) => {
      const rx = random(`${seed}-x-${i}`);
      const ry = random(`${seed}-y-${i}`);
      const rs = random(`${seed}-s-${i}`);
      const rg = random(`${seed}-g-${i}`);
      const glyph = GLYPHS[Math.floor(rg * GLYPHS.length)];
      const big = glyph.length <= 2;
      const size = big ? 90 + rs * 320 : 22 + rs * 26;
      const top = (((ry * (VIDEO.height + 240) + drift) % (VIDEO.height + 240)) + VIDEO.height + 240) % (VIDEO.height + 240) - 120;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: rx * VIDEO.width - 120,
            top,
            fontFamily,
            fontWeight: rs > 0.6 ? 700 : 400,
            fontSize: size,
            color: COLORS.ink,
            opacity,
            whiteSpace: "nowrap",
          }}
        >
          {glyph}
        </div>
      );
    })}
  </AbsoluteFill>
);
```

- [ ] **Step 3: Write `src/components/MosaicCard.tsx`**

```tsx
import React from "react";
import { interpolate, random } from "remotion";

export const MosaicCard: React.FC<{
  progress: number;
  width: number;
  height: number;
  background: string;
  rows?: number;
  cols?: number;
  seed?: string;
  children: React.ReactNode;
}> = ({ progress, width, height, background, rows = 4, cols = 6, seed = "mosaic", children }) => {
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const delay = random(`${seed}-${i}`) * 0.5;
      tiles.push(
        <div
          key={i}
          style={{
            position: "absolute",
            left: (c * width) / cols,
            top: (r * height) / rows,
            width: width / cols + 1,
            height: height / rows + 1,
            backgroundColor: background,
            opacity: progress > delay ? 1 : 0,
          }}
        />
      );
    }
  }
  const contentOpacity = interpolate(progress, [0.5, 0.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "relative", width, height }}>
      {tiles}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: contentOpacity,
        }}
      >
        {children}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Extend `src/ComponentCheck.tsx`**

Add imports and a second row; drive with frame so the still at frame 25 shows near-complete states:

```tsx
import { useCurrentFrame, interpolate } from "remotion";
import { Spirograph } from "./components/Spirograph";
import { TypeTexture } from "./components/TypeTexture";
import { MosaicCard } from "./components/MosaicCard";
import { fontFamily } from "./fonts";
```

Inside the component:

```tsx
const frame = useCurrentFrame();
const progress = interpolate(frame, [0, 25], [0, 1], {
  extrapolateRight: "clamp",
});
```

New row below the first (change outer `AbsoluteFill` to `flexDirection: "column"` with two rows):

```tsx
<div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-evenly" }}>
  <Spirograph size={360} progress={progress} />
  <MosaicCard progress={progress} width={420} height={220} background={COLORS.offWhite}>
    <div style={{ fontFamily, fontWeight: 700, fontSize: 48, color: COLORS.ink }}>
      Suzaan Steyn
    </div>
  </MosaicCard>
</div>
```

And `<TypeTexture seed="check" opacity={0.1} />` layered directly above `<PaperGrid />`.

- [ ] **Step 5: Verify**

```bash
cd "/Users/pieterbothma/die buitelyn" && npx tsc --noEmit \
  && npx remotion still ComponentCheck out/check-t3a.png --frame=8 --scale=0.5 \
  && npx remotion still ComponentCheck out/check-t3b.png --frame=25 --scale=0.5
```

Expected: frame 8 shows spirograph partially drawn and mosaic card partially tiled; frame 25 shows full rose, full card with name, scattered type texture behind. Inspect both PNGs.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add animated motifs — spirograph, type texture, mosaic card"
```

---

### Task 4: Scenes 1–3 (tease, spirograph, brand hit)

**Files:**
- Create: `src/scenes/Scene1Tease.tsx`, `src/scenes/Scene2Spirograph.tsx`, `src/scenes/Scene3BrandHit.tsx`
- Modify: `src/Composition.tsx` (assemble scenes 1–3 in Sequences; later scenes still empty)

**Interfaces:**
- Consumes: all Task 2/3 components; `SCENES`, `COLORS`, `fontFamily`.
- Produces: `Scene1Tease`, `Scene2Spirograph`, `Scene3BrandHit` — all `React.FC` with no props; each uses `useCurrentFrame()` relative to its own `<Sequence>`.

- [ ] **Step 1: Write `src/scenes/Scene1Tease.tsx`**

```tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../config";
import { Wordmark } from "../components/Wordmark";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene1Tease: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 18], [0, 100], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const draw = interpolate(frame, [6, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.offWhite,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative" }}>
        <div style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
          <Wordmark fontSize={200} />
        </div>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <path
            d="M 103 -4 L 103 112 L 55 112"
            fill="none"
            stroke={COLORS.ink}
            strokeWidth={7}
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Write `src/scenes/Scene2Spirograph.tsx`**

```tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { PaperGrid } from "../components/PaperGrid";
import { Spirograph } from "../components/Spirograph";
import { RedDot } from "../components/RedDot";
import { Wordmark } from "../components/Wordmark";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene2Spirograph: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 44], [0, 1], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const wordX = interpolate(frame, [6, 48], [1150, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const orbit = interpolate(frame, [0, 48], [Math.PI * 1.6, Math.PI * -0.25], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const dotX = 960 + Math.cos(orbit) * 450;
  const dotY = 480 + Math.sin(orbit) * 450;
  return (
    <AbsoluteFill>
      <PaperGrid />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: `translateX(${wordX}px)`,
        }}
      >
        <Wordmark fontSize={170} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Spirograph size={780} progress={draw} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: dotX - 28, top: dotY - 28 }}>
        <RedDot size={56} />
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Write `src/scenes/Scene3BrandHit.tsx`**

```tsx
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../config";
import { PaperGrid } from "../components/PaperGrid";
import { Wordmark } from "../components/Wordmark";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene3BrandHit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const circle = spring({ frame: frame - 4, fps, config: { damping: 14, mass: 0.8 } });
  const boxDraw = interpolate(frame, [16, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <AbsoluteFill>
      <PaperGrid />
      <div
        style={{
          position: "absolute",
          left: "60%",
          top: "50%",
          width: 560,
          height: 560,
          borderRadius: "50%",
          backgroundColor: COLORS.red,
          transform: `translate(-50%, -50%) scale(${circle})`,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", padding: "60px 80px" }}>
          <Wordmark fontSize={210} />
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
          >
            <rect
              x={0}
              y={0}
              width={100}
              height={100}
              fill="none"
              stroke={COLORS.ink}
              strokeWidth={6}
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - boxDraw}
            />
          </svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Assemble in `src/Composition.tsx`**

Replace the placeholder body:

```tsx
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { COLORS, SCENES } from "./config";
import { Scene1Tease } from "./scenes/Scene1Tease";
import { Scene2Spirograph } from "./scenes/Scene2Spirograph";
import { Scene3BrandHit } from "./scenes/Scene3BrandHit";

export const BuitelynIntro: React.FC<{ audioFile: string | null }> = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <Sequence from={SCENES.tease.from} durationInFrames={SCENES.tease.duration}>
        <Scene1Tease />
      </Sequence>
      <Sequence from={SCENES.spirograph.from} durationInFrames={SCENES.spirograph.duration}>
        <Scene2Spirograph />
      </Sequence>
      <Sequence from={SCENES.brandHit.from} durationInFrames={SCENES.brandHit.duration}>
        <Scene3BrandHit />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5: Verify**

```bash
cd "/Users/pieterbothma/die buitelyn" && npx tsc --noEmit \
  && npx remotion still BuitelynIntro out/check-s1.png --frame=15 --scale=0.5 \
  && npx remotion still BuitelynIntro out/check-s2.png --frame=60 --scale=0.5 \
  && npx remotion still BuitelynIntro out/check-s3.png --frame=110 --scale=0.5
```

Expected: s1 = wordmark half-revealed with cursor box on off-white; s2 = spirograph mostly drawn over grid with wordmark sliding and red dot; s3 = big wordmark with red circle behind and box drawing. Compare with mockup frames.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: implement scenes 1-3 (tease, spirograph, brand hit)"
```

---

### Task 5: Scenes 4–5 (presenter name cards)

**Files:**
- Create: `src/scenes/NameCard.tsx` (shared), `src/scenes/Scene4Card1.tsx`, `src/scenes/Scene5Card2.tsx`
- Modify: `src/Composition.tsx` (add Sequences for card1/card2)

**Interfaces:**
- Consumes: `MosaicCard`, `TypeTexture`, `PaperGrid`, `Sparkle`, `PRESENTERS`, `SCENES`, `fontFamily`.
- Produces: `NameCard: React.FC<{ lines: string[]; dark?: boolean; fontSize?: number }>`; `Scene4Card1`, `Scene5Card2` (no props).

- [ ] **Step 1: Write `src/scenes/NameCard.tsx`**

```tsx
import React from "react";
import { COLORS } from "../config";
import { fontFamily } from "../fonts";

export const NameCard: React.FC<{
  lines: string[];
  dark?: boolean;
  fontSize?: number;
}> = ({ lines, dark = false, fontSize = 88 }) => (
  <div
    style={{
      fontFamily,
      fontWeight: 700,
      fontSize,
      lineHeight: 1.04,
      letterSpacing: "-0.02em",
      color: dark ? COLORS.offWhite : COLORS.ink,
      textAlign: "center",
    }}
  >
    {lines.map((line) => (
      <div key={line}>{line}</div>
    ))}
  </div>
);
```

- [ ] **Step 2: Write `src/scenes/Scene4Card1.tsx`**

```tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, PRESENTERS } from "../config";
import { PaperGrid } from "../components/PaperGrid";
import { TypeTexture } from "../components/TypeTexture";
import { MosaicCard } from "../components/MosaicCard";
import { NameCard } from "./NameCard";

export const Scene4Card1: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 26], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <PaperGrid />
      <TypeTexture seed="scene4" count={20} drift={frame * 1.4} opacity={0.16} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <MosaicCard
          progress={progress}
          width={720}
          height={380}
          background={COLORS.offWhite}
          seed="card1"
        >
          <NameCard lines={PRESENTERS[0].lines} />
        </MosaicCard>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Write `src/scenes/Scene5Card2.tsx`**

```tsx
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, PRESENTERS } from "../config";
import { PaperGrid } from "../components/PaperGrid";
import { TypeTexture } from "../components/TypeTexture";
import { Sparkle } from "../components/Sparkle";
import { NameCard } from "./NameCard";

export const Scene5Card2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.9 } });
  const glint = interpolate(frame, [10, 20, 32], [0, 1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <PaperGrid />
      <TypeTexture seed="scene5" count={44} drift={frame * 0.8} opacity={0.16} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            width: 760,
            height: 400,
            backgroundColor: COLORS.ink,
            border: `10px solid ${COLORS.ink}`,
            boxShadow: `inset 0 0 0 6px ${COLORS.offWhite}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${0.85 + enter * 0.15}) translateY(${(1 - enter) * 60}px)`,
            opacity: Math.min(1, enter * 2),
          }}
        >
          <NameCard lines={PRESENTERS[1].lines} dark fontSize={76} />
          <div
            style={{
              position: "absolute",
              top: 18,
              right: 26,
              transform: `scale(${glint})`,
            }}
          >
            <Sparkle size={44} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Add Sequences to `src/Composition.tsx`**

```tsx
import { Scene4Card1 } from "./scenes/Scene4Card1";
import { Scene5Card2 } from "./scenes/Scene5Card2";
```

```tsx
<Sequence from={SCENES.card1.from} durationInFrames={SCENES.card1.duration}>
  <Scene4Card1 />
</Sequence>
<Sequence from={SCENES.card2.from} durationInFrames={SCENES.card2.duration}>
  <Scene5Card2 />
</Sequence>
```

- [ ] **Step 5: Verify**

```bash
cd "/Users/pieterbothma/die buitelyn" && npx tsc --noEmit \
  && npx remotion still BuitelynIntro out/check-s4.png --frame=150 --scale=0.5 \
  && npx remotion still BuitelynIntro out/check-s5.png --frame=200 --scale=0.5
```

Expected: s4 = white mosaic card with "Suzaan / Steyn" over drifting giant letters; s5 = black card with "André-Pierre / du Plessis", sparkle glint, denser type collage. Inspect PNGs.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: implement presenter name card scenes"
```

---

### Task 6: Scenes 6–7, final assembly, audio slot, full render

**Files:**
- Create: `src/scenes/Scene6Resolve.tsx`, `src/scenes/Scene7Out.tsx`
- Modify: `src/Composition.tsx` (final assembly + audio slot), `src/Root.tsx` (remove `ComponentCheck`)
- Delete: `src/ComponentCheck.tsx`

**Interfaces:**
- Consumes: everything prior; `@remotion/media` `Audio`, `staticFile`.
- Produces: final `BuitelynIntro` with `audioFile: string | null` prop (filename inside `public/`).

- [ ] **Step 1: Write `src/scenes/Scene6Resolve.tsx`**

```tsx
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../config";
import { fontFamily } from "../fonts";
import { PaperGrid } from "../components/PaperGrid";
import { TypeTexture } from "../components/TypeTexture";
import { LogoBox } from "../components/LogoBox";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene6Resolve: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const guides = interpolate(frame, [0, 32], [0, 1], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const pop = spring({ frame: frame - 16, fps, config: { damping: 12, mass: 0.9, stiffness: 120 } });
  return (
    <AbsoluteFill>
      <PaperGrid />
      <TypeTexture seed="scene6" count={54} opacity={0.16} />
      <div
        style={{
          position: "absolute",
          left: 220,
          top: 120,
          fontFamily,
          fontWeight: 700,
          fontSize: 640,
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: `3px ${COLORS.ink}`,
          opacity: guides * 0.7,
        }}
      >
        B
      </div>
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0 }}
      >
        {[
          { cx: 480, cy: 320, r: 150 },
          { cx: 480, cy: 620, r: 185 },
        ].map((c, i) => (
          <circle
            key={i}
            {...c}
            fill="none"
            stroke={COLORS.ink}
            strokeWidth={2}
            strokeOpacity={0.5}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - guides}
          />
        ))}
        <line x1={240} y1={140} x2={720} y2={800} stroke={COLORS.ink} strokeWidth={1.5} strokeOpacity={0.4 * guides} />
        <line x1={720} y1={140} x2={240} y2={800} stroke={COLORS.ink} strokeWidth={1.5} strokeOpacity={0.4 * guides} />
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${pop})` }}>
          <LogoBox width={460} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Write `src/scenes/Scene7Out.tsx`**

```tsx
import React from "react";
import { AbsoluteFill } from "remotion";

export const Scene7Out: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000000" }} />
);
```

- [ ] **Step 3: Final `src/Composition.tsx`**

Add imports:

```tsx
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import { Scene6Resolve } from "./scenes/Scene6Resolve";
import { Scene7Out } from "./scenes/Scene7Out";
```

Inside the root `AbsoluteFill`, first child:

```tsx
{audioFile ? <Audio src={staticFile(audioFile)} /> : null}
```

(destructure `audioFile` in the component signature), and append:

```tsx
<Sequence from={SCENES.resolve.from} durationInFrames={SCENES.resolve.duration}>
  <Scene6Resolve />
</Sequence>
<Sequence from={SCENES.out.from} durationInFrames={SCENES.out.duration}>
  <Scene7Out />
</Sequence>
```

- [ ] **Step 4: Remove ComponentCheck**

Delete `src/ComponentCheck.tsx`; remove its `<Composition>` and import from `src/Root.tsx`.

- [ ] **Step 5: Verify stills + full render**

```bash
cd "/Users/pieterbothma/die buitelyn" && npx tsc --noEmit \
  && npx remotion still BuitelynIntro out/check-s6.png --frame=255 --scale=0.5 \
  && npx remotion still BuitelynIntro out/check-s7.png --frame=292 --scale=0.5 \
  && npx remotion render BuitelynIntro out/buitelyn-intro.mp4
```

Expected: s6 = blueprint B + boxed logo popped; s7 = black. Render completes ~300 frames. Watch/spot-check the MP4 (extract a contact sheet with ffmpeg and compare against the mockup's).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: complete Buitelyn intro — resolve scene, assembly, audio slot"
```

---

### Task 7: Side-by-side comparison & polish pass

**Files:**
- Modify: whichever scene files the comparison flags (timing/scale/position tweaks only)

**Interfaces:**
- Consumes: final render `out/buitelyn-intro.mp4`, mockup `~/Downloads/Buitelyn Begin.mp4`.

- [ ] **Step 1: Build comparison contact sheets**

```bash
cd "/Users/pieterbothma/die buitelyn" \
  && ffmpeg -y -v error -i out/buitelyn-intro.mp4 -vf "fps=1.5,scale=640:-1,tile=4x4" -frames:v 1 out/ours_grid.png \
  && ffmpeg -y -v error -i "/Users/pieterbothma/Downloads/Buitelyn Begin.mp4" -vf "fps=1.5,scale=640:-1,tile=4x4" -frames:v 1 out/mock_grid.png
```

- [ ] **Step 2: Inspect both grids, list divergences**

Read both PNGs. Note anything off: scene pacing, element sizes, dot positions, texture density.

- [ ] **Step 3: Apply tweaks, re-render, re-inspect**

Adjust constants in the flagged scene files only. Re-run the render + grid from Step 1 until it holds up next to the mockup.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "polish: tune intro pacing and layout against mockup"
```
