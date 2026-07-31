import Link from "next/link";
import type { GidsInhoud } from "@/lib/gidse-valideer";
import type { Gids } from "@/lib/gidse";
import { AANDELE } from "@/lib/aandele";
import { SponsorVermelding, magVermeld } from "./sponsor-vermelding";

/* Die borg-vermelding val ná die TWEEDE afdeling — diep genoeg dat die leser
   eers 'n antwoord kry, vroeg genoeg om gesien te word. Presies een keer. */
const NA_AFDELING = 2;

export function GidsInhoudBlok({ inhoud, gids }: { inhoud: GidsInhoud; gids: Gids }) {
  const verwant = inhoud.verwant
    .map((s) => AANDELE.find((a) => a.slug === s))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  /* Struktureel afgedwing, nie net 'n konvensie nie: die inlyn-plek en die
     voetkaart-plek is twee MOONTLIKE liggings vir DIESELFDE enkele
     vermelding, nooit albei tegelyk nie. `sponsorInlynGetoon` word plaaslik
     bereken (geen module-vlak toestand nie — veilig onder gelyktydige
     SSR-versoeke) en die voetkaart-plek word onderdruk sodra die inlyn-plek
     reeds getoon is. Sonder hierdie wagter sou 'n gesponsorde gids die borg
     twee keer wys (inlyn ná afdeling 2 én weer in die voetkaart), wat die
     "hoogstens een keer"-reël oortree. */
  const sponsorInlynGetoon = magVermeld(gids, inhoud.sponsor_konteks) && inhoud.afdelings.length >= NA_AFDELING;

  return (
    <>
      <p className="mt-6 text-lg leading-relaxed text-ink/80">{inhoud.intro}</p>

      {inhoud.afdelings.map((a, n) => (
        <section key={a.kop} className="mt-8">
          <h2 className="text-xl font-extrabold tracking-tight">{a.kop}</h2>
          {a.paragrawe.map((p, m) => (
            <p key={m} className="mt-3 text-[15px] leading-relaxed">
              {p}
            </p>
          ))}
          {n === NA_AFDELING - 1 ? (
            <SponsorVermelding gids={gids} konteks={inhoud.sponsor_konteks} plek="inlyn" />
          ) : null}
        </section>
      ))}

      {verwant.length ? (
        <section className="mt-10 border-t-2 border-ink pt-5">
          <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50">
            AANDELE IN HIERDIE GIDS
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {verwant.map((a) => (
              <Link
                key={a.slug}
                href={`/aandele/${a.slug}`}
                className="border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper"
              >
                {a.naam} &rarr;
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {sponsorInlynGetoon ? null : (
        <SponsorVermelding gids={gids} konteks={inhoud.sponsor_konteks} plek="voetkaart" />
      )}

      <p className="mt-8 border-t border-ink/15 pt-4 text-xs leading-relaxed text-ink/50">
        Buitelyn is nie &apos;n gemagtigde finansiële diensverskaffer nie. Hierdie gids is
        algemene inligting oor hoe dinge werk, nie finansiële advies nie.
      </p>
    </>
  );
}
