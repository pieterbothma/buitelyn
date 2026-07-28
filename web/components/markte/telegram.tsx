"use client";

import { useCallback, useEffect, useState } from "react";

type Voorkeure = { oggend: boolean; middag: boolean; aand: boolean; skuiwers: boolean };
type Status = { gekoppel: boolean; kode: string | null; voorkeure: Voorkeure | null };

const UITGAWES: { veld: keyof Voorkeure; naam: string; tyd: string }[] = [
  { veld: "oggend", naam: "Oggendoorsig", tyd: "±06:50" },
  { veld: "middag", naam: "Middagoorsig", tyd: "±11:50" },
  { veld: "aand", naam: "Dagopsomming", tyd: "±17:50" },
];

export function TelegramKoppel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [besig, setBesig] = useState(false);

  const laai = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/koppel");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* volgende poging */
    }
  }, []);

  useEffect(() => {
    laai();
  }, [laai]);

  // Terwyl 'n kode uitstaande is: kort poll sodat die blad vanself
  // omslaan sodra die bot die koppeling bevestig.
  useEffect(() => {
    if (!status || status.gekoppel || !status.kode) return;
    const id = setInterval(laai, 4000);
    return () => clearInterval(id);
  }, [status, laai]);

  const kryKode = async () => {
    setBesig(true);
    try {
      const res = await fetch("/api/telegram/koppel", { method: "POST" });
      if (res.ok) await laai();
    } finally {
      setBesig(false);
    }
  };

  const stel = async (veld: keyof Voorkeure, waarde: boolean) => {
    setStatus((s) =>
      s?.voorkeure ? { ...s, voorkeure: { ...s.voorkeure, [veld]: waarde } } : s
    );
    await fetch("/api/telegram/koppel", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [veld]: waarde }),
    });
  };

  const ontkoppel = async () => {
    setBesig(true);
    try {
      await fetch("/api/telegram/koppel", { method: "DELETE" });
      await laai();
    } finally {
      setBesig(false);
    }
  };

  if (!status) return <p className="py-8 text-sm text-ink/50">Laai…</p>;

  if (!status.gekoppel) {
    return (
      <div className="max-w-xl border-2 border-ink bg-offwhite p-6">
        <p className="text-xs font-semibold tracking-[0.16em]">
          KOPPEL JOU TELEGRAM
          <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          Koppel @buitelynbot — dan stuur ek jou markte-oorsig klankgrepe: oggend, middag en
          ná sluitingstyd. Later ook kennisgewings oor die grootste bewegers.
        </p>
        {status.kode ? (
          <div className="mt-4">
            <p className="text-sm">
              Jou eenmalige kode (15 min geldig):{" "}
              <span className="border border-ink bg-paper px-2 py-0.5 font-mono text-base font-bold tracking-widest">
                {status.kode}
              </span>
            </p>
            <a
              href={`https://t.me/buitelynbot?start=${status.kode}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block border-2 border-ink bg-ink px-4 py-2 text-sm font-bold text-offwhite hover:bg-red hover:border-red"
            >
              Maak Telegram oop en koppel →
            </a>
            <p className="mt-2 text-xs text-ink/50">
              Die skakel stuur die kode vanself vir die bot. Op &apos;n ander toestel? Stuur{" "}
              <span className="font-mono">/start {status.kode}</span> vir @buitelynbot. Hierdie
              blad slaan vanself om sodra jy gekoppel is.
            </p>
          </div>
        ) : (
          <button
            onClick={kryKode}
            disabled={besig}
            className="mt-4 border-2 border-ink bg-ink px-4 py-2 text-sm font-bold text-offwhite hover:bg-red hover:border-red disabled:opacity-50"
          >
            {besig ? "Besig…" : "Kry koppel-kode"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-xl border-2 border-ink bg-offwhite p-6">
      <p className="text-xs font-semibold tracking-[0.16em]">
        TELEGRAM GEKOPPEL
        <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-green align-middle" />
      </p>
      <p className="mt-2 text-sm text-ink/70">
        Kies watter uitgawes @buitelynbot vir jou moet stuur (net beursdae):
      </p>
      <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/20">
        {UITGAWES.map((u) => (
          <li key={u.veld} className="flex items-center justify-between py-2.5">
            <span className="text-sm font-semibold">
              {u.naam} <span className="font-normal text-ink/50">{u.tyd}</span>
            </span>
            <button
              role="switch"
              aria-checked={status.voorkeure?.[u.veld] ?? false}
              onClick={() => stel(u.veld, !(status.voorkeure?.[u.veld] ?? false))}
              className={`h-6 w-11 border-2 border-ink p-0.5 transition-colors ${
                status.voorkeure?.[u.veld] ? "bg-green" : "bg-paper"
              }`}
            >
              <span
                className={`block h-full w-4 bg-ink transition-transform ${
                  status.voorkeure?.[u.veld] ? "translate-x-5" : ""
                }`}
              />
            </button>
          </li>
        ))}
        <li className="flex items-center justify-between py-2.5 opacity-50">
          <span className="text-sm font-semibold">
            Grootste bewegers <span className="font-normal text-ink/50">binnekort</span>
          </span>
          <span className="text-xs tracking-[0.14em]">BINNEKORT</span>
        </li>
      </ul>
      <button
        onClick={ontkoppel}
        disabled={besig}
        className="mt-4 border border-ink/30 bg-paper px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-red hover:text-red disabled:opacity-50"
      >
        Ontkoppel
      </button>
    </div>
  );
}
