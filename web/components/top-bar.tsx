import Image from "next/image";

export function TopBar() {
  return (
    <header className="border-b border-ink/15">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-14">
        <a href="#" className="flex items-center">
          <Image src="/logo-transparent.png" alt="Buitelyn" width={64} height={64} />
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
