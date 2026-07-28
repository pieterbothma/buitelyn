import Image from "next/image";
import { Hamburger } from "@/components/hamburger";
import { ProfielKenteken } from "@/components/profiel-kenteken";

export function TopBar() {
  return (
    <header className="relative border-b border-ink/15">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-14">
        <a href="#" className="flex items-center">
          <Image src="/logo-transparent.png" alt="Buitelyn" width={64} height={64} />
        </a>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="/markte" className="hidden text-[15px] font-semibold underline-offset-4 hover:underline md:block">
            Markte
          </a>
          <a
            href="https://buitelyn-shop.fourthwall.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-[15px] font-semibold underline-offset-4 hover:underline md:block"
          >
            Winkel
          </a>
          <a
            href="https://buitelyn.substack.com/subscribe"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-[15px] font-semibold underline-offset-4 hover:underline md:block"
          >
            Nuusbrief
          </a>
          <ProfielKenteken />
          <Hamburger />
        </div>
      </div>
    </header>
  );
}
