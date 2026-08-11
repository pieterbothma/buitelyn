import Image from "next/image";
import type { Post } from "@/lib/feed";

/* Die skryfwerk-kolom. Op uitleg C staan dit langs die markte eerder as bo
   dit — die markte trek die daaglikse besoek, die stukke hou die mens daar.
   Klein prente en kort koppe: dis 'n kolom, nie 'n voorblad nie. */

const SUBSTACK = "https://buitelyn.substack.com";

const datumFmt = new Intl.DateTimeFormat("af-ZA", { day: "numeric", month: "long" });

export function VanBuitelyn({ posts }: { posts: Post[] }) {
  const lys = posts.slice(0, 5);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-bold tracking-[.14em] text-ink/50">VAN BUITELYN</p>
        <a
          href={SUBSTACK}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold underline underline-offset-4"
        >
          Alles
        </a>
      </div>

      {/* Een lei-stuk met 'n prent, die res as smal rye. Vier volgroot kaarte
          het die kolom tot ver onder die vou laat loop terwyl die markte-kant
          by 620px klaar was — en dit het die hek heeltemal van die skerm af
          gestoot. Uitleg C se punt is juis dat die skryfwerk langsáán loop,
          nie onder aan 'n tweede blad nie. */}
      {lys.length === 0 ? (
        <p className="mt-4 text-[14px] text-ink/60">
          Die voorblad laai nie op die oomblik nie —{" "}
          <a
            href={SUBSTACK}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
          >
            lees op Substack →
          </a>
        </p>
      ) : (
        <ul className="mt-4">
          {lys.map((p, i) => (
            <li key={p.url} className="border-t border-ink/10 py-4 first:border-t-0 first:pt-0">
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={i === 0 ? "group block" : "group flex gap-3"}
              >
                {p.image &&
                  (i === 0 ? (
                    <div className="relative mb-2.5 aspect-[16/9] border border-ink/15 bg-offwhite">
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 30vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-[4/3] w-20 shrink-0 border border-ink/15 bg-offwhite">
                      <Image src={p.image} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                <div className="min-w-0">
                  <h3
                    className={`font-bold leading-tight underline-offset-4 group-hover:underline ${
                      i === 0 ? "text-[17px]" : "text-[14px]"
                    }`}
                  >
                    {p.title}
                  </h3>
                  <p className="mt-1 text-[11px] tracking-[.1em] text-ink/50">
                    {datumFmt.format(new Date(p.isoDate)).toUpperCase()} · {p.readMinutes} MIN
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
