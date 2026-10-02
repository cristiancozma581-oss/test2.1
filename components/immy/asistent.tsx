"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Asistentul de pe sit (§44, §46).
 *
 * Interfața este deliberat modestă: o casetă care răspunde din baza de
 * cunoștințe a biroului și care, când nu știe, spune că nu știe și oferă
 * drumul spre un om. Un asistent care pare mai sigur decât este face rău exact
 * persoanelor care au cel mai mult nevoie de un răspuns corect.
 */

type Schimb = {
  intrebare: string;
  raspuns: string;
  servicii: { slug: string; nume: string; durataMinute: number }[];
  predaLaOperator: boolean;
};

export function Asistent() {
  const [deschis, setDeschis] = useState(false);
  const [intrebare, setIntrebare] = useState("");
  const [istoric, setIstoric] = useState<Schimb[]>([]);
  const [asteapta, setAsteapta] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const finalRef = useRef<HTMLDivElement>(null);

  async function trimite(e: React.FormEvent) {
    e.preventDefault();
    const q = intrebare.trim();
    if (!q || asteapta) return;

    setAsteapta(true);
    setEroare(null);
    setIntrebare("");

    try {
      const raspuns = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domanda: q }),
      });

      if (!raspuns.ok) throw new Error(String(raspuns.status));

      const date = (await raspuns.json()) as {
        risposta: string;
        servizi: { slug: string; nume: string; durataMinute: number }[];
        operatore: boolean;
      };

      setIstoric((v) => [
        ...v,
        {
          intrebare: q,
          raspuns: date.risposta,
          servicii: date.servizi ?? [],
          predaLaOperator: date.operatore,
        },
      ]);
      requestAnimationFrame(() => finalRef.current?.scrollIntoView({ block: "end" }));
    } catch {
      setEroare("Non riesco a rispondere in questo momento. Riprova o chiamaci al 333 47 59 704.");
    } finally {
      setAsteapta(false);
    }
  }

  if (!deschis) {
    return (
      <button
        type="button"
        onClick={() => setDeschis(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] md:bottom-6"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.2A8 8 0 1121 12z" strokeLinejoin="round" />
        </svg>
        Come possiamo aiutarti?
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Assistente IMMY &amp; EMY"
      className="fixed bottom-24 right-4 z-40 flex max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl md:bottom-6"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-serif text-sm font-semibold">Come possiamo aiutarti?</p>
        <button
          type="button"
          onClick={() => setDeschis(false)}
          aria-label="Chiudi l'assistente"
          className="rounded-lg p-1 text-muted-foreground hover:bg-surface-muted"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        {istoric.length === 0 ? (
          <div className="space-y-3 text-muted-foreground">
            <p>
              Scrivimi la tua domanda: ti dico quale servizio ti serve, quali documenti
              preparare e come prenotare.
            </p>
            <p className="text-xs">
              Do informazioni generali, non consulenza legale definitiva. Per il tuo caso
              concreto ti metto in contatto con un operatore.
            </p>
          </div>
        ) : null}

        {istoric.map((s, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-primary-foreground">
              {s.intrebare}
            </p>
            <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-surface-muted px-3.5 py-2.5">
              <p className="whitespace-pre-wrap">{s.raspuns}</p>

              {s.servicii.length > 0 ? (
                <ul className="mt-3 space-y-1.5 border-t border-border pt-2.5">
                  {s.servicii.map((sv) => (
                    <li key={sv.slug}>
                      <Link
                        href={`/servizi/${sv.slug}`}
                        className="font-semibold text-primary-deep hover:underline"
                      >
                        {sv.nume}
                      </Link>
                      <span className="text-xs text-muted-foreground"> · {sv.durataMinute} min</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {s.predaLaOperator ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button asChild size="sm" className="rounded-full">
                    <Link href="/prenota">Prenota appuntamento</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link href="/contatti">Scrivici</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {asteapta ? (
          <p className="text-muted-foreground" role="status">
            Sto cercando…
          </p>
        ) : null}
        {eroare ? (
          <p role="alert" className="text-destructive">
            {eroare}
          </p>
        ) : null}
        <div ref={finalRef} />
      </div>

      <form onSubmit={trimite} className="flex gap-2 border-t border-border p-3">
        <Input
          value={intrebare}
          onChange={(e) => setIntrebare(e.target.value)}
          placeholder="Scrivi la tua domanda…"
          aria-label="La tua domanda"
          maxLength={500}
          className="h-10"
        />
        <Button type="submit" size="sm" disabled={asteapta || !intrebare.trim()}>
          Invia
        </Button>
      </form>
    </div>
  );
}
