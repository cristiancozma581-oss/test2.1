import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusDosarBadge, StatusProgramareBadge } from "@/components/immy/stari";
import { Button } from "@/components/ui/button";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { programarileMele } from "@/lib/immy/dal/programari";
import { dosareleMele } from "@/lib/immy/dal/dosare";
import { documenteleMele } from "@/lib/immy/dal/documente";
import { notificarileMele } from "@/lib/immy/dal/notificari";
import { setari } from "@/lib/immy/dal/setari";
import { programareActiva } from "@/lib/immy/tipuri";
import { acum as citesteAcum } from "@/lib/immy/acum";

export const metadata: Metadata = {
  title: "Area riservata",
  robots: { index: false, follow: false },
};

export default async function AcasaClient() {
  const [sesiune, s, programari, dosare, documente, notificari] = await Promise.all([
    sesiuneCurenta(),
    setari(),
    programarileMele(),
    dosareleMele(),
    documenteleMele(),
    notificarileMele(5),
  ]);

  const acum = citesteAcum().getTime();
  const urmatoarea = programari
    .filter((p) => programareActiva(p.status) && new Date(p.inceput).getTime() > acum)
    .sort((a, b) => a.inceput.localeCompare(b.inceput))[0];

  const dosareActive = dosare.filter(
    (d) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(d.status),
  );
  const deIncarcat = documente.filter((d) =>
    ["REQUESTED", "REJECTED", "NEEDS_CORRECTION"].includes(d.status),
  );

  const formatData = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const prenume = sesiune?.numeComplet?.split(" ")[0] ?? "";

  return (
    <>
      <AntetPagina
        titlu={prenume ? `Ciao, ${prenume}` : "La tua area riservata"}
        descriere="Da qui segui le tue pratiche, carichi documenti e parli con il tuo operatore."
        actiuni={
          <Button asChild className="rounded-full">
            <Link href="/prenota">Prenota un appuntamento</Link>
          </Button>
        }
      />

      <div className="space-y-6 px-5 py-6 lg:px-8">
        {/* Ce trebuie făcut acum — pus primul, pentru că e singura secțiune
            care cere o acțiune din partea clientului. */}
        {deIncarcat.length > 0 ? (
          <section className="rounded-xl border border-warning/35 bg-warning/10 p-5">
            <h2 className="font-serif text-lg font-semibold text-warning">
              {deIncarcat.length === 1
                ? "Ti chiediamo un documento"
                : `Ti chiediamo ${deIncarcat.length} documenti`}
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {deIncarcat.slice(0, 4).map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{d.eticheta}</span>
                  {d.observatie ? (
                    <span className="text-muted-foreground">— {d.observatie}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <Button asChild size="sm" className="mt-4 rounded-full">
              <Link href="/area-cliente/documenti">Carica i documenti</Link>
            </Button>
          </section>
        ) : null}

        {/* Următoarea programare */}
        <section>
          <h2 className="font-serif text-lg font-semibold">Il tuo prossimo appuntamento</h2>
          {urmatoarea ? (
            <div className="mt-3 rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{urmatoarea.serviciu?.nume}</p>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {formatData.format(new Date(urmatoarea.inceput))}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Con {urmatoarea.operator?.nume} · {s.adresa}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusProgramareBadge status={urmatoarea.status} />
                  <span className="font-mono text-xs text-muted-foreground">{urmatoarea.cod}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link href="/area-cliente/appuntamenti">Gestisci</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <StareGoala
                titlu="Nessun appuntamento in programma"
                descriere="Quando prenoti, il tuo prossimo appuntamento compare qui con data, ora e codice."
                actiune={{ eticheta: "Prenota ora", href: "/prenota" }}
              />
            </div>
          )}
        </section>

        {/* Dosare active */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">Le tue pratiche</h2>
            {dosare.length > 0 ? (
              <Link
                href="/area-cliente/pratiche"
                className="text-sm font-medium text-primary-deep hover:underline"
              >
                Vedi tutte
              </Link>
            ) : null}
          </div>

          {dosareActive.length === 0 ? (
            <div className="mt-3">
              <StareGoala
                titlu="Nessuna pratica aperta"
                descriere="Apriamo la pratica dopo il primo appuntamento: da quel momento la segui da qui."
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {dosareActive.slice(0, 4).map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/area-cliente/pratiche/${d.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary"
                  >
                    <span>
                      <span className="block font-medium">{d.titlu}</span>
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        {d.referinta}
                      </span>
                    </span>
                    <StatusDosarBadge status={d.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Ultimele notificări */}
        {notificari.length > 0 ? (
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold">Ultimi aggiornamenti</h2>
              <Link
                href="/area-cliente/notifiche"
                className="text-sm font-medium text-primary-deep hover:underline"
              >
                Vedi tutti
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {notificari.map((n) => (
                <li key={n.id} className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm font-medium">{n.titlu}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{n.corp}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
