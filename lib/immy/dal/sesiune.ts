import "server-only";

import { cache } from "react";
import { forbidden, unauthorized } from "next/navigation";
import { clientSesiune } from "../supabase";
import { estePersonal, esteAdmin, poate, type Permisiune } from "../rbac";
import type { Rol } from "../tipuri";

/**
 * Sesiunea și autorizarea (§35, §50, §53).
 *
 * Documentația Next avertizează că Server Functions sunt POST-uri către ruta în
 * care trăiesc: sunt apelabile direct, nu doar prin interfață. De aceea NIMIC
 * din stratul acesta nu se bazează pe faptul că pagina a fost randată; fiecare
 * funcție de citire sau scriere își cere singură verdictul de aici.
 *
 * `cache()` face ca profilul să fie citit o singură dată pe cerere, oricâte
 * componente îl cer.
 */

export type Sesiune = {
  id: string;
  email: string;
  numeComplet: string | null;
  telefon: string | null;
  rol: Rol;
  limba: string;
  status: "active" | "disabled";
  /** Id-ul din `ie_operators`, dacă utilizatorul este un operator activ. */
  operatorId: string | null;
};

export const sesiuneCurenta = cache(async (): Promise<Sesiune | null> => {
  const sb = await clientSesiune();
  if (!sb) return null;

  /*
   * `getUser()`, nu `getSession()`.
   *
   * `getSession()` citește cookie-ul și îl crede pe cuvânt. `getUser()` cere
   * serverului Auth să valideze tokenul. Diferența contează exact în cazul care
   * ne interesează: un cookie fabricat.
   */
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;

  const { data: profil } = await sb
    .from("ie_profiles")
    .select("id, email, full_name, phone, role, preferred_locale, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profil) return null;

  // Un cont dezactivat are cookie valid, dar nu mai are voie nicăieri (§36).
  if (profil.status !== "active") return null;

  let operatorId: string | null = null;
  if (profil.role === "OPERATOR") {
    const { data: op } = await sb
      .from("ie_operators")
      .select("id")
      .eq("profile_id", profil.id)
      .eq("is_active", true)
      .maybeSingle();
    operatorId = op?.id ?? null;
  }

  return {
    id: profil.id,
    email: profil.email,
    numeComplet: profil.full_name,
    telefon: profil.phone,
    rol: profil.role as Rol,
    limba: profil.preferred_locale,
    status: profil.status as "active" | "disabled",
    operatorId,
  };
});

/** Sesiunea, sau 401. Pentru tot ce cere doar autentificare. */
export async function ceruteAutentificare(): Promise<Sesiune> {
  const s = await sesiuneCurenta();
  if (!s) unauthorized();
  return s;
}

/** Sesiunea cu o permisiune anume, sau 403. */
export async function ceruta(permisiune: Permisiune): Promise<Sesiune> {
  const s = await ceruteAutentificare();
  if (!poate(s.rol, permisiune)) forbidden();
  return s;
}

/** Sesiune de personal (orice rol în afară de client), sau 403. */
export async function cerutPersonal(): Promise<Sesiune> {
  const s = await ceruteAutentificare();
  if (!estePersonal(s.rol)) forbidden();
  return s;
}

/** Sesiune de administrator, sau 403. */
export async function cerutAdmin(): Promise<Sesiune> {
  const s = await ceruteAutentificare();
  if (!esteAdmin(s.rol)) forbidden();
  return s;
}

/**
 * Varianta pentru Server Actions, care nu redirecționează.
 *
 * O acțiune trebuie să poată întoarce un mesaj de eroare în formular; a arunca
 * `forbidden()` din mijlocul unei acțiuni ar arăta utilizatorului o pagină de
 * eroare în loc de câmpul pe care l-a greșit.
 */
export type Refuz = { ok: false; eroare: string };
export type Acceptare = { ok: true; sesiune: Sesiune };

export async function verifica(permisiune?: Permisiune): Promise<Acceptare | Refuz> {
  const s = await sesiuneCurenta();
  if (!s) {
    return { ok: false, eroare: "Sessione scaduta. Accedi di nuovo per continuare." };
  }
  if (permisiune && !poate(s.rol, permisiune)) {
    return { ok: false, eroare: "Non hai i permessi per questa operazione." };
  }
  return { ok: true, sesiune: s };
}
