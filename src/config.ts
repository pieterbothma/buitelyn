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
