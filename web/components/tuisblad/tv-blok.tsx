import Image from "next/image";
import { VideoSpeler } from "@/components/tuisblad/video-speler";
import type { Video } from "@/lib/youtube";

/* AP se foto is 'n uitgesnyde PNG op 'n deursigtige agtergrond — dit staan
   dus direk op die papier, sonder raam. Een konstante: 'n nuwe skoot is 'n
   een-reël-verandering. */
const FOTO = "/apdup.png";

const datumFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const KANAAL = "https://www.youtube.com/@buitelyn";

export function TvBlok({ video }: { video: Video | null }) {
  return (
    <section className="border-b border-ink/15">
      <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-14 md:py-12">
        <div className="grid items-center gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-xs md:max-w-none">
            <Image
              src={FOTO}
              alt="André-Pierre du Plessis"
              fill
              sizes="(max-width: 768px) 20rem, 30vw"
              className="object-contain object-bottom"
              priority
            />
          </div>

          <div>
            {video ? (
              <>
                <div className="mb-3 flex flex-wrap items-baseline gap-3">
                  <span className="bg-red px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[.16em] text-offwhite">
                    Nuutste episode
                  </span>
                  {video.gepubliseer ? (
                    <span className="text-xs tracking-[.06em] text-ink/50">
                      {datumFmt.format(new Date(video.gepubliseer))}
                    </span>
                  ) : null}
                </div>
                <VideoSpeler id={video.id} titel={video.titel} duimnael={video.duimnael} />
                <h2 className="mt-4 text-balance text-xl font-extrabold tracking-tight md:text-2xl">
                  {video.titel}
                </h2>
                <p className="mt-3 text-sm text-ink/60">
                  <a
                    href={KANAAL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-ink underline decoration-red decoration-2 underline-offset-4"
                  >
                    Alle episodes op YouTube
                  </a>{" "}
                  — nuwe episodes verskyn hier vanself.
                </p>
              </>
            ) : (
              /* Geen video nie: 'n stil of stukkende voer mag nie 'n gat los
                 nie. Die foto bly, en die skakel doen wat die speler sou doen. */
              <>
                <h2 className="text-balance text-2xl font-extrabold tracking-tight">
                  Buitelyn TV
                </h2>
                <p className="mt-3 max-w-prose text-sm text-ink/60">
                  Kyk die episodes op YouTube — nuwe episodes verskyn hier sodra hulle
                  gelaai is.
                </p>
                <a
                  href={KANAAL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block border-2 border-ink px-4 py-2 text-sm font-semibold hover:bg-offwhite"
                >
                  Kyk op YouTube →
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
