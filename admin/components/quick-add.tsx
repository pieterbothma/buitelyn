"use client";

import { useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { stoorIdee } from "@/app/actions";
import type { Workspace } from "@/components/shell";

type Format = { id: string; naam: string; workspace_id: string };

export function QuickAdd({ workspaces }: { workspaces: Workspace[] }) {
  const [oop, setOop] = useState(false);
  const [wsId, setWsId] = useState("");
  const [formats, setFormats] = useState<Format[]>([]);
  const [besig, begin] = useTransition();

  async function laaiFormats(id: string) {
    setWsId(id);
    if (!id) return setFormats([]);
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await sb.from("formats").select("id, naam, workspace_id").eq("workspace_id", id);
    setFormats((data ?? []) as Format[]);
  }

  return (
    <>
      <button
        onClick={() => setOop(true)}
        aria-label="Nuwe idee"
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-ink text-2xl font-bold text-offwhite shadow-[0_8px_24px_rgba(26,26,26,0.35)] hover:bg-ink/85"
      >
        +
      </button>
      {oop ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setOop(false)}
        >
          <div
            className="w-full max-w-md border-2 border-ink bg-offwhite p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold">Nuwe idee</h2>
            <form
              action={(vorm) =>
                begin(async () => {
                  await stoorIdee(vorm);
                  setOop(false);
                })
              }
              className="mt-4 space-y-3"
            >
              <input
                name="titel"
                required
                placeholder="Titel"
                className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
              />
              <textarea
                name="nota"
                rows={3}
                placeholder="Nota (opsioneel)"
                className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
              />
              <input
                name="skakel"
                placeholder="Skakel (opsioneel)"
                className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
              />
              <select
                name="workspace_id"
                value={wsId}
                onChange={(e) => laaiFormats(e.target.value)}
                className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm"
              >
                <option value="">Inbox (tag later)</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.naam}
                  </option>
                ))}
              </select>
              {formats.length > 0 ? (
                <select name="format_id" className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm">
                  <option value="">Formaat (opsioneel)</option>
                  {formats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.naam}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="flex gap-3">
                <button
                  disabled={besig}
                  className="flex-1 bg-ink py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
                >
                  {besig ? "Stoor…" : "Stoor idee"}
                </button>
                <button
                  type="button"
                  onClick={() => setOop(false)}
                  className="px-4 text-sm font-semibold text-ink/60 hover:text-ink"
                >
                  Kanselleer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
