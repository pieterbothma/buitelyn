import Image from "next/image";
import Link from "next/link";
import { ProfielKenteken } from "@/components/profiel-kenteken";
import { Hamburger } from "@/components/hamburger";

/* Die tuisblad se koerantkop.
   Die gedeelde TopBar is 'n publikasie-kop: 'n groot logo links en skakels
   regs. Uitleg C wil 'n werkbalk hê — laag, met die afdelings in die middel
   en een duidelike aksie regs — sodat die oorsig bo die vou bly. Dit is 'n
   aparte komponent en nie 'n verandering aan TopBar nie, want TopBar dra ook
   /markte, /aandele en /profiel, en dié blaaie is nie deel van hierdie
   herontwerp nie.

   GIDSE staan doelbewus nie in die nav nie: daardie roete woon nog op die
   ongesmelte gidse-tak, en 'n skakel na 'n 404 vanaf die tuisblad is erger
   as een ontbrekende afdeling. Dit kom by sodra daardie tak in is. */

const AFDELINGS = [
  { naam: "MARKTE", href: "/markte" },
  { naam: "AANDELE", href: "/aandele" },
  { naam: "WINKEL", href: "/winkel" },
];

export function Koerantkop() {
  return (
    <header className="border-b border-ink/15">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-2 md:px-14">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Buitelyn — tuis">
          <Image src="/logo-transparent.png" alt="Buitelyn" width={72} height={72} priority />
        </Link>

        {/* Die afdelings sit in die middel op groot skerms en verdwyn op 'n
            foon — daar dra die hamburger reeds dieselfde skakels. */}
        <nav className="hidden flex-1 justify-center gap-8 md:flex">
          {AFDELINGS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="text-[12px] font-bold tracking-[.14em] underline-offset-4 hover:underline"
            >
              {a.naam}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-4 md:ml-0">
          <a
            href="https://buitelyn.substack.com/subscribe"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-[12px] font-bold tracking-[.14em] underline-offset-4 hover:underline lg:block"
          >
            NUUSBRIEF
          </a>
          <ProfielKenteken knop />
          <Hamburger />
        </div>
      </div>
    </header>
  );
}
