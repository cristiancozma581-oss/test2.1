import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusDocumentBadge } from "@/components/immy/stari";
import { IncarcaDocument, DeschideDocument } from "@/components/immy/documente-client";
import { documenteleMele } from "@/lib/immy/dal/documente";
import { setari } from "@/lib/immy/dal/setari";
import { EXTENSII_ACCEPTATE } from "@/lib/immy/tipuri";

export const metadata: Metadata = {
  title: "I miei documenti",
  robots: { index: false, follow: false },
};

export default async function PaginaDocumente() {
  const [documente, s] = await Promise.all([documenteleMele(), setari()]);

  const deIncarcat = documente.filter((d) =>
    ["REQUESTED", "REJECTED", "NEEDS_CORRECTION"].includes(d.status),
  );
  const restul = documente.filter((d) => !deIncarcat.includes(d));

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <AntetPagina
        titlu="I miei documenti"
        descriere={`Formati accettati: ${EXTENSII_ACCEPTATE.join(", ").toUpperCase()} · massimo ${s.maxUploadMb} MB per file.`}
      />

      <div className="space-y-8 px-5 py-6 lg:px-8">
        {documente.length === 0 ? (
          <StareGoala
            titlu="Nessun documento"
            descriere="Quando apriamo una pratica per te, qui compaiono i documenti che ti chiediamo e quelli che hai già caricato."
          />
        ) : null}

        {deIncarcat.length > 0 ? (
          <section>
            <h2 className="font-serif text-lg font-semibold text-warning">Da caricare</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sono i documenti che aspettiamo da te per andare avanti con la pratica.
            </p>
            <ul className="mt-4 space-y-3">
              {deIncarcat.map((d) => (
                <li key={d.id} className="rounded-xl border border-warning/35 bg-warning/8 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{d.eticheta}</p>
                      {d.dosar ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">Pratica: {d.dosar}</p>
                      ) : null}
                      {d.observatie ? (
                        <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-sm">
                          <span className="font-medium">Nota dell&apos;operatore:</span>{" "}
                          {d.observatie}
                        </p>
                      ) : null}
                    </div>
                    <StatusDocumentBadge status={d.status} />
                  </div>

                  <div className="mt-4">
                    <IncarcaDocument documentId={d.id} maxMb={s.maxUploadMb} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {restul.length > 0 ? (
          <section>
            <h2 className="font-serif text-lg font-semibold">Caricati</h2>
            <ul className="mt-4 space-y-3">
              {restul.map((d) => (
                <li key={d.id} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{d.eticheta}</p>
                      {d.dosar ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">Pratica: {d.dosar}</p>
                      ) : null}
                    </div>
                    <StatusDocumentBadge status={d.status} />
                  </div>

                  {d.versiuni.length > 0 ? (
                    <ul className="mt-4 space-y-2 border-t border-border pt-4">
                      {d.versiuni.map((v) => (
                        <li
                          key={v.id}
                          className="flex flex-wrap items-center justify-between gap-3 text-sm"
                        >
                          <span>
                            <span className="font-medium">v{v.versiune}</span>
                            <span className="ml-2 text-muted-foreground">{v.numeFisier}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {format.format(new Date(v.incarcatLa))} ·{" "}
                              {(v.marime / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </span>
                          <DeschideDocument documentId={d.id} versiune={v.versiune} />
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {/* Reîncărcarea nu suprascrie: creează v+1 și păstrează
                      istoricul (§25). */}
                  <div className="mt-4 border-t border-border pt-4">
                    <IncarcaDocument
                      documentId={d.id}
                      maxMb={s.maxUploadMb}
                      eticheta="Carica una nuova versione"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
