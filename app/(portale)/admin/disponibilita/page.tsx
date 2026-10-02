import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala } from "@/components/immy/stari";
import { EditorDisponibilitate } from "@/components/immy/editor-disponibilitate";
import { operatori } from "@/lib/immy/dal/catalog";
import { exceptiiViitoare, programSaptamanal } from "@/lib/immy/dal/disponibilitate";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";

export const metadata: Metadata = {
  title: "Disponibilità",
  robots: { index: false, follow: false },
};

/**
 * Programul și excepțiile (§16, §17).
 *
 * De aici se schimbă orarul biroului fără o linie de cod: motorul de sloturi
 * citește chiar aceste rânduri, deci o modificare se vede imediat în calendarul
 * public.
 */
export default async function PaginaDisponibilitate() {
  await cerutAdmin();

  const lista = await operatori();
  if (lista.length === 0) {
    return (
      <>
        <AntetPagina titlu="Disponibilità" />
        <div className="px-5 py-6 lg:px-8">
          <StareGoala
            titlu="Nessun operatore"
            descriere="Crea prima un operatore: gli orari si assegnano a una persona."
            actiune={{ eticheta: "Vai a Operatori", href: "/admin/operatori" }}
          />
        </div>
      </>
    );
  }

  const programe = await Promise.all(
    lista.map(async (o) => ({ operator: o, reguli: await programSaptamanal(o.id) })),
  );
  const exceptii = await exceptiiViitoare();

  return (
    <>
      <AntetPagina
        titlu="Disponibilità"
        descriere="Orario settimanale, pause, chiusure e aperture straordinarie. Il calendario pubblico si aggiorna subito."
      />

      <div className="px-5 py-6 lg:px-8">
        <EditorDisponibilitate
          programe={programe}
          exceptii={exceptii.map((e) => ({
            id: e.id as string,
            operatorId: (e.operator_id as string | null) ?? null,
            deLa: e.date_from as string,
            panaLa: e.date_to as string,
            tip: e.kind as string,
            oraDeLa: (e.starts_at as string | null) ?? null,
            oraPanaLa: (e.ends_at as string | null) ?? null,
            motiv: (e.reason as string | null) ?? null,
          }))}
          operatori={lista}
        />
      </div>
    </>
  );
}
