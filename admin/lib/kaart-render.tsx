import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type KaartStuk } from "@/lib/konsep-stories";

/** Render 'n branded poskaart as PNG-buffer (gedeel deur die kaart-roete en
 *  die audiogram-video-pyplyn). */
export async function renderKaartPng(stuk: KaartStuk, datum: string, portret: boolean): Promise<Buffer> {
  const [medium, bold] = await Promise.all([
    readFile(path.join(process.cwd(), "assets/LeagueSpartan-500.ttf")),
    readFile(path.join(process.cwd(), "assets/LeagueSpartan-700.ttf")),
  ]);
  const datumWoorde = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${datum}T12:00:00Z`));

  const res = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#EBEAE6",
          padding: 64,
          fontFamily: "LeagueSpartan",
          color: "#1A1A1A",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            border: "6px solid #1A1A1A",
            backgroundColor: "#F7F6F2",
            padding: 56,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 4 }}>BUITELYN</div>
            <div style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: "#F03028", display: "flex" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 28 }}>
            <div style={{ fontSize: stuk.kop.length > 40 ? 72 : 88, fontWeight: 700, lineHeight: 1.05 }}>
              {stuk.kop}
            </div>
            {stuk.byskrif ? (
              <div style={{ fontSize: 40, fontWeight: 500, color: "#57565299", lineHeight: 1.3 }}>
                {stuk.byskrif}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "3px solid #1A1A1A",
              paddingTop: 24,
              fontSize: 28,
              fontWeight: 500,
              color: "#575652",
            }}
          >
            <div style={{ display: "flex" }}>{datumWoorde}</div>
            <div style={{ display: "flex", fontWeight: 700, color: "#1A1A1A" }}>buitelyn.com/markte</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: portret ? 1350 : 1080,
      fonts: [
        { name: "LeagueSpartan", data: medium, weight: 500 },
        { name: "LeagueSpartan", data: bold, weight: 700 },
      ],
    }
  );
  return Buffer.from(await res.arrayBuffer());
}
