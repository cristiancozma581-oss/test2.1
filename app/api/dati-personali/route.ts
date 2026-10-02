import { NextResponse } from "next/server";
import { clientSesiune } from "@/lib/immy/supabase";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { auditeaza } from "@/lib/immy/audit";

/**
 * Exportul datelor personale (§49 — dreptul de acces și de portabilitate).
 *
 * Întoarce ce conservăm despre utilizatorul CURENT, într-un JSON lizibil.
 * Interogările merg prin clientul de sesiune, deci sub RLS: chiar dacă un bug
 * ar lăsa un filtru afară, baza nu întoarce rândurile altcuiva.
 *
 * Fișierele nu se împachetează aici — ar face răspunsul de zeci de megaocteți.
 * Exportul le enumeră, iar clientul le descarcă din zona lui, cu link semnat.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) {
    return NextResponse.json({ eroare: "Non autenticato." }, { status: 401 });
  }

  const sb = await clientSesiune();
  if (!sb) return NextResponse.json({ eroare: "Integrazione non configurata." }, { status: 503 });

  const [profil, programari, dosare, documente, firuri, notificari] = await Promise.all([
    sb.from("ie_profiles").select("*").eq("id", sesiune.id).maybeSingle(),
    sb.from("ie_appointments").select("*").eq("client_id", sesiune.id),
    sb.from("ie_cases").select("*").eq("client_id", sesiune.id),
    sb
      .from("ie_documents")
      .select("id, label, status, current_version, created_at, ie_document_versions ( version, file_name, size_bytes, created_at )")
      .eq("client_id", sesiune.id),
    sb.from("ie_threads").select("id, subject, created_at, ie_messages ( body, sender_role, created_at )").eq("client_id", sesiune.id),
    sb.from("ie_notifications").select("event, title, body, created_at").eq("recipient_id", sesiune.id),
  ]);

  await auditeaza({
    actorId: sesiune.id,
    actorEmail: sesiune.email,
    actorRol: sesiune.rol,
    actiune: "EXPORT",
    entitate: "profile",
    entitateId: sesiune.id,
    rezumat: "Export dei dati personali richiesto dall'interessato.",
  });

  const export_ = {
    generato_il: new Date().toISOString(),
    titolare: "IMMY & EMY — Via Monte Rosa 101/B, 10154 Torino",
    nota:
      "Questo file contiene i dati che conserviamo su di te. I file dei documenti " +
      "non sono inclusi: puoi scaricarli singolarmente dalla tua area riservata.",
    profilo: profil.data,
    prenotazioni: programari.data ?? [],
    pratiche: dosare.data ?? [],
    documenti: documente.data ?? [],
    conversazioni: firuri.data ?? [],
    notifiche: notificari.data ?? [],
  };

  return new NextResponse(JSON.stringify(export_, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="immyemy-dati-${sesiune.id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
