"use server";

import { revalidatePath } from "next/cache";
import { schimbaStatus, reprogrameaza } from "@/lib/immy/dal/programari";
import { creeazaDosar, schimbaStatusDosar } from "@/lib/immy/dal/dosare";
import { cereDocument, verificaDocument } from "@/lib/immy/dal/documente";
import { trimiteMesaj } from "@/lib/immy/dal/mesaje";
import { marcheazaCitite } from "@/lib/immy/dal/notificari";
import {
  erori,
  schemaCerereDocument,
  schemaDosar,
  schemaMesaj,
  schemaReprogramare,
  schemaStatusDosar,
  schemaVerificareDocument,
  uuid,
} from "@/lib/immy/validare";
import { STATUSURI_PROGRAMARE, type StatusProgramare } from "@/lib/immy/tipuri";

/**
 * Acțiunile personalului (§72).
 *
 * Autorizarea este a stratului de acces la date: el știe și rolul, și cine
 * deține rândul. Aici se validează forma datelor și se reîmprospătează
 * paginile atinse.
 */

export type StareActiune = {
  ok: boolean;
  eroare?: string;
  mesaj?: string;
  campuri?: Record<string, string>;
};

export async function schimbaStatusProgramare(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const id = formular.get("appointmentId");
  const status = String(formular.get("status") ?? "");

  if (!uuid.safeParse(id).success) return { ok: false, eroare: "Prenotazione non valida." };
  if (!(STATUSURI_PROGRAMARE as readonly string[]).includes(status)) {
    return { ok: false, eroare: "Stato non valido." };
  }

  const r = await schimbaStatus(
    String(id),
    status as StatusProgramare,
    String(formular.get("motiv") ?? "") || undefined,
  );
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/operatore", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true, mesaj: "Stato aggiornato." };
}

export async function mutaProgramarea(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const verificat = schemaReprogramare.safeParse({
    appointmentId: formular.get("appointmentId"),
    inceput: formular.get("inceput"),
    operatorId: formular.get("operatorId") || undefined,
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Dati non validi.", campuri: erori(verificat.error) };
  }

  const r = await reprogrameaza(
    verificat.data.appointmentId,
    new Date(verificat.data.inceput),
    verificat.data.operatorId,
  );
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/operatore", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true, mesaj: "Appuntamento spostato. Il cliente è stato avvisato." };
}

export async function deschideDosar(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const verificat = schemaDosar.safeParse({
    clientId: formular.get("clientId"),
    serviceId: formular.get("serviceId"),
    operatorId: formular.get("operatorId") || undefined,
    titlu: formular.get("titlu"),
    termen: formular.get("termen") || "",
    prioritate: formular.get("prioritate") || "normal",
    note: formular.get("note") || undefined,
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla i campi.", campuri: erori(verificat.error) };
  }

  const r = await creeazaDosar({
    ...verificat.data,
    appointmentId: String(formular.get("appointmentId") ?? "") || undefined,
  });
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/operatore", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true, mesaj: `Pratica ${r.date.referinta} creata.` };
}

export async function schimbaStatusulDosarului(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const verificat = schemaStatusDosar.safeParse({
    caseId: formular.get("caseId"),
    status: formular.get("status"),
    nota: formular.get("nota") || undefined,
  });

  if (!verificat.success) return { ok: false, eroare: "Dati non validi." };

  const r = await schimbaStatusDosar(
    verificat.data.caseId,
    verificat.data.status,
    verificat.data.nota,
  );
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/operatore", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/area-cliente", "layout");
  return { ok: true, mesaj: "Stato aggiornato. Il cliente ha ricevuto la notifica." };
}

export async function cereUnDocument(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const verificat = schemaCerereDocument.safeParse({
    caseId: formular.get("caseId"),
    eticheta: formular.get("eticheta"),
    observatie: formular.get("observatie") || undefined,
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla i campi.", campuri: erori(verificat.error) };
  }

  const r = await cereDocument(
    verificat.data.caseId,
    verificat.data.eticheta,
    verificat.data.observatie,
  );
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/operatore", "layout");
  revalidatePath("/area-cliente", "layout");
  return { ok: true, mesaj: "Documento richiesto. Il cliente è stato avvisato." };
}

export async function verificaUnDocument(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const verificat = schemaVerificareDocument.safeParse({
    documentId: formular.get("documentId"),
    status: formular.get("status"),
    observatie: formular.get("observatie") || undefined,
  });

  if (!verificat.success) return { ok: false, eroare: "Dati non validi." };

  const r = await verificaDocument(
    verificat.data.documentId,
    verificat.data.status,
    verificat.data.observatie,
  );
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/operatore", "layout");
  revalidatePath("/area-cliente", "layout");
  return { ok: true, mesaj: "Documento aggiornato." };
}

export async function raspundeLaMesaj(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const verificat = schemaMesaj.safeParse({
    threadId: formular.get("threadId"),
    corp: formular.get("corp"),
  });

  if (!verificat.success) return { ok: false, eroare: "Messaggio non valido." };

  const r = await trimiteMesaj(verificat.data.threadId, verificat.data.corp);
  if (!r.ok) return { ok: false, eroare: r.eroare };

  revalidatePath("/operatore/messaggi", "layout");
  revalidatePath("/admin/messaggi", "layout");
  return { ok: true };
}

export async function marcheazaNotificarilePersonalului() {
  await marcheazaCitite();
  revalidatePath("/operatore", "layout");
  revalidatePath("/admin", "layout");
}
