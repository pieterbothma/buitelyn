import { NextResponse, type NextRequest } from "next/server";

/* Een hek vir al die cron-roetes.
   Dertien kopieë van 'n sekuriteitskontrole is self die fout, en hierdie
   dertien het in twee verskillende rigtings OOP geval sodra CRON_SECRET
   ontbreek — wat op elke omgewing behalwe Production die geval is:

     tien:  auth !== `Bearer ${process.env.CRON_SECRET}`
            → vergelyk teen die string "Bearer undefined", dus kom enigiemand
              in wat presies daardie kopstuk stuur.

     drie:  if (process.env.CRON_SECRET && auth !== ...)
            → die hele voorwaarde is vals, dus is daar glad geen kontrole nie.

   Albei is oop-val. Op 'n publieke voorskou-ontplooiing met die diens-sleutel
   sou dit beteken het dat 'n vreemdeling die crons kan afvuur teen die LEWENDE
   ap-hq-databasis — markte-opruim inkluis.

   Hier val dit toe: geen geheim, geen toegang. Vercel se cron loop net op
   Production, dus is 'n voorskou wat 503 antwoord presies die regte gedrag —
   'n voorskou hoort nooit produksiedata te skryf nie. */
export function cronGeweier(request: NextRequest): NextResponse | null {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) {
    return NextResponse.json({ fout: "cron nie in hierdie omgewing opgestel nie" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${geheim}`) {
    return NextResponse.json({ fout: "nee" }, { status: 401 });
  }
  return null;
}
