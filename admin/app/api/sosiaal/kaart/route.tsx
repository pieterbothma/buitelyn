import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { supabaseServer } from "@/lib/supabase/server";
import { parseerKonsepStories } from "@/lib/konsep-stories";

export const maxDuration = 60;

/* Branded sosiale-poskaart uit die dag se konsep: kop + byskrif in die
   Buitelyn-taal (papier/ink/rooi, League Spartan), pixel-perfek elke keer. */
export async function GET(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new Response("verbode", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const datum =
    sp.get("datum") ??
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const i = Number(sp.get("i") ?? 0);
  const portret = sp.get("vorm") === "portret";

  const { data: konsep } = await sb
    .from("nuusbrief_konsepte")
    .select("teks")
    .eq("datum", datum)
    .maybeSingle();
  if (!konsep?.teks) return new Response("geen konsep", { status: 404 });
  const stuk = parseerKonsepStories(konsep.teks)[i];
  if (!stuk) return new Response("geen storie", { status: 404 });

  const [medium, bold] = await Promise.all([
    readFile(path.join(process.cwd(), "assets/LeagueSpartan-500.ttf")),
    readFile(path.join(process.cwd(), "assets/LeagueSpartan-700.ttf")),
  ]);

  const w = 1080;
  const h = portret ? 1350 : 1080;
  const datumWoorde = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${datum}T12:00:00Z`));

  return new ImageResponse(
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
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: "#F03028",
                display: "flex",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              gap: 28,
            }}
          >
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
      width: w,
      height: h,
      fonts: [
        { name: "LeagueSpartan", data: medium, weight: 500 },
        { name: "LeagueSpartan", data: bold, weight: 700 },
      ],
    }
  );
}
