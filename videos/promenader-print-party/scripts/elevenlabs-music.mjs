// Generate the music bed with the ElevenLabs Music API, then rebuild the mix.
//
//   ELEVENLABS_API_KEY=sk_... node scripts/elevenlabs-music.mjs
//   npx hyperframes@0.7.61 render -o renders/promenader-print-party.mp4
//
// Writes assets/audio/elevenlabs.mp3 and runs scripts/build_audio.py, which lays the typewriter/SFX
// bus over it and writes assets/audio/track.mp3 (the file index.html plays).
// The cut is on a 120 BPM grid with the drop at 4.0s, so the prompt pins tempo and structure.

import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY ontbreek");
  process.exit(1);
}

const prompt = [
  "Upbeat retro disco-funk instrumental, exactly 120 BPM, 4/4, key of A minor, chord loop Am–F–C–G, one chord per bar.",
  "Playful, sunny, a bit cheeky: a Sea Point beach party for a community newspaper's print launch.",
  "Structure (24 seconds): 0–2s four punchy brass-and-synth stabs, one per beat, like shouted words;",
  "2–3s near-silent break with just ticking hi-hats (leaves room for typewriter clacks);",
  "3–4s snare roll and noise riser; 4s big drop with a crash into the full groove:",
  "four-on-the-floor kick, handclaps on 2 and 4, open hi-hats on the off-beat, octave disco bassline, Rhodes stabs on the off-beats,",
  "a light whistle or glockenspiel hook from 20s; final chord hit at 23s ringing out to 24s.",
  "No vocals.",
].join(" ");

const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192", {
  method: "POST",
  headers: { "xi-api-key": key, "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, music_length_ms: 24000, model_id: "music_v1", force_instrumental: true }),
});
if (!res.ok) {
  console.error(`ElevenLabs ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const out = join(here, "..", "assets", "audio", "elevenlabs.mp3");
writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log("wrote", out);

execFileSync("python3", [join(here, "build_audio.py")], { stdio: "inherit" });
