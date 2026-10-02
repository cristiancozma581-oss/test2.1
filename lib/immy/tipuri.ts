/**
 * Vocabularele platformei IMMY & EMY.
 *
 * Fiecare listă de aici trebuie să corespundă exact constrângerii `check` din
 * migrația care o definește. Perechea nu poate aluneca fără ca testele din
 * `tipuri.test.ts` să cadă, pentru că ele compară listele cu textul SQL-ului.
 */

// --- Roluri (§35) ------------------------------------------------------------

export const ROLURI = [
  "SUPER_ADMIN",
  "ADMIN",
  "OPERATOR",
  "RECEPTIONIST",
  "CLIENT",
] as const;
export type Rol = (typeof ROLURI)[number];

export const ETICHETE_ROL: Record<Rol, string> = {
  SUPER_ADMIN: "Super amministratore",
  ADMIN: "Amministratore",
  OPERATOR: "Operatore",
  RECEPTIONIST: "Accoglienza",
  CLIENT: "Cliente",
};

// --- Statusuri de programare (§14) -------------------------------------------

export const STATUSURI_PROGRAMARE = [
  "PENDING",
  "CONFIRMED",
  "RESCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type StatusProgramare = (typeof STATUSURI_PROGRAMARE)[number];

export const ETICHETE_PROGRAMARE: Record<StatusProgramare, string> = {
  PENDING: "In attesa di conferma",
  CONFIRMED: "Confermato",
  RESCHEDULED: "Spostato",
  COMPLETED: "Completato",
  CANCELLED: "Annullato",
  NO_SHOW: "Non presentato",
};

/**
 * Statusurile care ocupă slotul în calendar.
 *
 * Trebuie să fie identice cu predicatul constrângerii EXCLUDE din migrația
 * 0013. Dacă cele două se despart, motorul de sloturi ar propune ore pe care
 * baza le refuză (sau, mai rău, ar ascunde ore libere).
 */
export const STATUSURI_ACTIVE: readonly StatusProgramare[] = [
  "PENDING",
  "CONFIRMED",
  "RESCHEDULED",
] as const;

export function programareActiva(status: StatusProgramare): boolean {
  return STATUSURI_ACTIVE.includes(status);
}

// --- Statusuri de dosar (§21) ------------------------------------------------

export const STATUSURI_DOSAR = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_DOCUMENTS",
  "DOCUMENTS_RECEIVED",
  "UNDER_REVIEW",
  "READY",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
] as const;
export type StatusDosar = (typeof STATUSURI_DOSAR)[number];

export const ETICHETE_DOSAR: Record<StatusDosar, string> = {
  NEW: "Nuova",
  IN_PROGRESS: "In lavorazione",
  WAITING_DOCUMENTS: "In attesa di documenti",
  DOCUMENTS_RECEIVED: "Documenti ricevuti",
  UNDER_REVIEW: "In verifica",
  READY: "Pronta",
  COMPLETED: "Completata",
  CLOSED: "Chiusa",
  CANCELLED: "Annullata",
};

/** Dosarele care nu mai cer nimic de la nimeni. */
export const STATUSURI_DOSAR_INCHISE: readonly StatusDosar[] = [
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
] as const;

// --- Statusuri de document (§23) ---------------------------------------------

export const STATUSURI_DOCUMENT = [
  "REQUESTED",
  "UPLOADED",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "NEEDS_CORRECTION",
] as const;
export type StatusDocument = (typeof STATUSURI_DOCUMENT)[number];

export const ETICHETE_DOCUMENT: Record<StatusDocument, string> = {
  REQUESTED: "Richiesto",
  UPLOADED: "Caricato",
  UNDER_REVIEW: "In verifica",
  VERIFIED: "Verificato",
  REJECTED: "Rifiutato",
  NEEDS_CORRECTION: "Da correggere",
};

// --- Catalog -----------------------------------------------------------------

export const STATUSURI_SERVICIU = ["ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"] as const;
export type StatusServiciu = (typeof STATUSURI_SERVICIU)[number];

export const STATUSURI_PLATA = [
  "UNPAID",
  "PENDING",
  "PAID",
  "REFUNDED",
  "CANCELLED",
] as const;
export type StatusPlata = (typeof STATUSURI_PLATA)[number];

// --- Limbi (§4) --------------------------------------------------------------

export const LIMBI = ["it", "ro", "en"] as const;
export type Limba = (typeof LIMBI)[number];

export const ETICHETE_LIMBA: Record<Limba, string> = {
  it: "Italiano",
  ro: "Română",
  en: "English",
};

export function limbaValida(v: unknown): v is Limba {
  return typeof v === "string" && (LIMBI as readonly string[]).includes(v);
}

// --- Evenimente de notificare (§27) ------------------------------------------

export const EVENIMENTE = [
  "APPOINTMENT_CREATED",
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_COMPLETED",
  "DOCUMENT_REQUESTED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_VERIFIED",
  "DOCUMENT_REJECTED",
  "MESSAGE_RECEIVED",
  "CASE_STATUS_CHANGED",
  "ACCOUNT_WELCOME",
] as const;
export type Eveniment = (typeof EVENIMENTE)[number];

// --- Acțiuni auditabile (§48) ------------------------------------------------

export const ACTIUNI_AUDIT = [
  "LOGIN",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "UPLOAD",
  "DOWNLOAD",
  "BOOKING",
  "CANCEL",
  "RESCHEDULE",
  "STATUS_CHANGE",
  "ROLE_CHANGE",
  "EXPORT",
  "LOGIN_FAILED",
  "ACCESS_DENIED",
] as const;
export type ActiuneAudit = (typeof ACTIUNI_AUDIT)[number];

// --- Tipuri de fișier acceptate (§22, §50) -----------------------------------

/**
 * Perechea extensie ↔ tip MIME.
 *
 * Se verifică AMBELE, pe server: extensia singură se schimbă redenumind
 * fișierul, iar tipul MIME anunțat de browser este la fel de nesigur. Lista
 * trebuie să corespundă cu `allowed_mime_types` al bucket-ului din 0016.
 */
export const TIPURI_FISIER: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export const EXTENSII_ACCEPTATE = Object.keys(TIPURI_FISIER);
export const MIME_ACCEPTATE = Array.from(
  new Set(Object.values(TIPURI_FISIER).flat()),
);
