import "server-only";

import { clientSesiune, clientServiciu } from "../supabase";
import { sesiuneCurenta } from "./sesiune";
import { setari } from "./setari";
import { auditeaza } from "../audit";
import { trimiteNotificare } from "../notificari";
import { poateSchimbaDocumentul } from "../flux";
import { BUCKET_DOCUMENTE, DURATA_LINK_SEMNAT_SEC } from "../env";
import { numeFisierSigur, validareFisier } from "../validare";
import { ETICHETE_DOCUMENT, type StatusDocument } from "../tipuri";
import { estePersonal, poate } from "../rbac";
import type { Rezultat } from "./programari";

/**
 * Documentele (§22-§25, §62).
 *
 * Trei reguli, în ordinea importanței:
 *
 *   1. Bucket-ul este PRIVAT. Nu există nicio adresă publică către un document.
 *      Singura cale de acces este un link semnat, emis aici, după ce s-a
 *      verificat cine cere. Asta închide IDOR-ul: nu ai ce ghici, pentru că nu
 *      există URL de ghicit.
 *   2. Reîncărcarea nu suprascrie. Fiecare fișier este o versiune nouă, cu
 *      istoricul intact (§25).
 *   3. Fișierul se validează pe server — extensie, tip MIME și mărime — chiar
 *      dacă browserul a validat deja.
 */

export type DocumentClient = {
  id: string;
  eticheta: string;
  status: StatusDocument;
  statusEticheta: string;
  versiune: number;
  observatie: string | null;
  actualizatLa: string;
  caseId: string | null;
  dosar: string | null;
  versiuni: {
    id: string;
    versiune: number;
    numeFisier: string;
    marime: number;
    incarcatLa: string;
  }[];
};

const SELECT = `
  id, label, status, current_version, review_note, updated_at, case_id, client_id,
  ie_cases ( id, reference, title, operator_id ),
  ie_document_versions ( id, version, file_name, size_bytes, created_at )
`;

type Rand = {
  id: string;
  label: string;
  status: string;
  current_version: number;
  review_note: string | null;
  updated_at: string;
  case_id: string | null;
  client_id: string;
  ie_cases: { id: string; reference: string; title: string; operator_id: string | null } | null;
  ie_document_versions: {
    id: string; version: number; file_name: string; size_bytes: number; created_at: string;
  }[];
};

function laDocument(r: Rand): DocumentClient {
  return {
    id: r.id,
    eticheta: r.label,
    status: r.status as StatusDocument,
    statusEticheta: ETICHETE_DOCUMENT[r.status as StatusDocument] ?? r.status,
    versiune: r.current_version,
    observatie: r.review_note,
    actualizatLa: r.updated_at,
    caseId: r.case_id,
    dosar: r.ie_cases?.title ?? null,
    versiuni: (r.ie_document_versions ?? [])
      .sort((a, b) => b.version - a.version)
      .map((v) => ({
        id: v.id,
        versiune: v.version,
        numeFisier: v.file_name,
        marime: v.size_bytes,
        incarcatLa: v.created_at,
      })),
  };
}

/** Documentele clientului autentificat (§18). */
export async function documenteleMele(): Promise<DocumentClient[]> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_documents")
    .select(SELECT)
    .eq("client_id", sesiune.id)
    .order("updated_at", { ascending: false });

  return ((data ?? []) as unknown as Rand[]).map(laDocument);
}

/** Documentele care așteaptă verificarea operatorului (§33, §34). */
export async function documenteDeVerificat(): Promise<DocumentClient[]> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "documente.verifica")) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_documents")
    .select(SELECT)
    .in("status", ["UPLOADED", "UNDER_REVIEW"])
    .order("updated_at", { ascending: true });

  const toate = ((data ?? []) as unknown as Rand[]).map((r) => ({ rand: r, doc: laDocument(r) }));

  // Un operator vede numai documentele dosarelor lui.
  const filtrate =
    poate(sesiune.rol, "documente.vezi_tot") || !sesiune.operatorId
      ? toate
      : toate.filter((x) => x.rand.ie_cases?.operator_id === sesiune.operatorId);

  return filtrate.map((x) => x.doc);
}

/**
 * Verifică dacă utilizatorul curent are dreptul asupra unui document.
 *
 * O singură funcție, folosită de tot ce atinge documente — încărcare, descărcare,
 * verificare. O regulă scrisă o dată nu poate diverge între căi de cod.
 */
async function areAccesLaDocument(
  documentId: string,
): Promise<{ permis: boolean; rand?: Rand }> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return { permis: false };

  const sb = await clientSesiune();
  if (!sb) return { permis: false };

  const { data } = await sb.from("ie_documents").select(SELECT).eq("id", documentId).maybeSingle();
  if (!data) return { permis: false };

  const r = data as unknown as Rand;

  if (r.client_id === sesiune.id) return { permis: true, rand: r };

  if (estePersonal(sesiune.rol)) {
    // Accoglienza nu are treabă cu documentele clienților (§35).
    if (!poate(sesiune.rol, "documente.verifica") && !poate(sesiune.rol, "documente.vezi_tot")) {
      return { permis: false };
    }
    if (poate(sesiune.rol, "documente.vezi_tot")) return { permis: true, rand: r };
    // Operatorul: numai dosarele proprii.
    if (sesiune.operatorId && r.ie_cases?.operator_id === sesiune.operatorId) {
      return { permis: true, rand: r };
    }
  }

  return { permis: false };
}

/**
 * Linkul semnat către o versiune de document (§24, §62).
 *
 * Verifică accesul, apoi emite un link cu viață scurtă. Fiecare emitere este
 * auditată: cine a descărcat ce document și când.
 */
export async function linkDocument(
  documentId: string,
  versiune?: number,
): Promise<Rezultat<{ url: string; numeFisier: string }>> {
  const acces = await areAccesLaDocument(documentId);
  const sesiune = await sesiuneCurenta();

  if (!acces.permis || !acces.rand) {
    await auditeaza({
      actorId: sesiune?.id ?? null,
      actorEmail: sesiune?.email ?? null,
      actorRol: sesiune?.rol ?? null,
      actiune: "ACCESS_DENIED",
      entitate: "document",
      entitateId: documentId,
      rezumat: "Tentativo di accesso a un documento non proprio.",
    });
    return { ok: false, eroare: "Documento non trovato." };
  }

  const sb = clientServiciu();
  if (!sb) return { ok: false, eroare: "Archiviazione non configurata." };

  const numarVersiune = versiune ?? acces.rand.current_version;
  const { data: v } = await sb
    .from("ie_document_versions")
    .select("storage_path, file_name")
    .eq("document_id", documentId)
    .eq("version", numarVersiune)
    .maybeSingle();

  if (!v) return { ok: false, eroare: "Versione del documento non trovata." };

  const { data: semnat, error } = await sb.storage
    .from(BUCKET_DOCUMENTE)
    .createSignedUrl(v.storage_path, DURATA_LINK_SEMNAT_SEC, { download: v.file_name });

  if (error || !semnat) {
    return { ok: false, eroare: "Non è stato possibile aprire il documento." };
  }

  await auditeaza({
    actorId: sesiune?.id ?? null,
    actorEmail: sesiune?.email ?? null,
    actorRol: sesiune?.rol ?? null,
    actiune: "DOWNLOAD",
    entitate: "document",
    entitateId: documentId,
    rezumat: `${acces.rand.label} v${numarVersiune}`,
  });

  return { ok: true, date: { url: semnat.signedUrl, numeFisier: v.file_name } };
}

/**
 * Încarcă un fișier ca versiune nouă a unui document (§22, §25).
 *
 * Calea în bucket este construită DOAR din valori de încredere — id-uri din
 * bază și un nume curățat — niciodată din text primit brut de la client.
 */
export async function incarcaDocument(
  documentId: string,
  fisier: File,
): Promise<Rezultat<{ versiune: number }>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return { ok: false, eroare: "Sessione scaduta. Accedi di nuovo." };

  const acces = await areAccesLaDocument(documentId);
  if (!acces.permis || !acces.rand) return { ok: false, eroare: "Documento non trovato." };

  const s = await setari();
  const verdict = validareFisier(fisier.name, fisier.type, fisier.size, s.maxUploadMb);
  if (!verdict.valid) return { ok: false, eroare: verdict.motiv };

  const sb = clientServiciu();
  if (!sb) return { ok: false, eroare: "Archiviazione non configurata." };

  const urmatoarea = acces.rand.current_version + 1;
  const numeSigur = numeFisierSigur(fisier.name);
  const cale = `${acces.rand.client_id}/${documentId}/v${urmatoarea}-${Date.now()}-${numeSigur}`;

  const { error: eroareUpload } = await sb.storage
    .from(BUCKET_DOCUMENTE)
    .upload(cale, fisier, { contentType: fisier.type, upsert: false });

  if (eroareUpload) {
    return { ok: false, eroare: "Il caricamento non è riuscito. Riprova." };
  }

  const { data: versiune, error } = await sb
    .from("ie_document_versions")
    .insert({
      document_id: documentId,
      storage_path: cale,
      file_name: fisier.name.slice(0, 255),
      mime_type: fisier.type,
      size_bytes: fisier.size,
      uploaded_by: sesiune.id,
    })
    .select("version")
    .single();

  if (error || !versiune) {
    // Fișierul a ajuns în bucket, dar rândul nu s-a scris: îl scoatem, ca
    // bucket-ul să nu adune obiecte pe care nimeni nu le mai poate găsi.
    await sb.storage.from(BUCKET_DOCUMENTE).remove([cale]);
    return { ok: false, eroare: "Il caricamento non è riuscito. Riprova." };
  }

  await Promise.all([
    trimiteNotificare({
      eveniment: "DOCUMENT_UPLOADED",
      catrePersonal: true,
      context: {
        document: acces.rand.label,
        dosar: acces.rand.ie_cases?.title ?? "—",
        nume: sesiune.numeComplet ?? sesiune.email,
      },
      entitate: { tip: "document", id: documentId },
    }),
    auditeaza({
      actorId: sesiune.id,
      actorEmail: sesiune.email,
      actorRol: sesiune.rol,
      actiune: "UPLOAD",
      entitate: "document",
      entitateId: documentId,
      rezumat: `${acces.rand.label} v${versiune.version} (${fisier.name})`,
      detalii: { marime: fisier.size, tip: fisier.type },
    }),
  ]);

  return { ok: true, date: { versiune: versiune.version } };
}

/** Cere un document de la client (§72). */
export async function cereDocument(
  caseId: string,
  eticheta: string,
  observatie?: string,
): Promise<Rezultat<{ id: string }>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "documente.verifica")) {
    return { ok: false, eroare: "Non hai i permessi per questa operazione." };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { data: dosar } = await sb
    .from("ie_cases")
    .select("id, title, client_id, operator_id")
    .eq("id", caseId)
    .maybeSingle();

  if (!dosar) return { ok: false, eroare: "Pratica non trovata." };
  if (
    sesiune.rol === "OPERATOR" &&
    !poate(sesiune.rol, "dosare.vezi_tot") &&
    dosar.operator_id !== sesiune.operatorId
  ) {
    return { ok: false, eroare: "Questa pratica è assegnata a un altro operatore." };
  }

  const { data, error } = await sb
    .from("ie_documents")
    .insert({
      case_id: caseId,
      client_id: dosar.client_id,
      label: eticheta,
      status: "REQUESTED",
      review_note: observatie ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, eroare: "Non è stato possibile creare la richiesta." };

  await Promise.all([
    trimiteNotificare({
      eveniment: "DOCUMENT_REQUESTED",
      destinatarId: dosar.client_id,
      context: { document: eticheta, dosar: dosar.title, observatie: observatie ?? "" },
      entitate: { tip: "document", id: data.id },
    }),
    auditeaza({
      actorId: sesiune.id,
      actorEmail: sesiune.email,
      actorRol: sesiune.rol,
      actiune: "CREATE",
      entitate: "document",
      entitateId: data.id,
      rezumat: `Richiesta: ${eticheta}`,
    }),
  ]);

  return { ok: true, date: { id: data.id } };
}

/** Verificarea unui document de către operator (§72). */
export async function verificaDocument(
  documentId: string,
  status: StatusDocument,
  observatie?: string,
): Promise<Rezultat<null>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "documente.verifica")) {
    return { ok: false, eroare: "Non hai i permessi per questa operazione." };
  }

  const acces = await areAccesLaDocument(documentId);
  if (!acces.permis || !acces.rand) return { ok: false, eroare: "Documento non trovato." };

  const din = acces.rand.status as StatusDocument;
  if (!poateSchimbaDocumentul(din, status, sesiune.rol)) {
    return {
      ok: false,
      eroare: `Non è possibile passare da «${ETICHETE_DOCUMENT[din]}» a «${ETICHETE_DOCUMENT[status]}».`,
    };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { error } = await sb
    .from("ie_documents")
    .update({
      status,
      review_note: observatie ?? null,
      reviewed_by: sesiune.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) return { ok: false, eroare: "Aggiornamento non riuscito." };

  const eveniment =
    status === "VERIFIED"
      ? "DOCUMENT_VERIFIED"
      : status === "REJECTED" || status === "NEEDS_CORRECTION"
        ? "DOCUMENT_REJECTED"
        : null;

  if (eveniment) {
    await trimiteNotificare({
      eveniment,
      destinatarId: acces.rand.client_id,
      context: {
        document: acces.rand.label,
        dosar: acces.rand.ie_cases?.title ?? "",
        observatie: observatie ?? "",
      },
      entitate: { tip: "document", id: documentId },
    });
  }

  await auditeaza({
    actorId: sesiune.id,
    actorEmail: sesiune.email,
    actorRol: sesiune.rol,
    actiune: "STATUS_CHANGE",
    entitate: "document",
    entitateId: documentId,
    rezumat: `${acces.rand.label}: ${din} → ${status}`,
    detalii: { observatie },
  });

  return { ok: true, date: null };
}
