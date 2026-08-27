#!/usr/bin/env python3
"""Woordtye: skat, maar ANKER by die pouses wat werklik in die klank is.

DIE PROBLEEM
Die eerste weergawe het elke segment se duur eweredig oor sy woorde versprei.
Dit dryf binne 'n segment en spring dan reg by die volgende segment se anker —
presies "dit verloor sync, dan tel dit weer op". Gemeet: die spreektempo wissel
0,15s tot 0,59s per woord tussen segmente, 'n verskil van 3,9x.

DIE DOODLOOPSTRAAT
Die tweede poging het probeer om ELKE woordgrens uit die energie te meet: kies
die n-1 stilste rame. Dit is verkeerd, en die klank self wys hoekom. In een
segment van 16 woorde (15 grense nodig) is daar 13 stil stukkies, en die meeste
is 30-90ms — dit is plofklanke BINNE woorde, nie gapings tussen hulle nie. Net
drie was lank genoeg om 'n regte pouse te wees. Spraak loop aanmekaar; dwing jy
15 grense af, versin jy gapings wat nie bestaan nie.

DIE ANTWOORD
Meet waar daar bewyse is, skat waar daar nie is nie. 'n Pouse van meer as
POUSE_MS is 'n regte grens — ons anker 'n woordgrens daar vas. Tussen ankers
versprei ons die woorde volgens lengte, soos voorheen.

Die wins is nie 'n perfekte belyning nie; dis MEER ANKERS. Die skatting kan nou
net tussen twee pouses dryf in plaas van oor 'n hele segment, en elke pouse tel
dit weer op.
"""
import array
import subprocess

RAAM_MS = 10
POUSE_MS = 150        # korter as dit is 'n plofklank, nie 'n woordgrens nie
DREMPEL = 0.12        # van die segment se piek-RMS


def _omhulsel(oud, begin, duur):
    rou = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", str(begin), "-t", str(duur), "-i", oud,
         "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
        capture_output=True, check=True).stdout
    m = array.array("h")
    m.frombytes(rou[: len(rou) - (len(rou) % 2)])
    per = int(16000 * RAAM_MS / 1000)
    return [(sum(v * v for v in m[i:i + per]) / per) ** 0.5
            for i in range(0, len(m) - per, per)]


def _pouses(omh, duur):
    """Die middelpunt van elke stilte wat lank genoeg is om 'n woordgrens te wees."""
    if not omh:
        return []
    drempel = max(omh) * DREMPEL
    runs, uit = [], []
    for i, v in enumerate(omh):
        if v < drempel:
            if runs and i == runs[-1][1] + 1:
                runs[-1][1] = i
            else:
                runs.append([i, i])
    for a, b in runs:
        if (b - a + 1) * RAAM_MS < POUSE_MS:
            continue
        t = (a + b) / 2 * RAAM_MS / 1000
        # Stilte heel voor of heel agter is nie 'n grens tussen woorde nie.
        if 0.15 < t < duur - 0.15:
            uit.append(t)
    return uit


def _versprei(woorde, t0, t1):
    """Woorde eweredig oor 'n venster, volgens lengte."""
    tot = sum(len(w) + 1 for w in woorde)
    uit, t = [], t0
    for w in woorde:
        deel = (t1 - t0) * (len(w) + 1) / tot
        uit.append((w, t, t + deel))
        t += deel
    return uit


def woordtye(segs, oud):
    uit = []
    for s in segs:
        woorde = s["teks"].split()
        if not woorde:
            continue
        t0 = s["begin"]
        duur = max(0.4, s["einde"] - t0)

        try:
            pouses = _pouses(_omhulsel(oud, t0, duur), duur)
        except Exception:
            pouses = []

        # Meer pouses as gapings tussen woorde kan nie wees nie — hou die
        # langstes en laat die res, hulle is klankartefakte.
        pouses = sorted(pouses)[: max(0, len(woorde) - 1)]

        if not pouses:
            dele = _versprei(woorde, 0.0, duur)
        else:
            # Deel die woorde tussen die ankers op volgens hoeveel TYD elke
            # stukkie kry — 'n lang stuk kry meer woorde as 'n kort een.
            rande = [0.0] + pouses + [duur]
            stukke = [(rande[i], rande[i + 1]) for i in range(len(rande) - 1)]
            oor = len(woorde)
            per_stuk, gebruik = [], 0
            for k, (a, b) in enumerate(stukke):
                if k == len(stukke) - 1:
                    n = oor - gebruik
                else:
                    n = max(1, round(len(woorde) * (b - a) / duur))
                    n = min(n, oor - gebruik - (len(stukke) - k - 1))
                per_stuk.append(max(0, n))
                gebruik += per_stuk[-1]
            dele, i = [], 0
            for (a, b), n in zip(stukke, per_stuk):
                if n <= 0:
                    continue
                dele += _versprei(woorde[i:i + n], a, b)
                i += n

        ry = [{"w": w, "i": k, "begin": t0 + a, "einde": t0 + b}
              for k, (w, a, b) in enumerate(dele)]
        uit.append(ry)
    return uit
