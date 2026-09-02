import type { ReactNode } from "react";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { MandjieKenteken } from "@/components/winkel/mandjie-kenteken";

/** Gedeelde raam vir al vier winkel-bladsye (rooster, produkblad, mandjie,
 *  betaal): TopBar, 'n regs-belynde mandjie-kenteken direk onder die TopBar,
 *  dan die blad se eie inhoud, dan die Footer — een plek om die chrome
 *  konsekwent te hou i.p.v. dit op elke blad te herhaal. */
export function WinkelRaam({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] px-6 pt-4 md:px-14">
          <div className="flex justify-end">
            <MandjieKenteken />
          </div>
        </div>
        {children}
      </main>
      <Footer />
    </>
  );
}
