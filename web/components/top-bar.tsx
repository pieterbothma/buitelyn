import Image from "next/image";

export function TopBar() {
  return (
    <header className="border-b border-ink/15">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-14">
        <a href="#" className="flex items-center gap-3">
          <Image src="/logo-square.png" alt="Buitelyn" width={40} height={40} />
          <span className="text-lg font-bold tracking-tight">Buitelyn</span>
        </a>
        <a
          href="https://buitelyn.substack.com/subscribe"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[15px] font-semibold underline-offset-4 hover:underline"
        >
          Teken in &rarr;
        </a>
      </div>
    </header>
  );
}
