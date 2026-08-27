#!/usr/bin/env python3
"""Buitelyn-short: 9:16 met karaoke-onderskrifte en 'n uitro.

WOORDTYE — hoekom ons dit self bereken en NIE vir Gemini vra nie.

Gemini skat tydstempels deur te luister; oor 'n lang lêer bou die fout op
(gemeet op hierdie program: -0,2s by 7s, +8,7s by 299s). Die gestukte
transkripsie los dit op SEGMENT-vlak: elke venster het 'n bekende begintyd, so
die fout kan nie oor 'n venster heen aangroei nie.

Binne EEN segment van 2-8s is daar niks om te dryf nie. Ons versprei die woorde
dus oor die segment volgens hul lengte. Dit erf die segment se anker eerder as
om 'n nuwe skatting daarby te tel — en dit is juis die bytel wat laat lag.

Die uitlig loop VOORSPRONG sekondes vroeg. 'n Highlight wat presies op die woord
val, voel laat; een wat effens voor val, voel op die maat.
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
BRON_W, BRON_H = 1920, 1080
SNIT_W = round(BRON_H * 9 / 16)          # 608 — die breedste 9:16 uit 'n 1080p-raam
PUBLIC = "/Users/pieterbothma/die buitelyn/videos/buitelyn-episode/public"
FONT_B = f"{PUBLIC}/fonts/LeagueSpartan-700.ttf"
FONT_M = f"{PUBLIC}/fonts/LeagueSpartan-500.ttf"
INK, PAPIER, ROOI = (26, 26, 26), (247, 246, 242), (240, 48, 40)

GROOTTE, LYN_H = 116, 148   # groot & kort: drie woorde, enorm
PER_BLOK = 3                # woorde gelyktydig op die skerm
ONDER = 640                              # hoër, want die blok is nou baie hoër
VOORSPRONG = 0.08
KLANK = "audio.mp3"    # dieselfde klank as die transkripsie
UITRO_S = 3.6   # meer om te lees as net een reël


# Woordtye kom uit woordtye.py: geskat, maar geanker by die pouses wat werklik
# in die klank is. Sien daardie lêer se kop vir hoekom die suiwer skatting en
# die suiwer meting albei verkeerd was.
from woordtye import woordtye as _woordtye_gemeet


def blokke_van(woorde):
    """Groepeer die segment se woorde in blokkies van drie.

    Dit is die 'groot & kort'-styl: 'n paar woorde op 'n slag, enorm. Dit lees
    op 'n foon sonder klank en dit oorleef die klein voorskou in 'n voer — maar
    dit vat baie van die raam, so drie is die perk."""
    return [woorde[i:i + PER_BLOK] for i in range(0, len(woorde), PER_BLOK)]


def teken(blok, aktief, pad, font):
    """Een blokkie: elke woord op sy eie reël, gesentreer."""
    hoogte = LYN_H * len(blok) + 40
    im = Image.new("RGBA", (W, hoogte), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for r, w in enumerate(blok):
        teks = w["w"].upper()
        bw = d.textlength(teks, font=font)
        x = (W - bw) / 2
        y = 20 + r * LYN_H
        if w["i"] == aktief:
            # Rooi blok agter die aktiewe woord — Buitelyn se aksent.
            d.rectangle([x - 20, y - 10, x + bw + 20, y + GROOTTE + 26], fill=ROOI)
            d.text((x, y), teks, font=font, fill=PAPIER)
        else:
            d.text((x, y), teks, font=font, fill=PAPIER, stroke_width=9, stroke_fill=INK)
    im.save(pad)
    return hoogte


def _ikoon_youtube(d, x, y, g, kleur):
    """Afgeronde reghoek met 'n speel-driehoek."""
    r = g * 0.22
    d.rounded_rectangle([x, y + g * 0.16, x + g, y + g * 0.84], radius=r, fill=kleur)
    w, h = g * 0.26, g * 0.30
    cx, cy = x + g * 0.44, y + g * 0.50
    d.polygon([(cx - w * 0.4, cy - h / 2), (cx - w * 0.4, cy + h / 2), (cx + w * 0.75, cy)],
              fill=INK)


def _ikoon_tiktok(d, x, y, g, kleur):
    """Vereenvoudigde noot: 'n stok met 'n vlag en 'n koppie."""
    lw = max(3, int(g * 0.11))
    sx = x + g * 0.42
    d.line([(sx, y + g * 0.14), (sx, y + g * 0.66)], fill=kleur, width=lw)
    # vlag boaan
    d.line([(sx, y + g * 0.14), (sx + g * 0.34, y + g * 0.26)], fill=kleur, width=lw)
    d.line([(sx + g * 0.34, y + g * 0.26), (sx + g * 0.34, y + g * 0.40)], fill=kleur, width=lw)
    # koppie
    rr = g * 0.17
    d.ellipse([sx - rr * 1.7, y + g * 0.56, sx + rr * 0.3, y + g * 0.56 + rr * 2], fill=kleur)


def _ikoon_instagram(d, x, y, g, kleur):
    """Afgeronde vierkant, sirkel binne, kolletjie regs bo."""
    lw = max(3, int(g * 0.09))
    d.rounded_rectangle([x + g * 0.06, y + g * 0.06, x + g * 0.94, y + g * 0.94],
                        radius=g * 0.26, outline=kleur, width=lw)
    d.ellipse([x + g * 0.30, y + g * 0.30, x + g * 0.70, y + g * 0.70],
              outline=kleur, width=lw)
    d.ellipse([x + g * 0.72, y + g * 0.20, x + g * 0.82, y + g * 0.30], fill=kleur)


def uitro_kaart(pad):
    """Slotkaart: die volle logo, die oproep tot aksie, en waar om te kyk.

    Al drie platforms is @buitelyn, so die naam staan EEN keer met die ikone
    langsaan. Drie reels wat dieselfde naam herhaal, laat 'n mens dit lees; een
    reel laat 'n mens dit onthou."""
    im = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(im)

    merk = Image.open(f"{PUBLIC}/logo-wit.png").convert("RGBA")
    mw = 400
    merk = merk.resize((mw, round(merk.height * mw / merk.width)), Image.LANCZOS)
    logo_y = 440
    im.paste(merk, ((W - mw) // 2, logo_y), merk)

    f_kop = ImageFont.truetype(FONT_B, 62)
    f_naam = ImageFont.truetype(FONT_B, 64)
    f_web = ImageFont.truetype(FONT_M, 46)

    ty = logo_y + merk.height + 100
    d.text((W // 2, ty), "VOLLE EPISODE OP", font=f_kop, fill=PAPIER, anchor="ma")
    y = ty + 84
    teks = "YOUTUBE"
    bw = d.textlength(teks, font=f_kop)
    d.rectangle([(W - bw) / 2 - 26, y - 10, (W + bw) / 2 + 26, y + 80], fill=ROOI)
    d.text((W // 2, y), teks, font=f_kop, fill=PAPIER, anchor="ma")

    # Die ikone in 'n ry, en die naam gesentreer DAARONDER. Die naam geld vir al
    # drie, so dit hoort onder die groep eerder as langs die laaste ikoon — waar
    # dit soos Instagram s'n alleen gelyk het.
    g, gaping = 84, 44
    ry = y + 186
    x = (W - (g * 3 + gaping * 2)) / 2
    for teken_ikoon in (_ikoon_youtube, _ikoon_tiktok, _ikoon_instagram):
        teken_ikoon(d, x, ry, g, PAPIER)
        x += g + gaping
    d.text((W // 2, ry + g + 34), "@buitelyn", font=f_naam, fill=PAPIER, anchor="ma")

    d.text((W // 2, ry + g + 132), "buitelyn.com", font=f_web, fill=(158, 156, 151), anchor="ma")

    im.save(pad, quality=95)



def _snit_uitdrukking(kaart, t0, t1):
    """'n Snit-x wat OOR TYD beweeg, as 'n ffmpeg-uitdrukking.

    Ses van agt kandidate wissel binne hulself tussen 'solo' (AP ongeveer in die
    middel, x~0.40) en 'split' (AP links gedruk, x~0.25). Een vaste snit oor so
    'n knip is altyd vir die een helfte verkeerd: by Nvidia het dit op die
    grafika beland met AP as 'n splinter langs die rand.

    Ons bou dus 'n stuksgewyse lineêre x(t). Die beweging loop oor RAMP sekondes
    sodat dit soos 'n stadige pan lyk eerder as 'n sprong — 'n sprong lyk stukkend,
    'n pan lyk bedoel.

    Waar AP nie sigbaar is nie (b-roll) HOU ons die vorige posisie. Daar is niks
    om na toe te beweeg nie, en 'n beweging na die middel toe is net onrus.
    """
    RAMP = 0.5
    punte = []
    vorige = None
    for k in kaart:
        if not (t0 - 5 <= k["t"] <= t1 + 5):
            continue
        x = k["ap"] if k["ap"] is not None else vorige
        if x is None:
            continue
        vorige = x
        px = max(0, min(BRON_W - SNIT_W, round(x * BRON_W - SNIT_W / 2)))
        punte.append((max(0.0, k["t"] - t0), px))
    if not punte:
        return str((BRON_W - SNIT_W) // 2)

    # Gooi herhalings weg: net waar dit werklik skuif, is 'n draaipunt nodig.
    skoon = [punte[0]]
    for t, px in punte[1:]:
        if abs(px - skoon[-1][1]) > 12:
            skoon.append((t, px))
    if len(skoon) == 1:
        return str(skoon[0][1])

    # Van binne na buite genes: die laaste waarde is die val-terug.
    uitdr = str(skoon[-1][1])
    for i in range(len(skoon) - 1, 0, -1):
        ta, xa = skoon[i - 1]
        tb, xb = skoon[i]
        begin = max(ta, tb - RAMP)
        lerp = f"({xa}+({xb}-{xa})*(t-{begin:.2f})/{max(0.01, tb - begin):.2f})"
        uitdr = f"if(lt(t,{begin:.2f}),{xa},if(lt(t,{tb:.2f}),{lerp},{uitdr}))"
    return uitdr


def maak(idx, kort, segs, kaart, bron, gids):
    t0, t1 = kort["begin"], kort["einde"]
    duur = t1 - t0
    naam = f"{idx:02d}-{kort['onderwerp']}"
    werk = f"{gids}/{naam}-werk"
    os.makedirs(werk, exist_ok=True)
    font = ImageFont.truetype(FONT_B, GROOTTE)

    binne = [k for k in kaart if t0 - 2 <= k["t"] <= t1 + 2 and k["ap"] is not None]
    apx = sum(k["ap"] for k in binne) / len(binne) if binne else 0.5
    links = max(0, min(BRON_W - SNIT_W, round(apx * BRON_W - SNIT_W / 2)))

    knip = [s for s in segs if s["einde"] > t0 and s["begin"] < t1]
    blokke = _woordtye_gemeet(knip, KLANK)

    # Een PNG per woord-toestand, met sy eie venster.
    rame, hoogte = [], 0
    for woorde in blokke:
        for blok in blokke_van(woorde):
            for w in blok:
                p = f"{werk}/k{len(rame):04d}.png"
                hoogte = teken(blok, w["i"], p, font)
                a = max(0.0, w["begin"] - t0 - VOORSPRONG)
                e = max(a + 0.05, min(duur, w["einde"] - t0 - VOORSPRONG))
                rame.append((p, a, e))

    # Die onderskrif-baan as EEN deursigtige video. 'n Aparte overlay per woord
    # sou honderde filters in een graaf beteken; een baan is vinniger en die
    # graaf bly leesbaar.
    lys = f"{werk}/baan.txt"
    with open(lys, "w") as f:
        vorige = 0.0
        for p, a, e in rame:
            if a > vorige + 0.01:
                f.write(f"file '{os.path.abspath(werk)}/leeg.png'\nduration {a - vorige:.3f}\n")
            f.write(f"file '{os.path.abspath(p)}'\nduration {max(0.05, e - a):.3f}\n")
            vorige = e
        if duur > vorige:
            f.write(f"file '{os.path.abspath(werk)}/leeg.png'\nduration {duur - vorige:.3f}\n")
        f.write(f"file '{os.path.abspath(rame[-1][0])}'\n")
    Image.new("RGBA", (W, hoogte or 200), (0, 0, 0, 0)).save(f"{werk}/leeg.png")

    baan = f"{werk}/baan.mov"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0", "-i", lys,
                    "-c:v", "qtrle", "-pix_fmt", "argb", "-r", "30", baan, "-y"], check=True)

    uitro_png = f"{werk}/uitro.jpg"
    uitro_kaart(uitro_png)

    kern = f"{werk}/kern.mp4"
    subprocess.run([
        "ffmpeg", "-v", "error",
        "-ss", str(t0), "-t", str(duur), "-i", bron,
        "-i", f"{PUBLIC}/woordmerk-wit.png",
        "-i", baan,
        "-filter_complex",
        f"[0:v]crop={SNIT_W}:{BRON_H}:x='{links}':y=0,scale={W}:{H}:flags=lanczos,setsar=1[v0];"
        f"[1:v]scale=330:-1[wm];"
        f"[v0][wm]overlay=(W-w)/2:74[v1];"
        f"[v1][2:v]overlay=0:H-{ONDER}:shortest=0[v]",
        "-map", "[v]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
        "-r", "30", "-c:a", "aac", "-b:a", "160k", kern, "-y"], check=True)

    # Uitro as 'n eie stukkie met stil klank, sodat die saamvoeg nie oor 'n
    # ontbrekende klankbaan struikel nie.
    #
    # Die monstertempo MOET by die kern s'n pas. 'n Vaste 48kHz teen 'n bron van
    # 44,1kHz oorleef die -c copy-saamvoeg nie: concat hersample nie, dit plak
    # net, en die speler lees alles teen een tempo. Die klank rek dan met
    # 48000/44100 = 1,088 en loop ver ná die prent — die video was 51,7s en die
    # klank 56,3s.
    tempo = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a:0",
         "-show_entries", "stream=sample_rate", "-of", "default=nw=1:nk=1", kern],
        capture_output=True, text=True, check=True).stdout.strip() or "44100"
    uitro_mp4 = f"{werk}/uitro.mp4"
    subprocess.run([
        "ffmpeg", "-v", "error", "-loop", "1", "-t", str(UITRO_S), "-i", uitro_png,
        "-f", "lavfi", "-t", str(UITRO_S), "-i", f"anullsrc=r={tempo}:cl=stereo",
        "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
        "-r", "30", "-c:a", "aac", "-b:a", "160k", "-shortest", uitro_mp4, "-y"], check=True)

    saam = f"{werk}/saam.txt"
    with open(saam, "w") as f:
        f.write(f"file '{os.path.abspath(kern)}'\nfile '{os.path.abspath(uitro_mp4)}'\n")
    uit = f"{gids}/{naam}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0", "-i", saam,
                    "-c", "copy", "-movflags", "+faststart", uit, "-y"], check=True)
    return uit, apx, links, len(rame)


if __name__ == "__main__":
    bron = sys.argv[1]
    watter = [int(x) for x in sys.argv[2:]]
    segs = json.load(open("transkripsie-sekondes.json"))
    kaart = json.load(open("skoot-kaart.json"))
    shorts = json.load(open("shorts.json"))
    os.makedirs("shorts", exist_ok=True)
    for i, k in enumerate(shorts):
        if watter and i not in watter:
            continue
        uit, apx, links, n = maak(i, k, segs, kaart, bron, "shorts")
        mb = os.path.getsize(uit) / 1e6
        beweeg = "beweeg" if isinstance(links, str) and "if(" in links else "vas"
        print(f"{i:2d} {k['titel'][:34]:34s} ap={apx:.2f} snit={beweeg:6s} {n:3d} woordrame  {mb:.1f}MB  {uit}")
