import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala } from "@/components/immy/stari";
import { FormularFirNou } from "@/components/immy/mesaje-client";
import { firurileMele } from "@/lib/immy/dal/mesaje";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Messaggi",
  robots: { index: false, follow: false },
};

export default async function PaginaMesaje() {
  const [firuri, s] = await Promise.all([firurileMele(), setari()]);

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <AntetPagina
        titlu="Messaggi"
        descriere="Scrivi direttamente all'operatore che segue la tua pratica."
      />

      <div className="space-y-8 px-5 py-6 lg:px-8">
        {firuri.length === 0 ? (
          <StareGoala
            titlu="Nessuna conversazione"
            descriere="Apri una conversazione qui sotto: ti rispondiamo negli orari di apertura."
          />
        ) : (
          <ul className="space-y-2.5">
            {firuri.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/area-cliente/messaggi/${f.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary"
                >
                  <span>
                    <span className="block font-medium">{f.subiect}</span>
                    {f.dosar ? (
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        Pratica: {f.dosar}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format.format(new Date(f.ultimulMesaj))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-serif text-lg font-semibold">Scrivi un nuovo messaggio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Per urgenze chiamaci al {s.telefon}: qui rispondiamo negli orari di apertura.
          </p>
          <div className="mt-4">
            <FormularFirNou />
          </div>
        </section>
      </div>
    </>
  );
}
