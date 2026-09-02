import { WinkelRaam } from "@/components/winkel/winkel-raam";
import { MandjieLys } from "./mandjie-lys";

export const metadata = { title: "Mandjie — Buitelyn" };

export default function MandjieBlad() {
  return (
    <WinkelRaam>
      <section className="mx-auto max-w-2xl px-6 py-12">
        <div className="border-y-2 border-ink">
          <div className="my-1 border-y border-ink py-3">
            <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">Mandjie</h1>
          </div>
        </div>
        <div className="mt-8">
          <MandjieLys />
        </div>
      </section>
    </WinkelRaam>
  );
}
