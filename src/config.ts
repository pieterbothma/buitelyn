export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 450,
};

export const COLORS = {
  paper: "#EBEAE6",
  offWhite: "#F7F6F2",
  ink: "#1A1A1A",
  red: "#F03028",
  green: "#0E8345", // markets only — never on brand surfaces
};

export const PRESENTERS: { lines: string[] }[] = [
  { lines: ["Suzaan", "Steyn"] },
  { lines: ["André-Pierre", "du Plessis"] },
];

// Timed to ANW4207_016 "In Sync": quiet build 0–3.6s, bass drop ~3.7s,
// groove hits every ~0.47s until ~12.3s, decay tail to 15s.
export const SCENES = {
  type: { from: 0, duration: 111 },
  brandHit: { from: 111, duration: 59 },
  card1: { from: 170, duration: 58 },
  card2: { from: 228, duration: 58 },
  resolve: { from: 286, duration: 164 },
  out: { from: 408, duration: 42 },
} as const;

export const DROP_FRAME = 111;
export const BEAT_FRAMES = 14;
const LAST_BEAT_FRAME = 370;

// Scale multiplier that thumps on every drum hit between the drop and the outro.
// absFrame is composition-absolute: local sequence frame + SCENES.<scene>.from.
export const beatPulse = (absFrame: number, amount = 0.08): number => {
  if (absFrame < DROP_FRAME || absFrame > LAST_BEAT_FRAME) {
    return 1;
  }
  const since = (absFrame - DROP_FRAME) % BEAT_FRAMES;
  return 1 + amount * Math.exp(-since / 4);
};
