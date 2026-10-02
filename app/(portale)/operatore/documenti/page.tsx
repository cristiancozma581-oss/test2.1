import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusDocumentBadge } from "@/components/immy/stari";
import { DeschideDocument } from "@/components/immy/documente-client";
import { VerificaDocument } from "@/components/immy/actiuni-dosar";
import { documenteDeVerificat } from "@/lib/immy/dal/documente";
import { setari } from "@/lib/immy/dal/setari";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";

export const metadata: Metadata = {
  title: "Documenti da verificare",
  robots: { index: false, follow: false },
};

export default async function PaginaDocumenteOperator() {
  const [documente, s, sesiune] = await Promise.all([
    documenteDeVerificat(),
    setari(),
    sesiuneCurenta(),
  ]);
  if (!sesiune) return null;

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
        titlu="Documenti da verificare"
        descriere="I documenti caricati dai clienti, dal più vecchio al più recente."
      />

      <div className="px-5 py-6 lg:px-8">
        {documente.length === 0 ? (
          <StareGoala
            titlu="Nessun documento in attesa"
            descriere="Quando un cliente carica un documento, lo trovi qui pronto da verificare."
          />
        ) : (
          <ul className="space-y-3">
            {documente.map((d) => (
              <li key={d.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{d.eticheta}</p>
                    {d.dosar ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {d.caseId ? (
                          <Link
                            href={`/operatore/pratiche/${d.caseId}`}
                            className="hover:text-primary-deep"
                          >
                            Pratica: {d.dosar}
                          </Link>
                        ) : (
                          `Pratica: ${d.dosar}`
                        )}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Versione {d.versiune} · caricato {format.format(new Date(d.actualizatLa))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDocumentBadge status={d.status} />
                    <DeschideDocument documentId={d.id} versiune={d.versiune} />
                  </div>
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <VerificaDocument documentId={d.id} status={d.status} rol={sesiune.rol} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
