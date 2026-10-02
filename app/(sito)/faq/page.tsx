import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { intrebariFrecvente } from "@/lib/immy/dal/catalog";

export const metadata: Metadata = {
  title: "Domande frequenti",
  description:
    "Come prenotare, quali documenti servono, come annullare, come seguire la pratica. " +
    "Le risposte alle domande che ci fanno più spesso.",
  alternates: { canonical: "/faq" },
};

export default async function PaginaFaq() {
  const lista = await intrebariFrecvente();

  const dateStructurate = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: lista.map((f) => ({
      "@type": "Question",
      name: f.intrebare,
      acceptedAnswer: { "@type": "Answer", text: f.raspuns },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      {lista.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dateStructurate) }}
        />
      ) : null}

      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-deep">
          Domande frequenti
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Le risposte alle domande più comuni</h1>
      </header>

      {lista.length === 0 ? (
        <p className="mt-9 text-muted-foreground">
          Le domande frequenti non sono ancora state pubblicate. Nel frattempo, chiamaci: siamo
          contenti di rispondere.
        </p>
      ) : (
        <div className="mt-9 space-y-3">
          {lista.map((f) => (
            <details key={f.id} className="rounded-xl border border-border bg-surface p-5">
              <summary className="cursor-pointer font-semibold">{f.intrebare}</summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.raspuns}</p>
            </details>
          ))}
        </div>
      )}

      <div className="mt-11 rounded-2xl bg-tint px-7 py-9 text-center">
        <p className="font-serif text-xl font-semibold text-primary-deep">
          Non hai trovato la risposta?
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Prenota un colloquio informativo: il primo confronto è gratuito.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-full px-6">
            <Link href="/prenota">Prenota</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link href="/contatti">Contattaci</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
