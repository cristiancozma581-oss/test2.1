import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusProgramareBadge } from "@/components/immy/stari";
import { ActiuniProgramare } from "@/components/immy/actiuni-programare";
import { kpi } from "@/lib/immy/dal/statistici";
import { programariInterval } from "@/lib/immy/dal/programari";
import { setari } from "@/lib/immy/dal/setari";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { adaugaZile, dataISO, momentDinZiSiMinut } from "@/lib/immy/fus-orar";
import { poate } from "@/lib/immy/rbac";

export const metadata: Metadata = {
  title: "Oggi",
  robots: { index: false, follow: false },
};

export default async function AcasaOperator() {
  const [sesiune, s, indicatori] = await Promise.all([sesiuneCurenta(), setari(), kpi()]);
  if (!sesiune) return null;

  const azi = dataISO(s.fusOrar, new Date());
  const deLa = momentDinZiSiMinut(s.fusOrar, azi, 0);
  const panaLa = momentDinZiSiMinut(s.fusOrar, adaugaZile(azi, 1), 0);
  const programari = await programariInterval(deLa, panaLa);

  const ora = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    hour: "2-digit",
    minute: "2-digit",
  });

  const carduri = indicatori
    ? [
        { eticheta: "Oggi", valoare: indicatori.programariAzi },
        { eticheta: "Domani", valoare: indicatori.programariMaine },
        { eticheta: "Da confermare", valoare: indicatori.inAsteptare },
        { eticheta: "Pratiche aperte", valoare: indicatori.dosareActive },
        ...(poate(sesiune.rol, "documente.verifica")
          ? [{ eticheta: "Documenti da verificare", valoare: indicatori.documenteDeVerificat }]
          : []),
        { eticheta: "Messaggi non letti", valoare: indicatori.mesajeNecitite },
      ]
    : [];

  return (
    <>
      <AntetPagina
        titlu={`Ciao, ${sesiune.numeComplet?.split(" ")[0] ?? "collega"}`}
        descriere={new Intl.DateTimeFormat("it-IT", {
          timeZone: s.fusOrar,
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}
      />

      <div className="space-y-7 px-5 py-6 lg:px-8">
        {carduri.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {carduri.map((c) => (
              <li key={c.eticheta} className="rounded-xl border border-border bg-surface p-4">
                <p className="font-serif text-3xl font-semibold">{c.valoare}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.eticheta}</p>
              </li>
            ))}
          </ul>
        ) : null}

        <section>
          <h2 className="font-serif text-lg font-semibold">Appuntamenti di oggi</h2>

          {programari.length === 0 ? (
            <div className="mt-3">
              <StareGoala
                titlu="Nessun appuntamento oggi"
                descriere="Quando arriva una prenotazione per oggi, la trovi qui con orario, servizio e contatti."
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {programari.map((p) => (
                <li key={p.id} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <span className="font-serif text-2xl font-semibold text-primary">
                        {ora.format(new Date(p.inceput))}
                      </span>
                      <div>
                        <p className="font-semibold">{p.client.nume}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{p.serviciu?.nume}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {p.client.telefon ? (
                            <a
                              className="hover:text-primary-deep"
                              href={`tel:${p.client.telefon.replace(/[^\d+]/g, "")}`}
                            >
                              {p.client.telefon}
                            </a>
                          ) : null}
                          {p.client.email ? ` · ${p.client.email}` : null}
                        </p>
                        {p.note ? (
                          <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
                            {p.note}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <StatusProgramareBadge status={p.status} />
                      <span className="font-mono text-xs text-muted-foreground">{p.cod}</span>
                      {p.operator ? (
                        <span className="text-xs text-muted-foreground">{p.operator.nume}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border pt-4">
                    <ActiuniProgramare
                      appointmentId={p.id}
                      status={p.status}
                      rol={sesiune.rol}
                      caseId={p.caseId}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-sm text-muted-foreground">
          <Link href="/operatore/calendario" className="font-medium text-primary-deep hover:underline">
            Vedi il calendario completo →
          </Link>
        </p>
      </div>
    </>
  );
}
