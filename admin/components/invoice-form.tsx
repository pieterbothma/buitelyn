"use client";

import { useState, useTransition } from "react";
import { skepFaktuur, type FaktuurLyn } from "@/app/actions-invoices";

type Klient = { id: string; naam: string };
type Lyn = { beskrywing: string; aantal: string; prys: string };

export function InvoiceForm({ slug, kliente }: { slug: string; kliente: Klient[] }) {
  const [clientId, setClientId] = useState(kliente[0]?.id ?? "");
  const [notas, setNotas] = useState("");
  const [lyne, setLyne] = useState<Lyn[]>([{ beskrywing: "", aantal: "1", prys: "" }]);
  const [besig, begin] = useTransition();

  function stel(i: number, veld: keyof Lyn, waarde: string) {
    setLyne((l) => l.map((r, j) => (j === i ? { ...r, [veld]: waarde } : r)));
  }

  const totaal = lyne.reduce(
    (som, l) => som + (parseFloat(l.aantal) || 0) * (parseFloat(l.prys) || 0),
    0
  );

  function stuur() {
    const skoon: FaktuurLyn[] = lyne
      .filter((l) => l.beskrywing.trim() && parseFloat(l.prys) > 0)
      .map((l) => ({
        beskrywing: l.beskrywing.trim(),
        aantal: parseFloat(l.aantal) || 1,
        eenheidsprys_sent: Math.round(parseFloat(l.prys) * 100),
      }));
    if (!clientId || skoon.length === 0) return;
    begin(() => skepFaktuur({ workspaceSlug: slug, clientId, notas, lyne: skoon }));
  }

  return (
    <div className="max-w-2xl space-y-4 border-2 border-ink bg-offwhite p-6">
      <label className="block text-sm font-semibold">
        Kliënt
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-normal"
        >
          {kliente.map((k) => (
            <option key={k.id} value={k.id}>
              {k.naam}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="text-sm font-semibold">Lyne</p>
        {lyne.map((l, i) => (
          <div key={i} className="mt-2 flex gap-2">
            <input
              value={l.beskrywing}
              onChange={(e) => stel(i, "beskrywing", e.target.value)}
              placeholder="Beskrywing"
              className="flex-1 border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
            />
            <input
              value={l.aantal}
              onChange={(e) => stel(i, "aantal", e.target.value)}
              placeholder="Aantal"
              className="w-20 border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
            />
            <input
              value={l.prys}
              onChange={(e) => stel(i, "prys", e.target.value)}
              placeholder="Prys (R)"
              className="w-28 border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLyne((l) => [...l, { beskrywing: "", aantal: "1", prys: "" }])}
          className="mt-2 text-sm font-semibold underline-offset-2 hover:underline"
        >
          + nog 'n lyn
        </button>
      </div>

      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={2}
        placeholder="Notas (opsioneel)"
        className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
      />

      <div className="flex items-center justify-between">
        <p className="text-lg font-extrabold">
          Totaal: R{" "}
          {new Intl.NumberFormat("af-ZA", { minimumFractionDigits: 2 }).format(totaal)}
        </p>
        <button
          onClick={stuur}
          disabled={besig || !clientId}
          className="bg-ink px-6 py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
        >
          {besig ? "Skep…" : "Skep faktuur (konsep)"}
        </button>
      </div>
    </div>
  );
}
