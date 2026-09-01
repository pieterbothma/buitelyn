"use client";

import Link from "next/link";
import { telling, useMandjie } from "@/lib/winkel/mandjie";

/** Nav-kenteken vir die winkel-mandjie: skakel na /winkel/mandjie met 'n
 *  klein telling-borrel. Word deur latere take langsaan die TopBar geplaas —
 *  bly leeg (null) as die mandjie leeg is, sodat dit op elke ander blad
 *  onopsigtelik verdwyn. */
export function MandjieKenteken() {
  const { items } = useMandjie();
  const aantal = telling(items);

  if (aantal === 0) return null;

  return (
    <Link
      href="/winkel/mandjie"
      className="flex items-center gap-1.5 text-[15px] font-semibold underline-offset-4 hover:underline"
    >
      Mandjie
      <span className="flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-offwhite">
        {aantal}
      </span>
    </Link>
  );
}
