import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StatusDocumentBadge, StatusDosarBadge } from "@/components/immy/stari";
import { DeschideDocument } from "@/components/immy/documente-client";
import { CereDocument, SchimbaStatusDosar, VerificaDocument } from "@/components/immy/actiuni-dosar";
import { dosar } from "@/lib/immy/dal/dosare";
import { setari } from "@/lib/immy/dal/setari";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { ETICHETE_DOSAR, type StatusDocument, type StatusDosar } from "@/lib/immy/tipuri";

export const metadata: Metadata = {
  title: "Pratica",
  robots: { index: false, follow: false },
};

type Proprietati = { params: Promise<{ id: string }> };

export default async function PaginaDosarOperator(props: Proprietati) {
  const { id } = await props.params;
  const [d, s, sesiune] = await Promise.all([dosar(id), setari(), sesiuneCurenta()]);

  if (!d || !sesiune) notFound();

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
        descriere={`${d.referinta} · ${d.client?.nume ?? d.client?.email ?? ""}`}
        actiuni={<StatusDosarBadge status={d.status} />}
      />

      <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.4fr_0.6fr] lg:px-8">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold">Avanzamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando cambi stato, il cliente riceve subito una notifica.
            </p>
            <div className="mt-4">
              <SchimbaStatusDosar caseId={d.id} status={d.status} rol={sesiune.rol} />
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-lg font-semibold">Documenti</h2>
            </div>

            {d.documente.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                Nessun documento in questa pratica.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {d.documente.map((doc) => (
                  <li key={doc.id} className="rounded-xl border border-border bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{doc.eticheta}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {doc.versiune > 0
                            ? `Versione ${doc.versiune} · aggiornato ${formatMoment.format(new Date(doc.actualizatLa))}`
                            : "In attesa del cliente"}
                        </p>
                        {doc.observatie ? (
                          <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
                            {doc.observatie}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusDocumentBadge status={doc.status as StatusDocument} />
                        {doc.versiune > 0 ? (
                          <DeschideDocument documentId={doc.id} versiune={doc.versiune} />
                        ) : null}
                      </div>
                    </div>

                    {doc.versiune > 0 ? (
                      <div className="mt-4 border-t border-border pt-4">
                        <VerificaDocument
                          documentId={doc.id}
                          status={doc.status as StatusDocument}
                          rol={sesiune.rol}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 rounded-xl border border-border bg-surface p-5">
              <h3 className="font-semibold">Chiedi un documento al cliente</h3>
              <div className="mt-3">
                <CereDocument caseId={d.id} />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-serif text-base font-semibold">Cliente</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd>{d.client?.nume ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">
                  {d.client?.email ? (
                    <a className="hover:text-primary-deep" href={`mailto:${d.client.email}`}>
                      {d.client.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Telefono</dt>
                <dd>
                  {d.client?.telefon ? (
                    <a
                      className="hover:text-primary-deep"
                      href={`tel:${d.client.telefon.replace(/[^\d+]/g, "")}`}
                    >
                      {d.client.telefon}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-serif text-base font-semibold">Dettagli</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
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
          </section>

          {d.istoric.length > 0 ? (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="font-serif text-base font-semibold">Storico</h2>
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
