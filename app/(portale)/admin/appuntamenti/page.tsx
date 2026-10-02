import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusProgramareBadge } from "@/components/immy/stari";
import { ActiuniProgramare } from "@/components/immy/actiuni-programare";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cautaProgramari, programariInterval } from "@/lib/immy/dal/programari";
import { setari } from "@/lib/immy/dal/setari";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";
import { adaugaZile, dataISO, momentDinZiSiMinut } from "@/lib/immy/fus-orar";

export const metadata: Metadata = {
  title: "Appuntamenti",
  robots: { index: false, follow: false },
};

type Proprietati = { searchParams: Promise<{ q?: string }> };

/**
 * Lista programărilor, cu căutarea globală din §47.
 *
 * Căutarea merge pe cod, nume, e-mail și telefon — exact ce are omul de la
 * telefon: „sono Maria, avevo prenotato per giovedì".
 */
export default async function PaginaProgramariAdmin(props: Proprietati) {
  const sesiune = await cerutAdmin();
  const { q } = await props.searchParams;

  const s = await setari();
  const azi = dataISO(s.fusOrar, new Date());

  const programari = q?.trim()
    ? await cautaProgramari(q)
    : await programariInterval(
        momentDinZiSiMinut(s.fusOrar, adaugaZile(azi, -7), 0),
        momentDinZiSiMinut(s.fusOrar, adaugaZile(azi, 60), 0),
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
        descriere={
          q?.trim()
            ? `Risultati per «${q}»`
            : "Dagli ultimi 7 giorni ai prossimi 60. Usa la ricerca per un codice o un nominativo."
        }
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        <form className="flex gap-2" role="search">
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cerca per codice, nome, email o telefono…"
            aria-label="Cerca un appuntamento"
          />
          <Button type="submit" className="rounded-full px-6">
            Cerca
          </Button>
        </form>

        {programari.length === 0 ? (
          <StareGoala
            titlu={q?.trim() ? "Nessun risultato" : "Nessun appuntamento"}
            descriere={
              q?.trim()
                ? "Prova con il codice completo, oppure con il numero di telefono."
                : "Le nuove prenotazioni compaiono qui appena arrivano."
            }
          />
        ) : (
          <ul className="space-y-3">
            {programari.map((p) => (
              <li key={p.id} id={p.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold capitalize text-primary-deep">
                      {format.format(new Date(p.inceput))}
                    </p>
                    <p className="mt-1 font-semibold">{p.client.nume}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {p.serviciu?.nume} · {p.operator?.nume}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.client.telefon ?? "—"}
                      {p.client.email ? ` · ${p.client.email}` : null}
                    </p>
                    {p.note ? (
                      <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">{p.note}</p>
                    ) : null}
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
