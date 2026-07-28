"use client";

import { useRef, useState } from "react";
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
  const [avatar, setAvatar] = useState(avatarUrl);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [besig, setBesig] = useState(false);
  const lêerRef = useRef<HTMLInputElement>(null);
  const sb = supabaseBrowser();

  async function laaiFoto(f: File) {
    setBesig(true);
    setBoodskap(null);
    try {
      const vorm = new FormData();
      vorm.append("foto", f);
      const res = await fetch("/api/profiel/avatar", { method: "POST", body: vorm });
      const d = await res.json();
      if (res.ok) {
        setAvatar(d.url);
        setBoodskap("Foto opgedateer.");
      } else {
        setBoodskap(d.fout ?? "Oplaai het misluk.");
      }
    } finally {
      setBesig(false);
    }
  }

  async function stoor() {
    if (!sb || !naam.trim()) return;
    setBesig(true);
    setBoodskap(null);
    const { data } = await sb.auth.getUser();
    if (!data.user) return;
    const { error } = await sb
      .from("profiele")
      .upsert({ user_id: data.user.id, naam: naam.trim(), avatar_url: avatar }, { onConflict: "user_id" });
    setBesig(false);
    setBoodskap(error ? error.message : "Gestoor.");
  }

  return (
    <div className="border-2 border-ink bg-offwhite p-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => lêerRef.current?.click()}
          title="Verander profielfoto"
          className="group relative shrink-0"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={naam} className="size-14 rounded-full border-2 border-ink object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full border-2 border-ink bg-ink text-lg font-bold text-offwhite">
              {(naam || epos).charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/60 text-[10px] font-bold text-offwhite opacity-0 transition-opacity group-hover:opacity-100">
            VERANDER
          </span>
        </button>
        <input
          ref={lêerRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && laaiFoto(e.target.files[0])}
        />
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
        Jou naam en foto verskyn in die Markte-groet en op die Beursliga-ranglys. Jou portefeulje is
        aan hierdie rekening gekoppel. Klik die foto om dit te verander (JPG/PNG, maks 3 MB).
      </p>
    </div>
  );
}
