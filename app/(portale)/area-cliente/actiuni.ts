"use server";

import { revalidatePath } from "next/cache";
import { anuleazaCaClient } from "@/lib/immy/dal/programari";
import { incarcaDocument } from "@/lib/immy/dal/documente";
import { deschideFir, trimiteMesaj } from "@/lib/immy/dal/mesaje";
import { marcheazaCitite } from "@/lib/immy/dal/notificari";
import { erori, schemaAnulare, schemaFirNou, schemaMesaj, uuid } from "@/lib/immy/validare";

/**
 * Acțiunile clientului (§19, §22, §26).
 *
 * Fiecare deleagă autorizarea stratului de acces la date, care verifică
 * proprietatea asupra rândului. Aici se validează doar forma datelor și se
 * reîmprospătează paginile atinse.
 */

export type StareActiune = { ok: boolean; eroare?: string; mesaj?: string };

export async function anuleazaProgramarea(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const verificat = schemaAnulare.safeParse({
    appointmentId: formular.get("appointmentId"),
    motiv: formular.get("motiv") || undefined,
  });

  if (!verificat.success) {
    return { ok: false, eroare: erori(verificat.error).appointmentId ?? "Dati non validi." };
  }

  const r = await anuleazaCaClient(verificat.data.appointmentId, verificat.data.motiv);
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/area-cliente", "layout");
  return { ok: true, mesaj: "Appuntamento annullato. L'orario torna disponibile per altri." };
}

export async function incarcaFisier(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const id = formular.get("documentId");
  const fisier = formular.get("fisier");

  if (!uuid.safeParse(id).success) {
    return { ok: false, eroare: "Documento non valido." };
  }
  if (!(fisier instanceof File) || fisier.size === 0) {
    return { ok: false, eroare: "Scegli un file da caricare." };
  }

  const r = await incarcaDocument(String(id), fisier);
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/area-cliente", "layout");
  return { ok: true, mesaj: `Documento caricato (versione ${r.date.versiune}). Lo verifichiamo presto.` };
}

export async function scrieMesaj(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const verificat = schemaMesaj.safeParse({
    threadId: formular.get("threadId"),
    corp: formular.get("corp"),
  });

  if (!verificat.success) {
    return { ok: false, eroare: erori(verificat.error).corp ?? "Messaggio non valido." };
  }

  const r = await trimiteMesaj(verificat.data.threadId, verificat.data.corp);
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/area-cliente/messaggi", "layout");
  return { ok: true };
}

export async function deschideConversatie(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const verificat = schemaFirNou.safeParse({
    subiect: formular.get("subiect"),
    corp: formular.get("corp"),
    caseId: formular.get("caseId") || undefined,
  });

  if (!verificat.success) {
    const e = erori(verificat.error);
    return { ok: false, eroare: e.subiect ?? e.corp ?? "Dati non validi." };
  }

  const r = await deschideFir(verificat.data);
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/area-cliente/messaggi", "layout");
  return { ok: true, mesaj: "Messaggio inviato. Ti rispondiamo al più presto." };
}

export async function marcheazaNotificarile() {
  await marcheazaCitite();
  revalidatePath("/area-cliente", "layout");
}
