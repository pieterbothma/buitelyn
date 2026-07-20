import Image from "next/image";

type Chip = {
  label: string;
  arrow?: "up" | "down";
  value?: string;
  top: string;
  left: string;
  rotate: number;
};

const CHIPS: Chip[] = [
  { label: "JSE", arrow: "up", value: "+1,2%", top: "4%", left: "-8%", rotate: -8 },
  { label: "R/$", arrow: "down", value: "18,42", top: "-5%", left: "70%", rotate: 6 },
  { label: "GOUD", arrow: "up", value: "+0,4%", top: "30%", left: "86%", rotate: -4 },
  { label: "MARKTE", top: "26%", left: "-12%", rotate: -9 },
  { label: "POLITIEK", top: "58%", left: "90%", rotate: 5 },
  { label: "RENTEKOERS", top: "62%", left: "-14%", rotate: 7 },
];

function Arrow({ up }: { up: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block"
      style={{
        width: 0,
        height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        ...(up
          ? { borderBottom: "9px solid var(--brand-green)" }
          : { borderTop: "9px solid var(--brand-red)" }),
      }}
    />
  );
}

function ChipPlate({ chip }: { chip: Chip }) {
  return (
    <span className="flex items-center gap-2 border-2 border-ink bg-offwhite px-3 py-2 text-sm font-semibold tracking-[0.08em]">
      {chip.label}
      {chip.arrow ? <Arrow up={chip.arrow === "up"} /> : null}
      {chip.value ? (
        <span className={chip.arrow === "up" ? "text-green" : "text-red"}>{chip.value}</span>
      ) : null}
    </span>
  );
}

export function Hero({ tagline, latestUrl }: { tagline: string; latestUrl: string }) {
  return (
    <section>
      <div className="mx-auto max-w-[1440px] px-6 pb-16 pt-12 md:px-14 md:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-14">
          {/* Left: masthead copy */}
          <div>
            <h1 className="text-[56px] font-extrabold leading-[0.94] tracking-[-0.05em] sm:text-[76px] md:text-[92px]">
              Lees <span className="text-red">tussen</span>
              <br />
              die Buitelyne.
            </h1>
            <p className="mt-7 max-w-xl text-[18px] leading-[1.55] text-ink/70 md:text-[19px]">
              {tagline}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href={latestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center bg-ink px-5 text-[15px] font-semibold text-offwhite transition-colors hover:bg-ink/85"
              >
                Lees die nuutste uitgawe &rarr;
              </a>
              <a
                href="https://buitelyn.substack.com/subscribe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-semibold text-ink/70 underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Teken in op Substack
              </a>
            </div>
          </div>

          {/* Right: André-Pierre, ringed by market & news chips */}
          <div>
            <div className="relative aspect-square">
              <Image
                src="/apdup.png"
                alt="André-Pierre du Plessis — aanbieder van Buitelyn"
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-contain"
              />
              {/* red dot — the brand's full stop, top-right like the logo */}
              <span
                aria-hidden
                className="absolute right-[6%] top-[6%] size-6 rounded-full bg-red"
              />
              {/* Desktop: chips orbit his head */}
              {CHIPS.map((chip) => (
                <div
                  key={chip.label}
                  aria-hidden
                  className="pointer-events-none absolute hidden drop-shadow-[0_6px_16px_rgba(26,26,26,0.15)] md:block"
                  style={{ top: chip.top, left: chip.left, transform: `rotate(${chip.rotate}deg)` }}
                >
                  <ChipPlate chip={chip} />
                </div>
              ))}
            </div>
            {/* Mobile: chips in rows beneath the portrait */}
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-2 md:hidden">
              {CHIPS.map((chip) => (
                <li key={chip.label}>
                  <ChipPlate chip={chip} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
