"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marca } from "./marca";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Antetul public (§4, §56).
 *
 * Este un client component pentru un singur motiv: meniul de pe mobil trebuie
 * să se deschidă. Restul — linkuri și butoane — funcționează și fără JavaScript.
 */

const LEGATURI = [
  { href: "/servizi", eticheta: "Servizi" },
  { href: "/come-funziona", eticheta: "Come funziona" },
  { href: "/faq", eticheta: "FAQ" },
  { href: "/contatti", eticheta: "Contatti" },
];

export function Antet({ autentificat }: { autentificat: boolean }) {
  const [deschis, setDeschis] = useState(false);
  const cale = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/92 backdrop-blur-md">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5"
        aria-label="Navigazione principale"
      >
        <Link href="/" className="rounded-lg" aria-label="IMMY &amp; EMY — home">
          <Marca />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LEGATURI.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary-deep",
                cale.startsWith(l.href) ? "text-primary-deep" : "text-muted-foreground",
              )}
            >
              {l.eticheta}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href={autentificat ? "/area-cliente" : "/accedi"}>
              {autentificat ? "Area riservata" : "Accedi"}
            </Link>
          </Button>
          <Button asChild size="sm" className="rounded-full px-5">
            <Link href="/prenota">Prenota appuntamento</Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-lg border border-border p-2 md:hidden"
          aria-expanded={deschis}
          aria-controls="meniu-mobil"
          aria-label={deschis ? "Chiudi il menu" : "Apri il menu"}
          onClick={() => setDeschis((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {deschis ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      {deschis ? (
        <div id="meniu-mobil" className="border-t border-border bg-surface px-5 py-4 md:hidden">
          <ul className="space-y-1">
            {LEGATURI.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-muted"
                  onClick={() => setDeschis(false)}
                >
                  {l.eticheta}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={autentificat ? "/area-cliente" : "/accedi"}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-muted"
                onClick={() => setDeschis(false)}
              >
                {autentificat ? "Area riservata" : "Accedi"}
              </Link>
            </li>
          </ul>
          <Button asChild className="mt-3 w-full rounded-full">
            <Link href="/prenota" onClick={() => setDeschis(false)}>
              Prenota appuntamento
            </Link>
          </Button>
        </div>
      ) : null}
    </header>
  );
}
