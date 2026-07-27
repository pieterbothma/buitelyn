"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ProfielVorm({
  epos,
  naam: aanvanklikeNaam,
  avatarUrl,
}: {
  epos: string;
  naam: string;
  avatarUrl: string | null;
}) {
  const [naam, setNaam] = useState(aanvanklikeNaam);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [besig, setBesig] = useState(false);
  const sb = supabaseBrowser();

  async function stoor() {
    if (!sb || !naam.trim()) return;
    setBesig(true);
    setBoodskap(null);
    const { data } = await sb.auth.getUser();
    if (!data.user) return;
    const { error } = await sb
      .from("profiele")
      .upsert({ user_id: data.user.id, naam: naam.trim(), avatar_url: avatarUrl }, { onConflict: "user_id" });
    setBesig(false);
    setBoodskap(error ? error.message : "Gestoor.");
  }

  return (
    <div className="border-2 border-ink bg-offwhite p-6">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={naam} className="size-14 rounded-full border-2 border-ink object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full border-2 border-ink bg-ink text-lg font-bold text-offwhite">
            {(naam || epos).charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{naam || "—"}</p>
          <p className="truncate text-xs text-ink/50">{epos}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          stoor();
        }}
        className="mt-6 space-y-3"
      >
        <label className="block text-sm font-semibold">
          Naam
          <input
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Jou naam"
            className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-normal outline-none focus:border-red"
          />
        </label>
        <button
          disabled={besig}
          className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
        >
          Stoor
        </button>
        {boodskap ? <p className="text-xs text-ink/60">{boodskap}</p> : null}
      </form>

      <p className="mt-6 border-t border-ink/15 pt-4 text-xs text-ink/50">
        Jou naam verskyn in die Markte-groet. Jou portefeulje is aan hierdie rekening gekoppel.
      </p>
    </div>
  );
}
