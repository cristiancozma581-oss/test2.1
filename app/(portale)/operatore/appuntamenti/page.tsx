import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusProgramareBadge } from "@/components/immy/stari";
import { ActiuniProgramare } from "@/components/immy/actiuni-programare";
import { programariInterval } from "@/lib/immy/dal/programari";
import { setari } from "@/lib/immy/dal/setari";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { adaugaZile, dataISO, momentDinZiSiMinut } from "@/lib/immy/fus-orar";

export const metadata: Metadata = {
  title: "Appuntamenti",
  robots: { index: false, follow: false },
};

export default async function PaginaProgramariOperator() {
  const [sesiune, s] = await Promise.all([sesiuneCurenta(), setari()]);
  if (!sesiune) return null;

  const azi = dataISO(s.fusOrar, new Date());
  const programari = await programariInterval(
    momentDinZiSiMinut(s.fusOrar, azi, 0),
    momentDinZiSiMinut(s.fusOrar, adaugaZile(azi, 30), 0),
  );

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <AntetPagina
        titlu="Appuntamenti"
        descriere="I prossimi 30 giorni. Conferma, completa o annulla direttamente da qui."
      />

      <div className="px-5 py-6 lg:px-8">
        {programari.length === 0 ? (
          <StareGoala
            titlu="Nessun appuntamento nei prossimi 30 giorni"
            descriere="Le nuove prenotazioni compaiono qui appena arrivano."
          />
        ) : (
          <ul className="space-y-3">
            {programari.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold capitalize text-primary-deep">
                      {format.format(new Date(p.inceput))}
                    </p>
                    <p className="mt-1 font-semibold">{p.client.nume}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{p.serviciu?.nume}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.client.telefon ?? "—"}
                      {p.client.email ? ` · ${p.client.email}` : null}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusProgramareBadge status={p.status} />
                    <span className="font-mono text-xs text-muted-foreground">{p.cod}</span>
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
      </div>
    </>
  );
}
