import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala } from "@/components/immy/stari";
import { EditorServicii } from "@/components/immy/editor-servicii";
import { catalogAdmin, categorii, operatori } from "@/lib/immy/dal/catalog";
import { clientSesiune } from "@/lib/immy/supabase";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";

export const metadata: Metadata = {
  title: "Servizi",
  robots: { index: false, follow: false },
};

export default async function PaginaServiciiAdmin() {
  await cerutAdmin();

  const [servicii, listaCategorii, listaOperatori] = await Promise.all([
    catalogAdmin(),
    categorii(),
    operatori(),
  ]);

  // Legăturile operator ↔ serviciu, ca editorul să bifeze corect la deschidere.
  const sb = await clientSesiune();
  const { data: legaturi } = sb
    ? await sb.from("ie_operator_services").select("operator_id, service_id")
    : { data: [] };

  const peServiciu = new Map<string, string[]>();
  for (const l of legaturi ?? []) {
    const lista = peServiciu.get(l.service_id) ?? [];
    lista.push(l.operator_id);
    peServiciu.set(l.service_id, lista);
  }

  return (
    <>
      <AntetPagina
        titlu="Servizi"
        descriere="Il catalogo che vedono i clienti. Ogni modifica qui compare subito sul sito."
      />

      <div className="px-5 py-6 lg:px-8">
        {listaCategorii.length === 0 ? (
          <StareGoala
            titlu="Nessuna categoria"
            descriere="Esegui le migrazioni e il seed: le categorie iniziali arrivano da lì."
          />
        ) : (
          <EditorServicii
            servicii={servicii.map((s) => ({
              id: s.id as string,
              slug: s.slug as string,
              nume: s.name as string,
              descriereScurta: (s.short_description as string | null) ?? "",
              descriere: (s.description as string | null) ?? "",
              cuvinteCheie: ((s.keywords as string[] | null) ?? []).join(", "),
              durataMinute: s.duration_minutes as number,
              pretCenti: s.price_cents as number | null,
              status: s.status as string,
              rezervabilOnline: s.bookable_online as boolean,
              cereDocumente: s.requires_documents as boolean,
              ordine: s.sort_order as number,
              categoryId: s.category_id as string,
              operatori: peServiciu.get(s.id as string) ?? [],
            }))}
            categorii={listaCategorii}
            operatori={listaOperatori}
          />
        )}
      </div>
    </>
  );
}
