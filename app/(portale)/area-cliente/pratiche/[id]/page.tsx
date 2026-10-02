import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import {
  StatusDocumentBadge,
  StatusDosarBadge,
  StatusProgramareBadge,
} from "@/components/immy/stari";
import { IncarcaDocument } from "@/components/immy/documente-client";
import { Button } from "@/components/ui/button";
import { dosar } from "@/lib/immy/dal/dosare";
import { setari } from "@/lib/immy/dal/setari";
import {
  ETICHETE_DOSAR,
  type StatusDocument,
  type StatusDosar,
  type StatusProgramare,
} from "@/lib/immy/tipuri";

export const metadata: Metadata = {
  title: "Pratica",
  robots: { index: false, follow: false },
};

type Proprietati = { params: Promise<{ id: string }> };

export default async function PaginaDosar(props: Proprietati) {
  const { id } = await props.params;
  const [d, s] = await Promise.all([dosar(id), setari()]);

  // `dosar()` întoarce `null` și pentru „nu există", și pentru „nu ai voie":
  // pagina nu trebuie să deosebească cele două cazuri pentru vizitator.
  if (!d) notFound();

  const formatZi = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formatMoment = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <AntetPagina
        titlu={d.titlu}
        descriere={`${d.referinta} · ${d.serviciu?.nume ?? ""}`}
        actiuni={<StatusDosarBadge status={d.status} />}
      />

      <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.4fr_0.6fr] lg:px-8">
        <div className="space-y-6">
          {/* Documente */}
          <section>
            <h2 className="font-serif text-lg font-semibold">Documenti</h2>
            {d.documente.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                Per questa pratica non ti abbiamo ancora chiesto documenti.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {d.documente.map((doc) => (
                  <li key={doc.id} className="rounded-xl border border-border bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{doc.eticheta}</p>
                        {doc.versiune > 0 ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Versione {doc.versiune}
                          </p>
                        ) : null}
                        {doc.observatie ? (
                          <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
                            {doc.observatie}
                          </p>
                        ) : null}
                      </div>
                      <StatusDocumentBadge status={doc.status as StatusDocument} />
                    </div>

                    {["REQUESTED", "REJECTED", "NEEDS_CORRECTION"].includes(doc.status) ? (
                      <div className="mt-4 border-t border-border pt-4">
                        <IncarcaDocument documentId={doc.id} maxMb={s.maxUploadMb} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Programări legate de dosar */}
          {d.programari.length > 0 ? (
            <section>
              <h2 className="font-serif text-lg font-semibold">Appuntamenti</h2>
              <ul className="mt-3 space-y-2">
                {d.programari.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
                  >
                    <span className="capitalize">{formatMoment.format(new Date(p.starts_at))}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                      <StatusProgramareBadge status={p.status as StatusProgramare} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-serif text-base font-semibold">Dettagli</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="text-muted-foreground">Riferimento</dt>
                <dd className="font-mono">{d.referinta}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Servizio</dt>
                <dd>{d.serviciu?.nume ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Operatore</dt>
                <dd>{d.operator?.nume ?? "Da assegnare"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Aperta il</dt>
                <dd>{formatZi.format(new Date(d.creatLa))}</dd>
              </div>
              {d.termen ? (
                <div>
                  <dt className="text-muted-foreground">Scadenza</dt>
                  <dd>{formatZi.format(new Date(d.termen))}</dd>
                </div>
              ) : null}
            </dl>

            <Button asChild size="sm" variant="outline" className="mt-4 w-full rounded-full">
              <Link href="/area-cliente/messaggi">Scrivi all&apos;operatore</Link>
            </Button>
          </section>

          {d.istoric.length > 0 ? (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="font-serif text-base font-semibold">Avanzamento</h2>
              <ol className="mt-3 space-y-3">
                {d.istoric.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <span>
                      <span className="block font-medium">
                        {ETICHETE_DOSAR[h.to_status as StatusDosar] ?? h.to_status}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatMoment.format(new Date(h.created_at))}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
