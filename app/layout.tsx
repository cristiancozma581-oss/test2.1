import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { urlPublic } from "@/lib/immy/env";

/*
 * Subsetul `latin-ext` este obligatoriu: fără el diacriticele românești
 * (ă, â, î, ș, ț) din zona de administrare cad pe un font de rezervă. Italiana
 * se descurcă cu `latin`, dar platforma vorbește ambele.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

/* Fraunces dă titlurilor căldura din mockup, fără să pară un formular. */
const serifDisplay = Fraunces({
  variable: "--font-serif-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const monoCode = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(urlPublic()),
  title: {
    default: "IMMY & EMY — Pratiche per immigrati e CAF a Torino",
    template: "%s · IMMY & EMY",
  },
  description:
    "Cittadinanza, permessi di soggiorno, SPID, 730 e pratiche INPS a Torino. " +
    "Prenota online il tuo appuntamento e segui la pratica dalla tua area riservata.",
  applicationName: "IMMY & EMY",
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "IMMY & EMY",
    title: "IMMY & EMY — Pratiche per immigrati e CAF a Torino",
    description:
      "Prenota online il tuo appuntamento e segui la pratica dalla tua area riservata.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00b34a" },
    { media: "(prefers-color-scheme: dark)", color: "#0b120e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      // Next 16 nu mai forțează scroll-ul lin la navigare fără acest atribut.
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${serifDisplay.variable} ${monoCode.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
