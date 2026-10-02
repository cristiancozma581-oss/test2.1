import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusProgramareBadge } from "@/components/immy/stari";
import { ButonAnulare } from "@/components/immy/buton-anulare";
import { Button } from "@/components/ui/button";
import { programarileMele } from "@/lib/immy/dal/programari";
import { setari } from "@/lib/immy/dal/setari";
import { clientulPoateAnula } from "@/lib/immy/flux";
import { programareActiva } from "@/lib/immy/tipuri";

export const metadata: Metadata = {
  title: "I miei appuntamenti",
  robots: { index: false, follow: false },
};

export default async function PaginaProgramari() {
  const [programari, s] = await Promise.all([programarileMele(), setari()]);

  const acum = new Date();
  const viitoare = programari.filter(
    (p) => programareActiva(p.status) && new Date(p.inceput) > acum,
  );
  const trecute = programari.filter((p) => !viitoare.includes(p));

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <AntetPagina
        titlu="I miei appuntamenti"
        descriere="Qui trovi tutte le tue prenotazioni, con codice, data e stato."
        actiuni={
          <Button asChild className="rounded-full">
            <Link href="/prenota">Prenota</Link>
          </Button>
        }
      />

      <div className="space-y-8 px-5 py-6 lg:px-8">
        <section>
          <h2 className="font-serif text-lg font-semibold">In programma</h2>
          {viitoare.length === 0 ? (
            <div className="mt-3">
              <StareGoala
                titlu="Nessun appuntamento in programma"
                descriere="Scegli il servizio che ti serve e prenota: bastano due minuti."
                actiune={{ eticheta: "Prenota ora", href: "/prenota" }}
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {viitoare.map((p) => {
                const verdict = clientulPoateAnula(
                  p.status,
                  new Date(p.inceput),
                  acum,
                  s.pragAnulareOre,
                );
                return (
                  <li key={p.id} className="rounded-xl border border-border bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{p.serviciu?.nume}</p>
                        <p className="mt-1 text-sm capitalize text-muted-foreground">
                          {format.format(new Date(p.inceput))}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Con {p.operator?.nume} · {s.adresa}
                        </p>
                        {p.note ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            <span className="font-medium">Note:</span> {p.note}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusProgramareBadge status={p.status} />
                        <span className="font-mono text-xs text-muted-foreground">{p.cod}</span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      {verdict.permis ? (
                        <ButonAnulare appointmentId={p.id} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {verdict.motiv} Chiamaci al{" "}
                          <a
                            className="font-semibold text-primary-deep"
                            href={`tel:${s.telefon.replace(/[^\d+]/g, "")}`}
                          >
                            {s.telefon}
                          </a>
                          .
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {trecute.length > 0 ? (
          <section>
            <h2 className="font-serif text-lg font-semibold">Storico</h2>
            <ul className="mt-3 space-y-2">
              {trecute.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <span>
                    <span className="block text-sm font-medium">{p.serviciu?.nume}</span>
                    <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                      {format.format(new Date(p.inceput))}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">{p.cod}</span>
                    <StatusProgramareBadge status={p.status} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
