import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { EditorOperatori } from "@/components/immy/editor-operatori";
import { operatori, servicii } from "@/lib/immy/dal/catalog";
import { clientSesiune } from "@/lib/immy/supabase";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";

export const metadata: Metadata = {
  title: "Operatori",
  robots: { index: false, follow: false },
};

export default async function PaginaOperatori() {
  await cerutAdmin();

  const [lista, listaServicii] = await Promise.all([operatori(), servicii()]);

  const sb = await clientSesiune();
  const [{ data: legaturi }, { data: detalii }] = await Promise.all([
    sb
      ? sb.from("ie_operator_services").select("operator_id, service_id")
      : Promise.resolve({ data: [] as { operator_id: string; service_id: string }[] }),
    sb
      ? sb.from("ie_operators").select("id, email, phone, is_active")
      : Promise.resolve({ data: [] as { id: string; email: string | null; phone: string | null; is_active: boolean }[] }),
  ]);

  const peOperator = new Map<string, string[]>();
  for (const l of legaturi ?? []) {
    const x = peOperator.get(l.operator_id) ?? [];
    x.push(l.service_id);
    peOperator.set(l.operator_id, x);
  }

  const extra = new Map((detalii ?? []).map((d) => [d.id, d]));

  return (
    <>
      <AntetPagina
        titlu="Operatori"
        descriere="Chi lavora in ufficio e quali servizi offre. Un operatore senza servizi non compare nel calendario."
      />

      <div className="px-5 py-6 lg:px-8">
        <EditorOperatori
          operatori={lista.map((o) => ({
            id: o.id,
            numeAfisat: o.nume,
            slug: o.slug,
            titlu: o.titlu ?? "",
            culoare: o.culoare,
            email: extra.get(o.id)?.email ?? "",
            telefon: extra.get(o.id)?.phone ?? "",
            activ: extra.get(o.id)?.is_active ?? true,
            servicii: peOperator.get(o.id) ?? [],
          }))}
          servicii={listaServicii.map((s) => ({ id: s.id, nume: s.nume }))}
        />
      </div>
    </>
  );
}
