import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Come funziona",
  description:
    "Dalla scelta del servizio alla pratica conclusa: come funziona la prenotazione online " +
    "e l'area riservata di IMMY & EMY.",
  alternates: { canonical: "/come-funziona" },
};

const PASI = [
  {
    titlu: "Scegli il servizio",
    corp: "Cerca la pratica che ti serve. Su ogni scheda trovi la durata, il costo quando è fisso e la lista completa dei documenti da portare.",
  },
  {
    titlu: "Prenota online",
    corp: "Scegli l'operatore, il giorno e l'ora fra quelli liberi. Il calendario mostra solo gli orari realmente disponibili, quindi non rischi di trovare il posto occupato.",
  },
  {
    titlu: "Ricevi il codice",
    corp: "Subito dopo la conferma ricevi un codice come IMMY-2026-000124 e un'email con il riepilogo. Ti mandiamo un promemoria il giorno prima e due ore prima.",
  },
  {
    titlu: "Vieni in sede",
    corp: "Ti aspettiamo all'orario scelto in Via Monte Rosa 101/B. Con il fascicolo completo la maggior parte delle pratiche si chiude in un solo appuntamento.",
  },
  {
    titlu: "Segui la pratica",
    corp: "Creando un account vedi in ogni momento lo stato della pratica, carichi i documenti che ti chiediamo e scrivi direttamente all'operatore che ti segue.",
  },
  {
    titlu: "Pratica conclusa",
    corp: "Quando la pratica è completata ricevi una notifica. Documenti e ricevute restano nella tua area riservata, non li perdi.",
  },
];

export default function PaginaCumFunctioneaza() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-deep">
          Semplice e veloce
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Come funziona</h1>
        <p className="mt-4 text-muted-foreground">
          Sei passaggi, dal primo clic alla pratica conclusa. Nessuna fila, nessuna
          attesa al telefono.
        </p>
      </header>

      <ol className="mt-10 space-y-4">
        {PASI.map((p, i) => (
          <li key={p.titlu} className="flex gap-5 rounded-xl border border-border bg-surface p-6">
            <span className="font-serif text-3xl font-semibold text-primary">{i + 1}</span>
            <div>
              <h2 className="text-base font-semibold">{p.titlu}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.corp}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-11 rounded-2xl bg-tint px-7 py-9 text-center">
        <p className="font-serif text-xl font-semibold text-primary-deep">Iniziamo?</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Bastano due minuti per prenotare il tuo appuntamento.
        </p>
        <Button asChild size="lg" className="mt-5 rounded-full px-8">
          <Link href="/prenota">Prenota appuntamento</Link>
        </Button>
      </div>
    </div>
  );
}
