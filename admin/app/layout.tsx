import type { Metadata } from "next";
import { League_Spartan } from "next/font/google";
import "./globals.css";

const spartan = League_Spartan({
  variable: "--font-spartan",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AP HQ",
  description: "André-Pierre se besigheidsdashboard",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="af" className={`${spartan.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
