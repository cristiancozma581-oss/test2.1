import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { EditorFaq } from "@/components/immy/editor-faq";
import { clientSesiune } from "@/lib/immy/supabase";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";

export const metadata: Metadata = {
  title: "FAQ",
  robots: { index: false, follow: false },
};

export default async function PaginaFaqAdmin() {
  await cerutAdmin();

  const sb = await clientSesiune();
  const { data } = sb
    ? await sb
        .from("ie_faq")
        .select("id, question, answer, sort_order, is_active")
        .is("service_id", null)
        .order("sort_order")
    : { data: [] };

  return (
    <>
      <AntetPagina
        titlu="Domande frequenti"
        descriere="Compaiono sulla pagina /faq e alimentano l'assistente. Ogni modifica è immediata."
      />

      <div className="px-5 py-6 lg:px-8">
        <EditorFaq
          intrebari={(data ?? []).map((f) => ({
            id: f.id as string,
            intrebare: f.question as string,
            raspuns: f.answer as string,
            ordine: f.sort_order as number,
            activa: f.is_active as boolean,
          }))}
        />
      </div>
    </>
  );
}
