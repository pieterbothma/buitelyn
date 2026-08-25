import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type KaartStuk } from "@/lib/konsep-stories";
import { renderKaart } from "@/lib/kaart/render";
import type { Kaart } from "@/lib/kaart/spec";

/** Render 'n branded poskaart as PNG-buffer (gedeel deur die kaart-roete en
 *  die audiogram-video-pyplyn).
 *
 *  Dit is nou 'n dun aansluiting op die styl-register: die ou uitleg is die
 *  "kop-beeld"-styl sonder 'n beeld. Die handtekening bly onveranderd sodat
 *  /api/sosiaal/kaart en /api/sosiaal/video niks hoef te weet nie. */
export async function renderKaartPng(stuk: KaartStuk, datum: string, portret: boolean): Promise<Buffer> {
  const kaart: Kaart = {
    vorm: portret ? "portret" : "vierkant",
    vel: "paper",
    merk: true,
    spec: {
      styl: "kop-beeld",
      uitleg: "beeld-bo",
      etiket: "",
      kop: stuk.kop,
      byskrif: stuk.byskrif,
      beeld: null,
    },
  };
  return renderKaart(kaart, { datum });
}

/** Render 'n opskrif as deursigtige PNG in League Spartan (vir composiet
 *  bo-op spotprente — regte tipografie i.p.v. AI-teks). */
export async function renderOpskrifPng(teks: string, wydte: number, hoogte: number): Promise<Buffer> {
  const bold = await readFile(path.join(process.cwd(), "assets/LeagueSpartan-700.ttf"));
  const fontSize = teks.length > 34 ? Math.round(wydte / 16) : Math.round(wydte / 12);
  const res = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `0 ${Math.round(wydte * 0.05)}px`,
          fontFamily: "LeagueSpartan",
          fontSize,
          fontWeight: 700,
          color: "#1A1A1A",
          lineHeight: 1.05,
          textAlign: "center",
        }}
      >
        {teks}
      </div>
    ),
    {
      width: wydte,
      height: hoogte,
      fonts: [{ name: "LeagueSpartan", data: bold, weight: 700 }],
    }
  );
  return Buffer.from(await res.arrayBuffer());
}
