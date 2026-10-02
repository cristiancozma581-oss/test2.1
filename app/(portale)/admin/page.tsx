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
import { supabaseConfigurat } from "@/lib/immy/env";
import { BannerNeconfigurat } from "@/components/immy/stari";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function AcasaAdmin() {
  const [sesiune, s, indicatori] = await Promise.all([sesiuneCurenta(), setari(), kpi()]);
  if (!sesiune) return null;

  const azi = dataISO(s.fusOrar, new Date());
  const programari = await programariInterval(
    momentDinZiSiMinut(s.fusOrar, azi, 0),
    momentDinZiSiMinut(s.fusOrar, adaugaZile(azi, 1), 0),
  );

  const ora = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    hour: "2-digit",
    minute: "2-digit",
  });

  const carduri = indicatori
    ? [
        { eticheta: "Appuntamenti oggi", valoare: indicatori.programariAzi, href: "/admin/calendario" },
        { eticheta: "Appuntamenti domani", valoare: indicatori.programariMaine, href: "/admin/calendario" },
        { eticheta: "Da confermare", valoare: indicatori.inAsteptare, href: "/admin/appuntamenti" },
        { eticheta: "Pratiche aperte", valoare: indicatori.dosareActive, href: "/admin/pratiche" },
        { eticheta: "Documenti da verificare", valoare: indicatori.documenteDeVerificat, href: "/admin/pratiche" },
        { eticheta: "Clienti nuovi (mese)", valoare: indicatori.clientiNoi, href: "/admin/clienti" },
        { eticheta: "Messaggi non letti", valoare: indicatori.mesajeNecitite, href: "/admin/messaggi" },
        { eticheta: "Annullamenti (mese)", valoare: indicatori.anulariLunaAceasta, href: "/admin/statistiche" },
        { eticheta: "Mancate presenze (mese)", valoare: indicatori.neprezentariLunaAceasta, href: "/admin/statistiche" },
      ]
    : [];

  return (
    <>
      <AntetPagina
        titlu="Dashboard"
        descriere={new Intl.DateTimeFormat("it-IT", {
          timeZone: s.fusOrar,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date())}
      />

      <div className="space-y-7 px-5 py-6 lg:px-8">
        {!supabaseConfigurat() ? <BannerNeconfigurat /> : null}

        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          {carduri.map((c) => (
            <li key={c.eticheta}>
              <Link
                href={c.href}
                className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary"
              >
                <p className="font-serif text-3xl font-semibold">{c.valoare}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.eticheta}</p>
              </Link>
            </li>
          ))}
        </ul>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">Appuntamenti di oggi</h2>
            <Link
              href="/admin/calendario"
              className="text-sm font-medium text-primary-deep hover:underline"
            >
              Calendario completo
            </Link>
          </div>

          {programari.length === 0 ? (
            <div className="mt-3">
              <StareGoala titlu="Nessun appuntamento oggi" />
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
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {p.serviciu?.nume} · {p.operator?.nume}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {p.client.telefon ?? "—"}
                          {p.client.email ? ` · ${p.client.email}` : null}
                        </p>
                      </div>
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
        </section>
      </div>
    </>
  );
}
