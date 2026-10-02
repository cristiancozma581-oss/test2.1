/**
 * Controlul accesului pe roluri (§35).
 *
 * O singură matrice, într-un singur loc. Interfața o folosește ca să ascundă ce
 * nu are rost să arate, iar stratul de acces la date ca să REFUZE — nu invers:
 * ascunderea unui buton nu este o măsură de securitate, doar o curtoazie.
 *
 * Verificarea de proprietate („dosarul ăsta este al meu?") NU este aici: ea
 * depinde de rânduri, nu de rol, și trăiește în `lib/immy/dal/*` alături de
 * interogarea care aduce rândul.
 */

import type { Rol } from "./tipuri";

export const PERMISIUNI = [
  "dashboard.admin",
  "dashboard.operator",
  "calendar.vezi_tot",
  "calendar.vezi_propriu",
  "programari.creeaza",
  "programari.modifica",
  "programari.anuleaza_oricare",
  "clienti.vezi",
  "clienti.editeaza",
  "dosare.vezi_tot",
  "dosare.vezi_propriu",
  "dosare.creeaza",
  "dosare.modifica",
  "documente.vezi_tot",
  "documente.verifica",
  "documente.sterge",
  "mesaje.raspunde",
  "servicii.administreaza",
  "operatori.administreaza",
  "disponibilitate.administreaza",
  "faq.administreaza",
  "cms.administreaza",
  "notificari.administreaza",
  "statistici.vezi",
  "plati.administreaza",
  "utilizatori.administreaza",
  "roluri.schimba",
  "audit.vezi",
  "setari.administreaza",
] as const;

export type Permisiune = (typeof PERMISIUNI)[number];

/**
 * Ce poate fiecare rol.
 *
 * SUPER_ADMIN nu este enumerat: are tot, prin regula din `poate()`. Enumerarea
 * lui ar fi o listă care rămâne în urmă la fiecare permisiune nouă.
 */
const MATRICE: Record<Exclude<Rol, "SUPER_ADMIN">, readonly Permisiune[]> = {
  ADMIN: PERMISIUNI.filter(
    // Un ADMIN administrează tot, în afară de schimbarea rolurilor: promovarea
    // cuiva la administrator rămâne la SUPER_ADMIN, altfel primul cont compromis
    // își poate fabrica singur colegi.
    (p) => p !== "roluri.schimba",
  ),

  OPERATOR: [
    "dashboard.operator",
    "calendar.vezi_propriu",
    "programari.creeaza",
    "programari.modifica",
    "clienti.vezi",
    "dosare.vezi_propriu",
    "dosare.creeaza",
    "dosare.modifica",
    "documente.verifica",
    "mesaje.raspunde",
  ],

  // Accoglienza: ține calendarul și răspunde la telefon, dar nu intră în
  // dosare și nu vede documentele clienților.
  RECEPTIONIST: [
    "dashboard.operator",
    "calendar.vezi_tot",
    "programari.creeaza",
    "programari.modifica",
    "programari.anuleaza_oricare",
    "clienti.vezi",
    "mesaje.raspunde",
  ],

  CLIENT: [],
};

export function poate(rol: Rol | null | undefined, permisiune: Permisiune): boolean {
  if (!rol) return false;
  if (rol === "SUPER_ADMIN") return true;
  return MATRICE[rol]?.includes(permisiune) ?? false;
}

export function poateOricare(rol: Rol | null | undefined, p: readonly Permisiune[]): boolean {
  return p.some((x) => poate(rol, x));
}

export function poateToate(rol: Rol | null | undefined, p: readonly Permisiune[]): boolean {
  return p.every((x) => poate(rol, x));
}

export function permisiunileRolului(rol: Rol): readonly Permisiune[] {
  return rol === "SUPER_ADMIN" ? PERMISIUNI : (MATRICE[rol] ?? []);
}

/** Personalul biroului — tot ce nu este client. */
export function estePersonal(rol: Rol | null | undefined): boolean {
  return rol === "SUPER_ADMIN" || rol === "ADMIN" || rol === "OPERATOR" || rol === "RECEPTIONIST";
}

export function esteAdmin(rol: Rol | null | undefined): boolean {
  return rol === "SUPER_ADMIN" || rol === "ADMIN";
}

/** Unde ajunge fiecare rol după autentificare. */
export function paginaDeStart(rol: Rol | null | undefined): string {
  if (esteAdmin(rol)) return "/admin";
  if (rol === "OPERATOR" || rol === "RECEPTIONIST") return "/operatore";
  return "/area-cliente";
}

/**
 * Cine are voie să vadă un dosar anume.
 *
 * Funcție pură, ca regula să poată fi testată fără bază de date. Greșeala pe
 * care o repară a fost tocmai a unei gărzi scrise inline, care verifica numele
 * rolului („dacă e OPERATOR…") în loc de permisiune: orice ALT rol de personal
 * trecea neatins, iar RLS îl lăsa să citească rândul.
 *
 * Ordinea contează: clientul, apoi cine vede tot, apoi cine vede doar ce îi
 * este atribuit. Restul — nu.
 */
export function poateVedeaDosarul(
  vizitator: { rol: Rol; id: string; operatorId: string | null },
  dosar: { clientId: string; operatorId: string | null },
): boolean {
  if (dosar.clientId === vizitator.id) return true;
  if (poate(vizitator.rol, "dosare.vezi_tot")) return true;

  return (
    poate(vizitator.rol, "dosare.vezi_propriu") &&
    vizitator.operatorId !== null &&
    dosar.operatorId === vizitator.operatorId
  );
}
