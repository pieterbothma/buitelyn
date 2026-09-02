export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/15">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-8 md:px-14">
        <p className="flex items-center gap-2 text-sm text-ink/60">
          © Buitelyn {new Date().getFullYear()}
          <span aria-hidden className="size-1.5 rounded-full bg-red" />
        </p>
        <a href="/aandele" className="text-sm font-semibold underline-offset-4 hover:underline">
          Aandeelpryse
        </a>
        <a href="/winkel" className="text-sm font-semibold underline-offset-4 hover:underline">
          Winkel
        </a>
        {/* Die wetlike bladsye moet vanaf ELKE blad bereikbaar wees sonder om
            aan te meld — dit is wat 'n betalingsverskaffer se nasienspan soek,
            en 'n beleid wat bestaan maar nêrens geskakel is nie, tel nie. */}
        <a href="/voorwaardes" className="text-sm underline-offset-4 hover:underline">
          Voorwaardes
        </a>
        <a href="/terugbetalings" className="text-sm underline-offset-4 hover:underline">
          Terugbetalings
        </a>
        <a href="/kansellasie" className="text-sm underline-offset-4 hover:underline">
          Kansellasie
        </a>
        <a href="/privaatheid" className="text-sm underline-offset-4 hover:underline">
          Privaatheid
        </a>
        <a
          href="https://buitelyn.substack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold underline-offset-4 hover:underline"
        >
          Lees en teken in op Substack &rarr;
        </a>
      </div>
    </footer>
  );
}
