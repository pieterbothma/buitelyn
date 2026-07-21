"use client";

import { useState, useTransition } from "react";
import { antwoordEpos } from "@/app/actions-epos";

export function ReplyModal({
  na,
  onderwerp,
  replyTo,
  terug,
}: {
  na: string;
  onderwerp: string;
  replyTo: string;
  terug: string;
}) {
  const [oop, setOop] = useState(false);
  const [besig, begin] = useTransition();

  return (
    <>
      <button
        onClick={() => setOop(true)}
        className="shrink-0 bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85"
      >
        Antwoord →
      </button>
      {oop ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setOop(false)}
        >
          <div
            className="w-full max-w-lg border-2 border-ink bg-offwhite p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold tracking-[0.14em]">
              ANTWOORD AAN {na.toUpperCase()}
            </h2>
            <p className="mt-1 truncate text-xs text-ink/50">{onderwerp}</p>
            <form
              action={(vorm) => begin(() => antwoordEpos(vorm))}
              className="mt-4 space-y-3"
            >
              <input type="hidden" name="na" value={na} />
              <input type="hidden" name="onderwerp" value={onderwerp} />
              <input type="hidden" name="reply_to" value={replyTo} />
              <input type="hidden" name="terug" value={terug} />
              <textarea
                name="teks"
                rows={8}
                required
                autoFocus
                placeholder="Skryf jou antwoord…"
                className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
              />
              <div className="flex gap-3">
                <button
                  disabled={besig}
                  className="flex-1 bg-ink py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
                >
                  {besig ? "Stuur…" : "Stuur antwoord →"}
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
