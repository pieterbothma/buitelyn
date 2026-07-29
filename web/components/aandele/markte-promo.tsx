import Link from "next/link";

/* Die verkoopsblok op publieke aandeelblaaie: elke kaart is 'n miniatuur
   "skermskoot" van die regte /markte-UI — dieselfde ontwerptaal, sodat wat
   jy sien presies is wat jy kry. Alles staties (geen JS-las). */

function Kaart({
  titel,
  blurb,
  children,
}: {
  titel: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="border-2 border-ink bg-paper p-3">{children}</div>
      <p className="mt-2 text-sm font-bold">{titel}</p>
      <p className="mt-0.5 text-sm leading-snug text-ink/70">{blurb}</p>
    </div>
  );
}

function MiniKop({ teks }: { teks: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.14em] text-ink/50">
      {teks}
      <span aria-hidden className="size-1 rounded-full bg-red" />
    </p>
  );
}

export function MarktePromo() {
  return (
    <section className="mt-10">
      <div className="border-y-2 border-ink py-3">
        <h2 className="text-xl font-extrabold tracking-tight">
          Alles op Buitelyn Markte
          <span aria-hidden className="ml-2 inline-block size-2 rounded-full bg-red align-middle" />
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          Gratis, in Afrikaans — so lyk dit binne:
        </p>
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-7 md:grid-cols-2">
        {/* 1. Portefeulje */}
        <Kaart
          titel="Jou portefeulje — regstreeks in rand"
          blurb="Volg jou aandele (ook oorsese) met waarde-oor-tyd, toewysing en wins/verlies — alles outomaties in rand omgereken."
        >
          <MiniKop teks="MY PORTEFEULJE" />
          <p className="mt-1 text-lg font-extrabold tabular-nums">R 284 350</p>
          <p className="text-[10px] font-semibold tabular-nums text-green">▲ +R 3 120 vandag · +12,4% sedert koop</p>
          <svg viewBox="0 0 200 36" className="mt-1.5 w-full">
            <polyline
              points="0,30 20,28 40,31 60,24 80,25 100,18 120,20 140,14 160,16 180,9 200,6"
              fill="none"
              stroke="var(--brand-green)"
              strokeWidth="2"
            />
            <line x1="0" x2="200" y1="32" y2="32" stroke="#1A1A1A" strokeOpacity="0.2" strokeDasharray="3 3" />
          </svg>
          <div className="mt-1.5 space-y-1 border-t border-ink/10 pt-1.5">
            {[
              ["Naspers × 10", "R 8 557", "+4,00%", true],
              ["Apple × 5", "R 31 190", "+1,21%", true],
              ["Sasol × 120", "R 22 640", "−2,78%", false],
            ].map(([n, w, d, op]) => (
              <p key={n as string} className="flex items-baseline gap-2 text-[10px] tabular-nums">
                <span className="min-w-0 flex-1 truncate font-semibold">{n}</span>
                <span className="text-ink/60">{w}</span>
                <span className={`w-12 text-right font-bold ${op ? "text-green" : "text-red"}`}>{d}</span>
              </p>
            ))}
          </div>
        </Kaart>

        {/* 2. Die Buitelyn Bot */}
        <Kaart
          titel="Die Buitelyn Bot"
          blurb="Klets met Buitelyn oor die nuutste verwikkelinge in die aandelemark of jou portefeulje — op die webwerf én op Telegram."
        >
          <MiniKop teks="VRA BUITELYN" />
          <div className="mt-2 space-y-2">
            <p className="ml-auto w-fit max-w-[85%] border border-ink/20 bg-offwhite px-2 py-1 text-[10px]">
              Hoekom is Sasol af vandag?
            </p>
            <div className="w-fit max-w-[92%] border-2 border-ink bg-white px-2 py-1.5 text-[10px] leading-snug">
              Sasol het 2,78% gedaal, grootliks omdat Brent-ru-olie vannag byna 5% teruggesak
              het — energie-aandele wêreldwyd is onder druk. Jou 120 aandele is vandag sowat
              R647 minder werd.
            </div>
            <p className="ml-auto w-fit max-w-[85%] border border-ink/20 bg-offwhite px-2 py-1 text-[10px]">
              En hoe lyk my portefeulje?
            </p>
            <p className="text-[9px] text-ink/40">Buitelyn tik…</p>
          </div>
        </Kaart>

        {/* 3. Bewegers */}
        <Kaart
          titel="Grootste Bewegers — met 'n rede"
          blurb="Elke groot JSE-skuif kry 'n KI-nota wat sê hóékom, gegrond op regte nuus — nie raaiwerk nie."
        >
          <MiniKop teks="GROOTSTE BEWEGERS" />
          <div className="mt-1.5 space-y-1.5">
            <div className="relative py-0.5">
              <div aria-hidden className="absolute inset-y-0 left-0 w-[85%] bg-red/15" />
              <p className="relative flex items-baseline gap-2 text-[10px] tabular-nums">
                <span className="font-bold text-ink/50">1</span>
                <span className="min-w-0 flex-1 truncate font-semibold">Thungela</span>
                <span className="font-bold text-red">▼ −5,42%</span>
              </p>
              <p className="relative pl-4 text-[9px] leading-snug text-ink/60">
                Geen duidelike maatskappynuus nie — lyk na 'n breër steenkoolsektor-beweging.
              </p>
            </div>
            <div className="relative py-0.5">
              <div aria-hidden className="absolute inset-y-0 left-0 w-[64%] bg-red/15" />
              <p className="relative flex items-baseline gap-2 text-[10px] tabular-nums">
                <span className="font-bold text-ink/50">2</span>
                <span className="min-w-0 flex-1 truncate font-semibold">Impala Platinum</span>
                <span className="font-bold text-red">▼ −4,10%</span>
              </p>
              <p className="relative pl-4 text-[9px] leading-snug text-ink/60">
                Die daling volg op Implats se veiligheidsstilstand by Rustenburg.
              </p>
            </div>
            <div className="relative py-0.5">
              <div aria-hidden className="absolute inset-y-0 left-0 w-[58%] bg-green/15" />
              <p className="relative flex items-baseline gap-2 text-[10px] tabular-nums">
                <span className="font-bold text-ink/50">3</span>
                <span className="min-w-0 flex-1 truncate font-semibold">Reinet</span>
                <span className="font-bold text-green">▲ +3,83%</span>
              </p>
              <p className="relative pl-4 text-[9px] leading-snug text-ink/60">
                Reinet het nóg JSE-aandeleterugkope aangekondig.
              </p>
            </div>
          </div>
        </Kaart>

        {/* 4. Nuus + dagoorsig + klank */}
        <Kaart
          titel="Nuus en die dagoorsig — ook as klank"
          blurb="Die SA-sakenuus met Afrikaanse opsommings, 'n uurlikse markoorsig, en drie klankgrepe per dag om na te luister."
        >
          <MiniKop teks="VANDAG OP DIE MARKTE" />
          <p className="mt-1 text-[10px] leading-snug text-ink/80">
            Die JSE sluit vandag effens hoër met Naspers wat 4% klim; die rand hou stand teen
            sestien rand sewentig, en goud blink weer…
          </p>
          <div className="mt-1.5 flex items-center gap-2 border border-ink/20 bg-offwhite px-2 py-1">
            <span aria-hidden className="flex size-4 items-center justify-center rounded-full bg-ink text-[7px] text-offwhite">▶</span>
            <span className="h-1 flex-1 rounded-full bg-ink/15">
              <span className="block h-1 w-1/3 rounded-full bg-red" />
            </span>
            <span className="text-[8px] tabular-nums text-ink/50">1:04 / 2:48</span>
          </div>
          <div className="mt-1.5 space-y-1 border-t border-ink/10 pt-1.5">
            <p className="text-[9px] tracking-[0.1em] text-ink/40">MONEYWEB · 14:02</p>
            <p className="text-[10px] font-bold leading-snug">Vodacom hanteer daagliks R25 miljard se transaksies via selfone</p>
            <p className="text-[9px] tracking-[0.1em] text-ink/40">DAILY INVESTOR · 12:47</p>
            <p className="text-[10px] font-bold leading-snug">Gupta-gekoppelde Optimum-myn herleef met R3 miljard-belegging</p>
          </div>
        </Kaart>

        {/* 5. SENS */}
        <Kaart
          titel="SENS in Afrikaans"
          blurb="Elke JSE-aankondiging in een verstaanbare Afrikaanse sin — met jou eie aandele gemerk, en 'n dividend-kalender wat vir jou onthou."
        >
          <MiniKop teks="SENS" />
          <div className="mt-1.5 space-y-1.5">
            {[
              ["17:05", "NPN", "Naspers het 986 509 aandele vir sowat R803,7 miljoen teruggekoop.", true],
              ["17:05", "PRX", "Prosus het 2,19 miljoen aandele teruggekoop as deel van sy program.", false],
              ["16:36", "SBK", "Standard Bank verklaar 'n tussentydse dividend van R7,60 per aandeel — LDT 12 Augustus.", true],
            ].map(([tyd, kode, teks, myne]) => (
              <p key={teks as string} className="flex items-start gap-1.5 text-[10px] leading-snug">
                <span className="tabular-nums text-ink/40">{tyd}</span>
                <span className="border border-ink/30 bg-offwhite px-1 text-[8px] font-bold">{kode}</span>
                <span className="min-w-0 flex-1 text-ink/80">
                  {teks} {myne ? "⭐" : ""}
                </span>
              </p>
            ))}
          </div>
        </Kaart>

        {/* 6. Telegram */}
        <Kaart
          titel="Telegram-klankgrepe en -waarskuwings"
          blurb="Drie markte-oorsigte per dag as klankgrepe, pryswaarskuwings binne 15 minute, dividend-herinneringe en jou aand-portefeulje-opsomming."
        >
          <MiniKop teks="@BUITELYNBOT" />
          <div className="mt-2 space-y-1.5">
            <div className="w-fit max-w-[92%] border-2 border-ink bg-white px-2 py-1 text-[10px] leading-snug">
              🔴 <span className="font-bold">Goeiemôre, Suid-Afrika!</span>
              <span className="mt-1 flex items-center gap-1.5">
                <span aria-hidden className="flex size-3.5 items-center justify-center rounded-full bg-ink text-[6px] text-offwhite">▶</span>
                <span className="h-0.5 w-20 rounded-full bg-ink/20" />
                <span className="text-[8px] text-ink/50">2:48</span>
              </span>
            </div>
            <div className="w-fit max-w-[92%] border-2 border-ink bg-white px-2 py-1 text-[10px] leading-snug">
              🔔 <span className="font-bold">Naspers</span> is bo jou drempel van R850 — nou R855,66
            </div>
            <div className="w-fit max-w-[92%] border-2 border-ink bg-white px-2 py-1 text-[10px] leading-snug">
              🏆 <span className="font-bold">Jou portefeulje vanaand:</span> R 284 350 (+1,1%) · Beursliga plek 2 van 14
            </div>
          </div>
        </Kaart>

        {/* 7. Beursliga */}
        <Kaart
          titel="Die Beursliga"
          blurb="R100 000 denkbeeldige geld, net JSE-aandele, 'n maandelikse rondte — vroeë aansluiters kry 'n blywende lidnommer."
        >
          <MiniKop teks="RANGLYS — HIERDIE MAAND" />
          <div className="mt-1.5 space-y-1">
            {[
              ["1", "A", "Appel", "#01", "+4,45%", true],
              ["2", "P", "Piet die Bul", "#02", "+2,10%", true],
              ["3", "S", "Sanet", "#07", "−0,80%", false],
            ].map(([pos, av, naam, nr, d, op]) => (
              <p key={naam as string} className="flex items-center gap-1.5 text-[10px] tabular-nums">
                <span className="w-3 font-bold text-ink/40">{pos}</span>
                <span className="flex size-4 items-center justify-center rounded-full border border-ink/30 bg-offwhite text-[7px] font-bold">{av}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {naam} <span className="font-normal text-red">{nr}</span>
                </span>
                <span className={`font-bold ${op ? "text-green" : "text-red"}`}>{d}</span>
              </p>
            ))}
          </div>
        </Kaart>

        {/* 8. Sakgeld */}
        <Kaart
          titel="Sakgeld-sakrekenaars"
          blurb="Verband, petrol, inflasie en spaargroei — voorafgelaai met vandag se amptelike koerse, sodat 'n rentebesluit dadelik jou syfer wys."
        >
          <MiniKop teks="VERBAND-SAKREKENAAR" />
          <div className="mt-1.5 grid grid-cols-3 gap-1 text-[9px]">
            {[
              ["REPOKOERS", "7,00%"],
              ["PRIMA", "10,50%"],
              ["PETROL 95", "R 26,10"],
            ].map(([n, v]) => (
              <div key={n} className="border border-ink/20 bg-offwhite px-1.5 py-1">
                <p className="text-[7px] font-semibold tracking-wide text-ink/50">{n}</p>
                <p className="font-extrabold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10px]">
            R1,5 miljoen oor 20 jaar teen prima:
          </p>
          <p className="text-sm font-extrabold tabular-nums">R 14 975 per maand</p>
          <p className="text-[9px] tabular-nums text-ink/60">As die repokoers met 0,25% styg: +R 247/maand</p>
        </Kaart>
      </div>

      <div className="mt-7 border-2 border-ink bg-offwhite px-5 py-4">
        <Link
          href="/markte"
          className="inline-block border-2 border-ink bg-ink px-5 py-2.5 text-sm font-bold text-offwhite hover:border-red hover:bg-red"
        >
          Maak gratis 'n Buitelyn-rekening oop →
        </Link>
        <span className="ml-3 text-xs text-ink/50">Gratis — net 'n e-posadres nodig. Alles hierbo is ingesluit.</span>
      </div>
    </section>
  );
}
