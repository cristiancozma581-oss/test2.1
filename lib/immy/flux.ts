/**
 * Mașinile de stare: programare (§14), dosar (§21), document (§23).
 *
 * O tranziție are DOUĂ condiții, verificate separat:
 *   1. este permisă în principiu (`PENDING → CONFIRMED` da, `CANCELLED →
 *      COMPLETED` nu);
 *   2. rolul care o cere are voie s-o facă (clientul poate anula, dar nu poate
 *      confirma).
 *
 * Le ținem separate ca mesajul de eroare să spună care dintre ele a picat:
 * „nu se poate din starea asta" și „tu nu ai voie" sunt probleme diferite
 * pentru omul din fața ecranului.
 */

import type { Rol, StatusDocument, StatusDosar, StatusProgramare } from "./tipuri";

type Tranzitie<S> = { din: S; in: S; roluri: readonly Rol[] };

const PERSONAL: readonly Rol[] = ["SUPER_ADMIN", "ADMIN", "OPERATOR", "RECEPTIONIST"];
const ADMINI: readonly Rol[] = ["SUPER_ADMIN", "ADMIN"];
const TOTI: readonly Rol[] = [...PERSONAL, "CLIENT"];

// --- Programări --------------------------------------------------------------

export const TRANZITII_PROGRAMARE: readonly Tranzitie<StatusProgramare>[] = [
  { din: "PENDING", in: "CONFIRMED", roluri: PERSONAL },
  { din: "PENDING", in: "RESCHEDULED", roluri: PERSONAL },
  { din: "PENDING", in: "CANCELLED", roluri: TOTI },
  { din: "CONFIRMED", in: "RESCHEDULED", roluri: PERSONAL },
  { din: "CONFIRMED", in: "COMPLETED", roluri: PERSONAL },
  { din: "CONFIRMED", in: "CANCELLED", roluri: TOTI },
  { din: "CONFIRMED", in: "NO_SHOW", roluri: PERSONAL },
  { din: "RESCHEDULED", in: "CONFIRMED", roluri: PERSONAL },
  { din: "RESCHEDULED", in: "COMPLETED", roluri: PERSONAL },
  { din: "RESCHEDULED", in: "CANCELLED", roluri: TOTI },
  { din: "RESCHEDULED", in: "NO_SHOW", roluri: PERSONAL },
  // Din COMPLETED, CANCELLED și NO_SHOW nu se mai iese. O programare anulată
  // care ar putea reveni ar însemna un slot eliberat și reocupat pe tăcute,
  // peste ce a apucat între timp altcineva să rezerve.
];

// --- Dosare ------------------------------------------------------------------

export const TRANZITII_DOSAR: readonly Tranzitie<StatusDosar>[] = [
  { din: "NEW", in: "IN_PROGRESS", roluri: PERSONAL },
  { din: "NEW", in: "WAITING_DOCUMENTS", roluri: PERSONAL },
  { din: "NEW", in: "CANCELLED", roluri: PERSONAL },
  { din: "IN_PROGRESS", in: "WAITING_DOCUMENTS", roluri: PERSONAL },
  { din: "IN_PROGRESS", in: "UNDER_REVIEW", roluri: PERSONAL },
  { din: "IN_PROGRESS", in: "READY", roluri: PERSONAL },
  { din: "IN_PROGRESS", in: "CANCELLED", roluri: PERSONAL },
  { din: "WAITING_DOCUMENTS", in: "DOCUMENTS_RECEIVED", roluri: PERSONAL },
  { din: "WAITING_DOCUMENTS", in: "IN_PROGRESS", roluri: PERSONAL },
  { din: "WAITING_DOCUMENTS", in: "CANCELLED", roluri: PERSONAL },
  { din: "DOCUMENTS_RECEIVED", in: "UNDER_REVIEW", roluri: PERSONAL },
  { din: "DOCUMENTS_RECEIVED", in: "WAITING_DOCUMENTS", roluri: PERSONAL },
  { din: "DOCUMENTS_RECEIVED", in: "IN_PROGRESS", roluri: PERSONAL },
  { din: "UNDER_REVIEW", in: "READY", roluri: PERSONAL },
  { din: "UNDER_REVIEW", in: "WAITING_DOCUMENTS", roluri: PERSONAL },
  { din: "UNDER_REVIEW", in: "IN_PROGRESS", roluri: PERSONAL },
  { din: "READY", in: "COMPLETED", roluri: PERSONAL },
  { din: "READY", in: "UNDER_REVIEW", roluri: PERSONAL },
  { din: "COMPLETED", in: "CLOSED", roluri: PERSONAL },
  // Redeschiderea unui dosar închis este a administratorului: după închidere
  // încep să curgă termenele de păstrare, iar reintrarea trebuie să fie o
  // decizie asumată, nu un clic al oricui.
  { din: "CLOSED", in: "IN_PROGRESS", roluri: ADMINI },
  { din: "CANCELLED", in: "IN_PROGRESS", roluri: ADMINI },
];

// --- Documente ---------------------------------------------------------------

export const TRANZITII_DOCUMENT: readonly Tranzitie<StatusDocument>[] = [
  // Clientul poate încărca, deci poate duce documentul în „UPLOADED".
  { din: "REQUESTED", in: "UPLOADED", roluri: TOTI },
  { din: "UPLOADED", in: "UNDER_REVIEW", roluri: PERSONAL },
  { din: "UPLOADED", in: "VERIFIED", roluri: PERSONAL },
  { din: "UPLOADED", in: "REJECTED", roluri: PERSONAL },
  { din: "UPLOADED", in: "NEEDS_CORRECTION", roluri: PERSONAL },
  { din: "UNDER_REVIEW", in: "VERIFIED", roluri: PERSONAL },
  { din: "UNDER_REVIEW", in: "REJECTED", roluri: PERSONAL },
  { din: "UNDER_REVIEW", in: "NEEDS_CORRECTION", roluri: PERSONAL },
  { din: "REJECTED", in: "UPLOADED", roluri: TOTI },
  { din: "NEEDS_CORRECTION", in: "UPLOADED", roluri: TOTI },
  // Un document deja verificat poate fi redeschis dacă apare o îndoială.
  { din: "VERIFIED", in: "UNDER_REVIEW", roluri: PERSONAL },
];

// --- Interogări generice -----------------------------------------------------

function permisa<S>(t: readonly Tranzitie<S>[], din: S, in_: S): boolean {
  return t.some((x) => x.din === din && x.in === in_);
}

function permisaPentru<S>(
  t: readonly Tranzitie<S>[],
  din: S,
  in_: S,
  rol: Rol,
): boolean {
  return t.some((x) => x.din === din && x.in === in_ && x.roluri.includes(rol));
}

function urmatoarele<S>(t: readonly Tranzitie<S>[], din: S, rol: Rol): S[] {
  return t.filter((x) => x.din === din && x.roluri.includes(rol)).map((x) => x.in);
}

export const tranzitieProgramarePermisa = (d: StatusProgramare, i: StatusProgramare) =>
  permisa(TRANZITII_PROGRAMARE, d, i);
export const poateSchimbaProgramarea = (d: StatusProgramare, i: StatusProgramare, r: Rol) =>
  permisaPentru(TRANZITII_PROGRAMARE, d, i, r);
export const statusuriProgramareUrmatoare = (d: StatusProgramare, r: Rol) =>
  urmatoarele(TRANZITII_PROGRAMARE, d, r);

export const tranzitieDosarPermisa = (d: StatusDosar, i: StatusDosar) =>
  permisa(TRANZITII_DOSAR, d, i);
export const poateSchimbaDosarul = (d: StatusDosar, i: StatusDosar, r: Rol) =>
  permisaPentru(TRANZITII_DOSAR, d, i, r);
export const statusuriDosarUrmatoare = (d: StatusDosar, r: Rol) =>
  urmatoarele(TRANZITII_DOSAR, d, r);

export const tranzitieDocumentPermisa = (d: StatusDocument, i: StatusDocument) =>
  permisa(TRANZITII_DOCUMENT, d, i);
export const poateSchimbaDocumentul = (d: StatusDocument, i: StatusDocument, r: Rol) =>
  permisaPentru(TRANZITII_DOCUMENT, d, i, r);
export const statusuriDocumentUrmatoare = (d: StatusDocument, r: Rol) =>
  urmatoarele(TRANZITII_DOCUMENT, d, r);

/**
 * Poate clientul să anuleze el însuși, la momentul acesta?
 *
 * Anularea cu o oră înainte lasă slotul nevândut: pragul este configurabil în
 * `ie_settings.cancel_cutoff_hours`. Sub prag clientul nu pierde dreptul de a
 * anula — doar trebuie să sune, iar operatorul o face din admin.
 */
export function clientulPoateAnula(
  status: StatusProgramare,
  inceput: Date,
  acum: Date,
  pragOre: number,
): { permis: boolean; motiv?: string } {
  if (!tranzitieProgramarePermisa(status, "CANCELLED")) {
    return { permis: false, motiv: "L'appuntamento non è più annullabile." };
  }
  const oreRamase = (inceput.getTime() - acum.getTime()) / 3_600_000;
  if (oreRamase < pragOre) {
    return {
      permis: false,
      motiv:
        `Mancano meno di ${pragOre} ore all'appuntamento. ` +
        "Chiamaci e lo annulliamo insieme.",
    };
  }
  return { permis: true };
}
