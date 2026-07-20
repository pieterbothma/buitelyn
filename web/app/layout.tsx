import type { Metadata } from "next";
import { League_Spartan } from "next/font/google";
import "./globals.css";

const spartan = League_Spartan({
  variable: "--font-spartan",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Buitelyn — sake, politiek en als tussenin",
  description:
    "Buitelyn sif deur die internasionale stroom van inligting om die goue drade te vind. Ons trek die buitelyne sodat jy duidelik kan sien waarheen die toekoms op pad is.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="af" className={`${spartan.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
