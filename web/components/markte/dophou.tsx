"use client";

import { useEffect, useRef, useState } from "react";
import type { Kwotasie } from "@/lib/markets/source";
import { formatteerPrys, Pyl } from "@/components/markte/format";
import { supabaseBrowser } from "@/lib/supabase/client";

type DopItem = { id?: string; simbool: string; naam?: string };
type SoekResultaat = { simbool: string; naam: string; beurs: string };

const SLEUTEL = "buitelyn-dophou";

/** "Hou My Dop" — persoonlike dophoulys: voeg enige tikker by, live prys +
 *  dagbeweging, ✕ om te verwyder. DB wanneer ingeteken, blaaier andersins. */
export function HouMyDop({
  kwotasies,
  onVerander,
}: {
  kwotasies: Map<string, Kwotasie>;
  onVerander: (simbole: string[]) => void;
}) {
  const [items, setItems] = useState<DopItem[]>([]);
  const [gebruikerId, setGebruikerId] = useState<string | null>(null);
  const [soek, setSoek] = useState("");
  const [resultate, setResultate] = useState<SoekResultaat[]>([]);
  const soekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sb = supabaseBrowser();

  useEffect(() => {
    try {
      const gestoor = JSON.parse(localStorage.getItem(SLEUTEL) ?? "[]");
      if (Array.isArray(gestoor)) {
        setItems(gestoor);
        onVerander(gestoor.map((i: DopItem) => i.simbool));
      }
    } catch {
      /* begin oor */
    }
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setGebruikerId(data.user?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sb || !gebruikerId) return;
    (async () => {
      // Blaaier-items skuif eenmalig saam
      let plaaslik: DopItem[] = [];
      try {
        plaaslik = JSON.parse(localStorage.getItem(SLEUTEL) ?? "[]");
      } catch {
        /* niks */
      }
      if (Array.isArray(plaaslik) && plaaslik.length) {
        await sb.from("dophou").upsert(
          plaaslik.map((i) => ({ user_id: gebruikerId, simbool: i.simbool, naam: i.naam ?? null })),
          { onConflict: "user_id,simbool", ignoreDuplicates: true }
        );
        localStorage.removeItem(SLEUTEL);
      }
      const { data } = await sb.from("dophou").select("id, simbool, naam").order("geskep_at");
      const rye: DopItem[] = (data ?? []).map((r) => ({
        id: r.id,
        simbool: r.simbool,
        naam: r.naam ?? undefined,
      }));
      setItems(rye);
      onVerander(rye.map((i) => i.simbool));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gebruikerId]);

  function stoor(nuut: DopItem[]) {
    setItems(nuut);
    if (!gebruikerId) localStorage.setItem(SLEUTEL, JSON.stringify(nuut));
    onVerander(nuut.map((i) => i.simbool));
  }

  function soekTikker(q: string) {
    setSoek(q);
    if (soekTimer.current) clearTimeout(soekTimer.current);
    if (q.trim().length < 2) {
      setResultate([]);
      return;
    }
    soekTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/markte/soek?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) setResultate((await res.json()).resultate ?? []);
      } catch {
        /* stil */
      }
    }, 300);
  }

  async function voegBy(keuse: { simbool: string; naam: string }) {
    setSoek("");
    setResultate([]);
    if (items.some((i) => i.simbool === keuse.simbool)) return;
    const nuwe: DopItem = { simbool: keuse.simbool, naam: keuse.naam };
    if (sb && gebruikerId) {
      const { data } = await sb
        .from("dophou")
        .insert({ user_id: gebruikerId, simbool: nuwe.simbool, naam: nuwe.naam ?? null })
        .select("id")
        .single();
      nuwe.id = data?.id ?? undefined;
    }
    stoor([...items, nuwe]);
  }

  function rouTikker() {
    const rou = soek.trim().toUpperCase();
    if (/^[A-Z0-9^][A-Z0-9.^=-]{0,11}$/.test(rou)) voegBy({ simbool: rou, naam: rou });
  }

  async function verwyder(indeks: number) {
    const ry = items[indeks];
    if (sb && gebruikerId && ry?.id) await sb.from("dophou").delete().eq("id", ry.id);
    stoor(items.filter((_, j) => j !== indeks));
  }

  return (
    <section className="mb-6 border-2 border-ink bg-offwhite">
      <h2 className="flex items-center gap-2 border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
        HOU MY DOP
        <span aria-hidden className="size-1.5 rounded-full bg-red" />
      </h2>

      {items.length > 0 ? (
        <ul className="divide-y divide-ink/10">
          {items.map((item, i) => {
            const k = kwotasies.get(item.simbool);
            const d = k?.deltaPersent ?? null;
            return (
              <li key={item.simbool} className="flex items-baseline gap-3 px-4 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {item.naam ?? item.simbool}
                </span>
                {k ? (
                  <span className="font-bold tabular-nums">{formatteerPrys(k)}</span>
                ) : (
                  <span className="text-xs text-ink/40">laai…</span>
                )}
                {d != null ? (
                  <span
                    className={`flex w-24 items-center justify-end gap-1.5 text-sm font-semibold tabular-nums ${
                      d >= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    <Pyl op={d >= 0} />
                    {d >= 0 ? "+" : ""}
                    {d.toFixed(2)}%
                  </span>
                ) : (
                  <span className="w-24" />
                )}
                <button
                  onClick={() => verwyder(i)}
                  className="text-xs font-semibold text-red/70 hover:text-red"
                  aria-label={`Verwyder ${item.simbool}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-ink/50">
          Voeg tikkers by wat jy wil dophou — pryse wys live.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          rouTikker();
        }}
        className="border-t border-ink/15 px-4 py-3"
      >
        <div className="relative max-w-md">
          <input
            value={soek}
            onChange={(e) => soekTikker(e.target.value)}
            placeholder="Soek aandeel of tikker om dop te hou…"
            className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
          />
          {resultate.length > 0 ? (
            <ul className="absolute inset-x-0 top-full z-10 border-2 border-t-0 border-ink bg-offwhite">
              {resultate.map((r) => (
                <li key={r.simbool}>
                  <button
                    type="button"
                    onClick={() => voegBy(r)}
                    className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left text-sm hover:bg-ink hover:text-offwhite"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.naam}</span>
                    <span className="text-xs tabular-nums opacity-60">{r.simbool}</span>
                    {r.beurs ? (
                      <span className="text-[10px] tracking-wide opacity-50">{r.beurs.toUpperCase()}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </form>
    </section>
  );
}
