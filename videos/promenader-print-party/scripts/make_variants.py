"""Build the 9:16 (stories / reels) and 16:9 (YouTube) cuts from index.html (the 4:5 master).

The 4:5 poster + end card are wrapped in #poster (1080x1350) and placed in the bigger frame; the intro
colour cards and the hand-over wipes go full-bleed; the leftover space gets its own furniture
(tickers for 9:16, a vertical wordmark + date column for 16:9) animated on the same 120 BPM grid.

    python3 scripts/make_variants.py
    npx hyperframes@0.7.61 render -c index-9x16.html -o renders/promenader-print-party-9x16.mp4
    npx hyperframes@0.7.61 render -c index-16x9.html -o renders/promenader-print-party-16x9.mp4

Re-run after editing index.html. Don't hand-edit the generated files.
"""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
SRC = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

TICK = "print party  ·  Sunday 25 Oct  ·  4pm  ·  @toneelhuis  ·  61 Loop St  ·  "
TICK2 = "tickets on Quicket  ·  R200  ·  for the love of print  ·  The Sea Point paper  ·  "

VARIANTS = {
    "9x16": {
        "w": 1080,
        "h": 1920,
        "poster": "left:0px;top:285px;",
        "css": """
      #introWomen { top: 985px !important; }
      #introMark { top: 805px !important; }
      .band { position: absolute; left: -60px; width: 1200px; height: 104px; overflow: hidden; }
      .band .run { position: absolute; top: 0; left: 0; white-space: nowrap; font-family: "MuseoModerno", sans-serif;
                   font-weight: 800; font-size: 60px; line-height: 104px; letter-spacing: -0.02em; }
""",
        "html": f"""
      <div id="bandTop" class="band" style="top:118px;background:var(--yellow);transform:rotate(-2.2deg)">
        <div class="run" style="color:var(--ink)">{TICK * 6}</div>
      </div>
      <div id="bandBot" class="band" style="top:1690px;background:var(--cyan);transform:rotate(1.8deg)">
        <div class="run" style="color:var(--ink)">{TICK2 * 6}</div>
      </div>
      <div id="stripTop" class="abs" style="left:0;top:236px;width:640px;height:16px;background:var(--magenta)"></div>
      <div id="stripBot" class="abs" style="left:440px;top:1660px;width:640px;height:16px;background:var(--blue)"></div>
""",
        "js": """
        // 9:16 furniture: tickers slap on after the intro and run to the end
        tl.fromTo("#bandTop", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.3, ease: "power4.out" }, 4.75);
        tl.fromTo("#bandBot", { scaleX: 0, transformOrigin: "100% 50%" }, { scaleX: 1, duration: 0.3, ease: "power4.out" }, 5.0);
        tl.fromTo("#stripTop", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.25, ease: "power4.out" }, 5.25);
        tl.fromTo("#stripBot", { scaleX: 0, transformOrigin: "100% 50%" }, { scaleX: 1, duration: 0.25, ease: "power4.out" }, 5.25);
        tl.fromTo("#bandTop .run", { x: 0 }, { x: -1800, duration: 31 - 4.75, ease: "none" }, 4.75);
        tl.fromTo("#bandBot .run", { x: -1800 }, { x: 0, duration: 31 - 5.0, ease: "none" }, 5.0);
""",
    },
    "16x9": {
        "w": 1920,
        "h": 1080,
        "poster": "left:528px;top:0px;transform:scale(0.8);transform-origin:0 0;",
        "css": """
      #cardType { padding-right: 700px; }
      #introWomen { left: 1080px !important; top: 330px !important; width: 800px !important; }
      #introMark { left: 480px !important; top: 420px !important; }
      #sideL { position: absolute; left: 0; top: 0; width: 528px; height: 1080px; }
      #sideR { position: absolute; left: 1392px; top: 0; width: 528px; height: 1080px; }
      .dcol { position: absolute; left: 60px; white-space: nowrap; font-family: "MuseoModerno", sans-serif; font-weight: 800;
              letter-spacing: -0.04em; line-height: 1; color: var(--ink); }
""",
        "html": """
      <div id="sideL">
        <div id="sideLCyan" class="abs" style="left:300px;top:0;width:150px;height:1080px;background:var(--cyan)"></div>
        <img id="vWord" class="abs" src="assets/wordmark-vertical.png" style="left:150px;top:40px;height:1000px;width:188.6px" />
        <div id="sideLStrip" class="abs" style="left:60px;top:0;width:18px;height:1080px;background:var(--magenta)"></div>
      </div>
      <div id="sideR">
        <div id="sideRSheet" class="abs" style="left:24px;top:60px;width:470px;height:960px;background:var(--cream)"></div>
        <div id="rTape" class="abs" style="left:4px;top:100px;width:510px;height:46px;background:var(--yellow);transform:rotate(-2deg)"></div>
        <div id="r1" class="dcol" style="top:180px;font-size:84px">Sunday</div>
        <div id="r2" class="dcol" style="top:268px;font-size:210px">25</div>
        <div id="r3" class="dcol" style="top:470px;font-size:130px">Oct</div>
        <div id="r4" class="dcol" style="top:600px;font-size:120px;color:var(--magenta)">4pm</div>
        <div id="rBand" class="abs" style="left:24px;top:760px;width:470px;height:190px;background:var(--blue)"></div>
        <div id="r5" class="dcol" style="top:790px;font-size:52px;color:var(--cream)">@toneelhuis</div>
        <div id="r6" class="dcol" style="top:862px;font-size:52px;color:var(--yellow)">61 Loop St</div>
      </div>
""",
        "js": """
        // 16:9 furniture: vertical wordmark left, a big date column right
        tl.fromTo("#sideLCyan", { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: 0.4, ease: "power3.out" }, 4.75);
        tl.fromTo("#sideLStrip", { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.3, ease: "power4.out" }, 5.0);
        tl.fromTo("#vWord", { y: 1100 }, { y: 0, duration: 0.6, ease: "power4.out" }, 5.25);
        tl.fromTo("#sideRSheet", { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: 0.4, ease: "power3.out" }, 5.0);
        tl.fromTo("#rTape", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.22, ease: "power4.out" }, 5.5);
        ["#r1", "#r2", "#r3", "#r4"].forEach(function (id, i) {
          tl.fromTo(id, { scale: 1.6, autoAlpha: 0, transformOrigin: "0% 50%" }, { scale: 1, autoAlpha: 1, duration: 0.22, ease: "power4.in" }, 5.75 + i * 0.25);
        });
        tl.fromTo("#rBand", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.3, ease: "power4.out" }, 6.75);
        tl.fromTo(["#r5", "#r6"], { x: -40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.25, stagger: 0.25, ease: "power3.out" }, 7.0);
        // the date column pulses with the pin on the end card
        for (var vb = 27.5; vb < 30.5; vb += 0.5) {
          tl.fromTo("#r2", { scale: 1.06 }, { scale: 1, duration: 0.35, ease: "power2.out", immediateRender: false }, vb);
        }
""",
    },
}


def build(name, v):
    s = SRC
    w, h = v["w"], v["h"]
    s = s.replace('content="width=1080, height=1350"', f'content="width={w}, height={h}"')
    s = s.replace("html, body { width: 1080px; height: 1350px;", f"html, body {{ width: {w}px; height: {h}px;")
    s = s.replace("#root { position: relative; width: 1080px; height: 1350px;", f"#root {{ position: relative; width: {w}px; height: {h}px;")
    s = s.replace('data-width="1080" data-height="1350"', f'data-width="{w}" data-height="{h}"')
    s = s.replace('data-composition-id="main"', f'data-composition-id="main-{name}"')
    s = s.replace('window.__timelines["main"]', f'window.__timelines["main-{name}"]')
    # wipes must cover the bigger frame
    s = s.replace(".wipe { position: absolute; left: -200px; top: -200px; width: 1480px; height: 1750px;",
                  ".wipe { position: absolute; left: -500px; top: -500px; width: 2900px; height: 2900px;")
    css = ("      #poster { position: absolute; width: 1080px; height: 1350px; overflow: hidden; }\n"
           "      #poster #paper, #end > img:first-child { visibility: hidden; } /* the frame-wide paper shows through: no seams */\n"
           + v["css"])
    s = s.replace("    </style>", css + "    </style>", 1)
    # backdrop for the whole frame, furniture, and the 4:5 poster inside #poster
    backdrop = f'      <img class="abs" src="assets/paper.jpg" style="left:0;top:0;width:{w}px;height:{h}px;object-fit:cover" />\n'
    s = s.replace("      <!-- ══════════ POSTER (the destination) ══════════ -->",
                  backdrop + v["html"] + f'      <div id="poster" style="{v["poster"]}">\n      <!-- ══════════ POSTER (the destination) ══════════ -->', 1)
    s = s.replace("      <!-- ══════════ INTRO (kinetic cold open) ══════════ -->",
                  "      </div>\n      <!-- ══════════ INTRO (kinetic cold open) ══════════ -->", 1)
    s = s.replace("        tl.to({}, { duration: 31 }, 0); // full-span anchor", v["js"] + "        tl.to({}, { duration: 31 }, 0); // full-span anchor", 1)
    for needle in ('id="poster"', "main-" + name, v["js"].strip()[:40]):
        assert needle in s, (name, needle)
    out = os.path.join(ROOT, f"index-{name}.html")
    s = s.replace("<!doctype html>", "<!doctype html>\n<!-- GENERATED by scripts/make_variants.py from index.html — do not edit -->", 1)
    open(out, "w", encoding="utf-8").write(s)
    print("wrote", os.path.relpath(out, ROOT))


for name, v in VARIANTS.items():
    build(name, v)
