"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function Login() {
  const [epos, setEpos] = useState("");
  const [status, setStatus] = useState<"idle" | "besig" | "gestuur" | "fout">("idle");

  async function stuurSkakel(e: React.FormEvent) {
    e.preventDefault();
    setStatus("besig");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.signInWithOtp({
      email: epos,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setStatus(error ? "fout" : "gestuur");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm border-2 border-ink bg-offwhite p-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">AP HQ</h1>
          <span aria-hidden className="size-2.5 rounded-full bg-red" />
        </div>
        <p className="mt-2 text-sm text-ink/60">Teken in met jou e-pos — jy kry 'n skakel.</p>
        {status === "gestuur" ? (
          <p className="mt-6 border border-ink/20 bg-paper p-4 text-sm font-semibold">
            Skakel gestuur — gaan kyk in jou inbox.
          </p>
        ) : (
          <form onSubmit={stuurSkakel} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={epos}
              onChange={(e) => setEpos(e.target.value)}
              placeholder="jou@epos.co.za"
              className="w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm outline-none focus:border-red"
            />
            <button
              type="submit"
              disabled={status === "besig"}
              className="w-full bg-ink py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
            >
              {status === "besig" ? "Stuur…" : "Stuur skakel →"}
            </button>
            {status === "fout" ? (
              <p className="text-sm font-semibold text-red">Iets het skeefgeloop — probeer weer.</p>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}
