import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Prenotazione confermata",
  robots: { index: false, follow: false },
};

type Proprietati = { searchParams: Promise<{ codice?: string }> };

export default async function PaginaConfirmare(props: Proprietati) {
  const { codice } = await props.searchParams;
  const s = await setari();

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-3xl text-success"
      >
        ✓
      </span>

      <h1 className="mt-6 font-serif text-3xl font-semibold">Prenotazione ricevuta</h1>

      {codice ? (
        <>
          <p className="mt-4 text-muted-foreground">Il tuo codice è</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-wide text-primary-deep">
            {codice}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Conservalo: con questo codice possiamo trovare subito la tua prenotazione.
          </p>
        </>
      ) : (
        <p className="mt-4 text-muted-foreground">
          Ti abbiamo inviato il codice della prenotazione via email.
        </p>
      )}

      <div className="mt-9 rounded-xl border border-border bg-surface p-6 text-left">
        <h2 className="font-serif text-lg font-semibold">Cosa succede adesso</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">1.</span> Ricevi un&apos;email con il
            riepilogo e la lista dei documenti da portare.
          </li>
          <li>
            <span className="font-semibold text-foreground">2.</span> Confermiamo
            l&apos;appuntamento: ti arriva una seconda notifica.
          </li>
          <li>
            <span className="font-semibold text-foreground">3.</span> Ti mandiamo un promemoria il
            giorno prima e due ore prima.
          </li>
          <li>
            <span className="font-semibold text-foreground">4.</span> Ci vediamo in {s.adresa}.
          </li>
        </ol>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="rounded-full px-6">
          <Link href="/registrati">Crea un account per seguire la pratica</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full px-6">
          <Link href="/">Torna alla home</Link>
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Devi disdire o spostare? Chiamaci al{" "}
        <a className="font-semibold text-primary-deep" href={`tel:${s.telefon.replace(/[^\d+]/g, "")}`}>
          {s.telefon}
        </a>
        , oppure fallo dalla tua area riservata.
      </p>
    </div>
  );
}
