"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Die markte-hek se inteken-vorm: wagwoord, rekening skep, herstel,
 *  Google, of 'n magic link. Na 'n geslaagde inteken verfris ons die
 *  bediener-render sodat die terminaal verskyn. */
export function TekenIn() {
  const [epos, setEpos] = useState("");
  const [wagwoord, setWagwoord] = useState("");
  const [modus, setModus] = useState<"in" | "nuut" | "vergeet">("in");
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [skakelGestuur, setSkakelGestuur] = useState(false);
  const router = useRouter();
  const sb = supabaseBrowser();

  if (!sb) return null;

  async function indien() {
    if (!sb || !/.+@.+\..+/.test(epos)) return;
    setBoodskap(null);
    if (modus === "vergeet") {
      const { error } = await sb.auth.resetPasswordForEmail(epos.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm`,
      });
      if (error) setBoodskap(error.message);
      else setSkakelGestuur(true);
      return;
    }
    if (!wagwoord) return;
    if (modus === "nuut") {
      const { data, error } = await sb.auth.signUp({
        email: epos.trim(),
        password: wagwoord,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      if (error) setBoodskap(error.message);
      else if (data.session) router.refresh();
      else setSkakelGestuur(true); // e-posbevestiging eers
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email: epos.trim(), password: wagwoord });
    if (error) setBoodskap("Verkeerde epos of wagwoord.");
    else router.refresh();
  }

  async function google() {
    if (!sb) return;
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/confirm` },
    });
  }

  async function magicSkakel() {
    if (!sb || !/.+@.+\..+/.test(epos)) {
      setBoodskap("Vul eers jou epos in.");
      return;
    }
    const { error } = await sb.auth.signInWithOtp({
      email: epos.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) setBoodskap(error.message);
    else setSkakelGestuur(true);
  }

  if (skakelGestuur) {
    return (
      <p className="border-2 border-ink/30 bg-paper p-4 text-sm text-ink/70">
        Kyk in jou inbox — ons het &apos;n skakel gestuur.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        indien();
      }}
      className="space-y-3"
    >
      <button
        type="button"
        onClick={google}
        className="w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm font-semibold hover:bg-ink hover:text-offwhite"
      >
        Teken in met Google
      </button>
      <p className="text-center text-[11px] tracking-[0.2em] text-ink/40">OF</p>
      <input
        type="email"
        value={epos}
        onChange={(e) => setEpos(e.target.value)}
        placeholder="jou@epos.co.za"
        className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
      />
      {modus !== "vergeet" ? (
        <input
          type="password"
          value={wagwoord}
          onChange={(e) => setWagwoord(e.target.value)}
          placeholder={modus === "nuut" ? "Kies 'n wagwoord (minstens 8)" : "Wagwoord"}
          className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
        />
      ) : null}
      <button className="w-full bg-ink px-3 py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85">
        {modus === "nuut" ? "Skep rekening" : modus === "vergeet" ? "Stuur herstel-skakel" : "Teken in"}
      </button>
      {boodskap ? <p className="text-xs text-red">{boodskap}</p> : null}
      <p className="flex flex-wrap justify-center gap-3 text-xs text-ink/60">
        {modus !== "nuut" ? (
          <button type="button" onClick={() => setModus("nuut")} className="underline underline-offset-2 hover:text-ink">
            Skep &apos;n rekening
          </button>
        ) : (
          <button type="button" onClick={() => setModus("in")} className="underline underline-offset-2 hover:text-ink">
            Het reeds &apos;n rekening? Teken in
          </button>
        )}
        {modus !== "vergeet" ? (
          <button type="button" onClick={() => setModus("vergeet")} className="underline underline-offset-2 hover:text-ink">
            Wagwoord vergeet?
          </button>
        ) : null}
        <button type="button" onClick={magicSkakel} className="underline underline-offset-2 hover:text-ink">
          Stuur eerder &apos;n teken-in-skakel
        </button>
      </p>
    </form>
  );
}
