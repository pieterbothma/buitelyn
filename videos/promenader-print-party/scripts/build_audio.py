"""Audio for the Promenader print-party poster: music bus + typewriter/SFX bus -> assets/audio/track.mp3

Music: if assets/audio/elevenlabs.mp3 exists (see scripts/elevenlabs-music.mjs) it is used as the
music bed; otherwise a temp 120 BPM disco-funk bed is synthesised here with numpy so the cut can be
timed and reviewed offline. Both share the beat grid: 120 BPM, downbeat 0.0s, drop 4.0s, 24s long.

SFX (typewriter clacks, carriage bell, tape slaps, stamps) are always synthesised; their cue times
mirror the GSAP timeline in index.html — keep them in sync if you retime.

    python3 scripts/build_audio.py
"""

import os
import subprocess
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
LEN = 24.0
N = int(SR * LEN)
rng = np.random.default_rng(7)  # fixed seed: the track re-renders identically

MUSIC = np.zeros((N, 2))
SFX = np.zeros((N, 2))
bus = MUSIC  # add() writes to whichever bus is current


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    bus[i : i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan))
    bus[i : i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):  # short signals only
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def hp(x):
    return np.diff(x, prepend=0)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


# ── instruments ─────────────────────────────────────────────
def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.18) * 1.1 + rng.standard_normal(n) * np.exp(-t / 0.002) * 0.3


def clap():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    nz = hp(hp(rng.standard_normal(n)))
    e = np.zeros(n)
    for off in (0, 0.01, 0.02):
        e += np.where(t >= off, np.exp(-(t - off) / 0.012), 0)
    e += np.exp(-t / 0.09) * 0.6
    return nz * e * 0.25


def hat(open_=False):
    n = int((0.18 if open_ else 0.04) * SR)
    t = np.arange(n) / SR
    return hp(hp(rng.standard_normal(n))) * np.exp(-t / (0.06 if open_ else 0.012)) * 0.12


def bass_note(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    saw = 2 * ((t * f) % 1) - 1
    sq = np.sign(np.sin(2 * np.pi * f * t))
    x = onepole_lp(0.7 * saw + 0.3 * sq, 600) * 1.6
    return x * np.minimum(1, t / 0.003) * np.exp(-t / 0.25) * np.minimum(1, (dur - t) / 0.01).clip(0)


def keys(notes, dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in notes:
        f = midi(m)
        x += np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.05) + 0.12 * np.sin(6 * np.pi * f * t)
    return x / len(notes) * env(n, 0.003, 0.18) * 0.5


def stab(notes, dur=0.6):  # bigger, brassy hit for the intro words
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in notes:
        for det in (-0.08, 0.08):
            f = midi(m + det)
            x += 2 * ((t * f) % 1) - 1
    x = onepole_lp(x / (2 * len(notes)), 2500)
    return x * env(n, 0.004, 0.22) * 0.6


def crash():
    n = int(2.0 * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n)) * np.exp(-t / 0.7) * 0.18


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    # crude swept band: blend increasingly high-passed noise
    h1 = hp(nz)
    h2 = hp(h1)
    k = t / dur
    out = (1 - k) * onepole_lp(nz, 800) + k * h2
    return out * (k ** 2) * 0.25


def whoosh(dur=0.45):
    n = int(dur * SR)
    t = np.arange(n) / SR
    k = t / dur
    return hp(rng.standard_normal(n)) * np.sin(np.pi * k) ** 2 * 0.12


def clack(big=False):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (1800 if big else 2400) * t) * np.exp(-t / 0.004)
    nz = hp(rng.standard_normal(n)) * np.exp(-t / 0.008)
    thud = np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.015)
    return (0.5 * body + 0.6 * nz + 0.5 * thud) * (0.5 if big else 0.28)


def bell():
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in ((2093, 1, 0.5), (5230, 0.4, 0.2), (3140, 0.3, 0.35)))
    return x * 0.22


def thud():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (70 + 60 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.08) + hp(rng.standard_normal(n)) * np.exp(-t / 0.01) * 0.4) * 0.8


# ── arrangement ────────────────────────────────────────────
# i–VI–III–VII in A minor, one chord per bar (2s)
PROG = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]

# 0–2s: FOR · THE · LOVE · OF — one hit per word
for i, (root, ch) in enumerate(PROG):
    t = i * BEAT
    add(kick(), t, 1.0)
    add(stab([n - 12 for n in ch] + ch), t, 0.9)
    add(bass_note(root - 12, 0.45), t, 0.8)
    if i % 2:
        add(clap(), t, 0.8)

# 2–4s: typing break — ticking hats, then a riser into the drop
for k in range(16):
    add(hat(), 2.0 + k * BEAT / 4, 0.5 + 0.03 * k, pan=0.3)
add(riser(1.0), 3.0, 1.0)
for k in range(8):
    add(clap(), 3.0 + k * BEAT / 4, 0.25 + 0.06 * k)
add(bass_note(45, 0.2), 3.5, 0.7)
add(bass_note(47, 0.2), 3.75, 0.7)

# 4–23s: the groove
groove_end = 23.0
t = 4.0
bar = 0
while t < groove_end - 1e-6:
    root, ch = PROG[bar % 4]
    for b in range(4):
        tb = t + b * BEAT
        if tb >= groove_end:
            break
        add(kick(), tb, 1.0)
        if b in (1, 3):
            add(clap(), tb, 0.9)
        add(hat(open_=True), tb + BEAT / 2, 0.9, pan=0.2)
        add(hat(), tb + BEAT / 4, 0.6, pan=-0.3)
        add(hat(), tb + 3 * BEAT / 4, 0.6, pan=-0.3)
        # disco octave bass
        add(bass_note(root - 12, BEAT / 2 * 0.9), tb, 0.8)
        add(bass_note(root, BEAT / 2 * 0.9), tb + BEAT / 2, 0.6)
        # offbeat keys
        add(keys(ch), tb + BEAT / 2, 0.8, pan=0.25 if b % 2 else -0.25)
    t += 4 * BEAT
    bar += 1

# a little hook on top in the hold (20–23s)
hook = [(20.0, 76), (20.25, 79), (20.5, 81), (21.0, 79), (21.25, 76), (21.5, 74), (22.0, 76), (22.5, 72)]
for th, m in hook:
    add(keys([m, m + 12], 0.3), th, 1.1, pan=0.1)

# final hit
add(kick(), 23.0, 1.1)
add(stab([45, 57, 69, 72, 76], 1.0), 23.0, 1.0)
add(crash(), 23.0, 0.8)

# ── SFX (mirror index.html) ────────────────────────────────
bus = SFX
add(crash(), 4.0, 1.0)
add(thud(), 4.0, 0.8)
add(whoosh(0.5), 4.45, 1.2)  # intro page lifts away
add(whoosh(0.35), 4.75, 0.6)  # sheet lands

for i in range(5):
    add(clack(True), 2.0 + i * 0.125, 1.0)
for i in range(5):
    add(clack(True), 2.625 + i * 0.075, 0.9)
add(bell(), 3.0, 1.0)

for k, tt in enumerate((6.0, 6.25, 6.5, 6.5, 6.75)):  # tape slaps
    add(whoosh(0.18), tt - 0.05, 0.9, pan=(-0.5 if k % 2 else 0.5))

for i in range(5):
    add(clack(), 7.5 + i * 0.1, 1.0)
for i in range(5):
    add(clack(), 8.0 + i * 0.1, 1.0)
add(bell(), 8.5, 0.8)
add(thud(), 9.03, 0.9)  # wordmark stamp


def typing(t0, texts, step):
    t = t0
    for s in texts:
        for j, _ in enumerate(s):
            if j % 2 == 0:
                add(clack(), t + j * step, 0.45, pan=0.15)
        t += len(s) * step
    return t


items = [
    (9.5, ["Meet the", "Waterblommetjies"]),
    (10.25, ["Type like", "Jessica", "Fletcher"]),
    (11.0, ["Be the", "front", "page"]),
    (11.75, ["Legendary", "magazine", "covers"]),
    (12.5, ["Tarot", "card", "readings"]),
    (13.25, ["Tequila", "tasting & popcorn"]),
]
for t0, texts in items:
    typing(t0 + 0.1, texts, 0.025)
typing(14.0, ["As seen in Arthur’s Mini"], 0.025)
typing(15.1, ["And a talk about how the analogue", "world got its groove back"], 0.022)
typing(18.0, ["Tickets on Quicket", "@ R200 includes a copy of", "Promenader & a Seepunt hat"], 0.02)
add(whoosh(0.3), 16.45, 0.9)  # blue band
add(thud(), 17.0, 0.5)

# ── master ─────────────────────────────────────────────────
here = os.path.dirname(os.path.abspath(__file__))
audio_dir = os.path.join(here, "..", "assets", "audio")
eleven = os.path.join(audio_dir, "elevenlabs.mp3")
if os.path.exists(eleven):
    raw = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", eleven, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        check=True, capture_output=True,
    ).stdout
    ext = np.frombuffer(raw, dtype="<f4").reshape(-1, 2)[:N]
    MUSIC = np.zeros((N, 2))
    MUSIC[: len(ext)] = ext / max(1e-9, np.max(np.abs(ext))) * 0.8
    print("music bed: elevenlabs.mp3")
else:
    MUSIC = MUSIC / max(1e-9, np.max(np.abs(MUSIC))) * 0.8
    print("music bed: synthesised temp")
mix = MUSIC + SFX * 0.9
fade = int(0.35 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)  # soft clip / glue
mix *= 0.89 / np.max(np.abs(mix))

out = os.path.join(audio_dir, "track.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", out, "-b:a", "192k", out.replace(".wav", ".mp3")], check=True)
os.remove(out)
print("wrote", out.replace(".wav", ".mp3"))
