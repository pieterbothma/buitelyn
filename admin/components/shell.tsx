import Link from "next/link";
import type { ReactNode } from "react";

export type Workspace = {
  id: string;
  slug: string;
  naam: string;
  accent: string;
};

const MODULES = [
  { slug: "", naam: "Oorsig" },
  { slug: "pyplyn", naam: "Pyplyn" },
  { slug: "idees", naam: "Idees" },
  { slug: "kliente", naam: "Kliënte" },
  { slug: "fakture", naam: "Fakture" },
];

export function Shell({
  workspaces,
  active,
  children,
}: {
  workspaces: Workspace[];
  active?: Workspace;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r-2 border-ink bg-offwhite">
        <Link href="/" className="flex items-center gap-2 border-b-2 border-ink px-5 py-4">
          <span className="text-lg font-extrabold tracking-tight">AP HQ</span>
          <span aria-hidden className="size-2 rounded-full bg-red" />
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 text-[11px] font-semibold tracking-[0.18em] text-ink/50">
            WERKRUIMTES
          </p>
          <ul className="mt-2 space-y-1">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/w/${ws.slug}`}
                  className={`flex items-center gap-2.5 px-2 py-2 text-sm font-semibold hover:bg-paper ${
                    active?.id === ws.id ? "bg-paper" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ws.accent }}
                  />
                  {ws.naam}
                </Link>
                {active?.id === ws.id ? (
                  <ul className="mb-2 ml-5 mt-1 space-y-0.5 border-l border-ink/20 pl-3">
                    {MODULES.map((m) => (
                      <li key={m.slug}>
                        <Link
                          href={`/w/${ws.slug}${m.slug ? `/${m.slug}` : ""}`}
                          className="block py-1 text-[13px] text-ink/70 hover:text-ink hover:underline"
                        >
                          {m.naam}
                        </Link>
                      </li>
                    ))}
                    {ws.slug === "promenader" ? (
                      <li>
                        <Link
                          href={`/w/${ws.slug}/stories`}
                          className="block py-1 text-[13px] text-ink/70 hover:text-ink hover:underline"
                        >
                          Stories
                        </Link>
                      </li>
                    ) : null}
                    {ws.slug === "buitelyn" ? (
                      <li>
                        <Link
                          href={`/w/${ws.slug}/oudio`}
                          className="block py-1 text-[13px] text-ink/70 hover:text-ink hover:underline"
                        >
                          Nuusbrief → Oudio
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-ink/15 px-5 py-3">
          <form action="/auth/uitteken" method="post">
            <button className="text-[13px] font-semibold text-ink/60 hover:text-ink hover:underline">
              Teken uit
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
