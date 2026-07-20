export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/15">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-8 md:px-14">
        <p className="flex items-center gap-2 text-sm text-ink/60">
          © Buitelyn {new Date().getFullYear()}
          <span aria-hidden className="size-1.5 rounded-full bg-red" />
        </p>
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
