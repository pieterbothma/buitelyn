/* Die hek, sigbaar gemaak.
   Die reël vir uitleg C: alles wat die cron reeds geskryf het is gratis en
   staan bo — oorsig, hittekaart, bewegers, nuus. Net die goed wat per
   gebruiker loop of ons geld kos sit agter die hek. Dié blok wys wat daar
   is sonder om dit weg te steek; 'n leser moet kan sien waarvoor hy inteken.

   Geen slot-emoji nie: op skerm lees dit soos 'n bedelbrief. Die gestippelde
   raam sê dieselfde ding sonder om te skree. */

const AGTER_DIE_HEK = [
  { naam: "Vra Buitelyn", wat: "vra die markte-assistent enigiets" },
  { naam: "Portefeulje", wat: "jou aandele, wins en verlies" },
  { naam: "Waarskuwings", wat: "laat weet wanneer 'n prys beweeg" },
  { naam: "Telegram", wat: "kry die oorsig waar jy al is" },
  { naam: "Beursliga", wat: "speel mee teen ander lesers" },
];

export function Slot() {
  return (
    <section className="border border-dashed border-ink/40 p-5">
      <p className="text-[11px] font-bold tracking-[.14em] text-ink/50">AGTER DIE HEK</p>
      <ul className="mt-3 space-y-2">
        {AGTER_DIE_HEK.map((i) => (
          <li key={i.naam} className="text-[13px] leading-snug">
            <span className="font-bold">{i.naam}</span>
            <span className="text-ink/60"> — {i.wat}</span>
          </li>
        ))}
      </ul>
      <a
        href="/markte"
        className="mt-4 block bg-ink px-4 py-3 text-center text-[11px] font-bold tracking-[.12em] text-offwhite transition-opacity hover:opacity-85"
      >
        TEKEN IN OM TE ONTSLUIT
      </a>
      <p className="mt-2.5 text-[11px] leading-snug text-ink/50">
        Gratis. Die oorsig, bewegers en nuus hierbo bly vir almal oop.
      </p>
    </section>
  );
}
