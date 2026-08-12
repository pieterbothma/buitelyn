"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Profiel = { naam: string | null; avatar_url: string | null };

/** Nav-kenteken: avatar/voorletters met 'n klein keuselys wanneer ingeteken,
 *  anders 'n Teken in-skakel na die markte-hek.
 *
 *  `knop` maak van die uitgetekende toestand 'n gevulde knoppie i.p.v. 'n
 *  skakel — die tuisblad se koerantkop wil 'n duidelike aksie regs hê. Dis
 *  'n variant hier eerder as 'n tweede komponent, want die inteken-toestand
 *  moet op een plek bly: twee kopieë en die een vergeet 'n dag later dat
 *  iemand reeds ingeteken is. */
export function ProfielKenteken({ knop = false }: { knop?: boolean } = {}) {
  const [epos, setEpos] = useState<string | null>(null);
  const [profiel, setProfiel] = useState<Profiel | null>(null);
  const [oop, setOop] = useState(false);
  const [gelaai, setGelaai] = useState(false);
  const houer = useRef<HTMLDivElement>(null);
  const sb = supabaseBrowser();

  useEffect(() => {
    if (!sb) {
      setGelaai(true);
      return;
    }
    let aktief = true;
    async function laai() {
      const { data } = await sb!.auth.getUser();
      if (!aktief) return;
      if (data.user) {
        setEpos(data.user.email ?? "");
        const { data: p } = await sb!
          .from("profiele")
          .select("naam, avatar_url")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (aktief) setProfiel(p ?? null);
      } else {
        setEpos(null);
        setProfiel(null);
      }
      if (aktief) setGelaai(true);
    }
    laai();
    const { data: luisteraar } = sb.auth.onAuthStateChange(() => laai());
    const toeMaak = (e: MouseEvent) => {
      if (houer.current && !houer.current.contains(e.target as Node)) setOop(false);
    };
    document.addEventListener("click", toeMaak);
    return () => {
      aktief = false;
      luisteraar.subscription.unsubscribe();
      document.removeEventListener("click", toeMaak);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!gelaai) return <span className="size-8" aria-hidden />;

  if (!epos) {
    return knop ? (
      <a
        href="/markte"
        className="bg-ink px-4 py-2 text-[11px] font-bold tracking-[.12em] text-offwhite transition-opacity hover:opacity-85"
      >
        TEKEN IN
      </a>
    ) : (
      <a href="/markte" className="text-[15px] font-semibold underline-offset-4 hover:underline">
        Teken in &rarr;
      </a>
    );
  }

  const naam = profiel?.naam || epos.split("@")[0];
  const voorletters = naam
    .split(/[\s.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((d) => d.charAt(0).toUpperCase())
    .join("");

  return (
    <div ref={houer} className="relative">
      <button
        onClick={() => setOop((o) => !o)}
        aria-label="Profiel"
        className="flex size-9 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-ink text-xs font-bold text-offwhite hover:bg-ink/85"
      >
        {profiel?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profiel.avatar_url} alt={naam} className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          voorletters
        )}
      </button>
      {oop ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 border-2 border-ink bg-offwhite">
          <div className="border-b border-ink/15 px-4 py-3">
            <p className="truncate text-sm font-bold">{naam}</p>
            <p className="truncate text-xs text-ink/50">{epos}</p>
          </div>
          <a href="/profiel" className="block px-4 py-2.5 text-sm font-semibold hover:bg-paper">
            My profiel
          </a>
          <a href="/markte" className="block px-4 py-2.5 text-sm font-semibold hover:bg-paper">
            Markte
          </a>
          <button
            onClick={async () => {
              await sb?.auth.signOut();
              window.location.assign("/");
            }}
            className="block w-full border-t border-ink/15 px-4 py-2.5 text-left text-sm font-semibold text-red hover:bg-paper"
          >
            Teken uit
          </button>
        </div>
      ) : null}
    </div>
  );
}
