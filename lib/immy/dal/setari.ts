import "server-only";

import { cache } from "react";
import { clientPublic, clientSesiune } from "../supabase";
import { FUS_IMPLICIT } from "../fus-orar";

/**
 * Setările platformei (§64) și textele editabile (§37).
 *
 * Fiecare citire are o valoare implicită completă. Dacă baza nu este încă
 * configurată — proiect nou, migrații nerulate, rețea căzută — situl public
 * trebuie să se randeze cu datele reale ale biroului, nu cu o pagină de eroare.
 */

export type Setari = {
  numeFirma: string;
  slogan: string;
  telefon: string;
  telefonSecundar: string | null;
  whatsapp: string | null;
  email: string;
  adresa: string;
  lat: number | null;
  lng: number | null;
  fusOrar: string;
  limbaImplicita: string;
  preavizMinute: number;
  orizontZile: number;
  pasMinute: number;
  pragAnulareOre: number;
  remindereMinute: number[];
  maxUploadMb: number;
  retentieLuni: number;
  platiOnline: boolean;
  asistentActiv: boolean;
};

/** Datele reale ale biroului, din situl existent. Nu sunt umplutură. */
export const SETARI_IMPLICITE: Setari = {
  numeFirma: "IMMY & EMY",
  slogan: "Pratiche per immigrati e CAF",
  telefon: "333 47 59 704",
  telefonSecundar: "011 85 32 73",
  whatsapp: "393347759704",
  email: "caf.immyemy@libero.it",
  adresa: "Via Monte Rosa, 101/B, 10154 — Torino (TO)",
  lat: 45.0895,
  lng: 7.7173,
  fusOrar: FUS_IMPLICIT,
  limbaImplicita: "it",
  preavizMinute: 120,
  orizontZile: 60,
  pasMinute: 15,
  pragAnulareOre: 12,
  remindereMinute: [1440, 120],
  maxUploadMb: 10,
  retentieLuni: 60,
  platiOnline: false,
  asistentActiv: true,
};

export const setari = cache(async (): Promise<Setari> => {
  const sb = clientPublic();
  if (!sb) return SETARI_IMPLICITE;

  const { data, error } = await sb
    .from("ie_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return SETARI_IMPLICITE;

  return {
    numeFirma: data.company_name ?? SETARI_IMPLICITE.numeFirma,
    slogan: data.tagline ?? SETARI_IMPLICITE.slogan,
    telefon: data.phone ?? SETARI_IMPLICITE.telefon,
    telefonSecundar: data.phone_secondary,
    whatsapp: data.whatsapp,
    email: data.email ?? SETARI_IMPLICITE.email,
    adresa: data.address ?? SETARI_IMPLICITE.adresa,
    lat: data.map_lat !== null ? Number(data.map_lat) : null,
    lng: data.map_lng !== null ? Number(data.map_lng) : null,
    fusOrar: data.timezone ?? FUS_IMPLICIT,
    limbaImplicita: data.default_locale ?? "it",
    preavizMinute: data.booking_lead_minutes ?? SETARI_IMPLICITE.preavizMinute,
    orizontZile: data.booking_horizon_days ?? SETARI_IMPLICITE.orizontZile,
    pasMinute: data.booking_granularity_minutes ?? SETARI_IMPLICITE.pasMinute,
    pragAnulareOre: data.cancel_cutoff_hours ?? SETARI_IMPLICITE.pragAnulareOre,
    remindereMinute: data.reminder_offsets_minutes ?? SETARI_IMPLICITE.remindereMinute,
    maxUploadMb: data.max_upload_mb ?? SETARI_IMPLICITE.maxUploadMb,
    retentieLuni: data.retention_months ?? SETARI_IMPLICITE.retentieLuni,
    platiOnline: data.payments_online_enabled ?? false,
    asistentActiv: data.ai_assistant_enabled ?? true,
  };
});

/**
 * Textele editabile din admin.
 *
 * Întoarce o funcție de căutare cu rezervă: `t("hero.title", "…")`. Dacă cheia
 * nu a fost încă introdusă în CMS, pagina afișează textul implicit din cod, în
 * loc să arate un gol sau numele cheii.
 */
export const texte = cache(async (limba = "it") => {
  const sb = clientPublic();
  const harta = new Map<string, string>();

  if (sb) {
    const { data } = await sb
      .from("ie_site_content")
      .select("key, value")
      .eq("locale", limba);
    for (const r of data ?? []) harta.set(r.key, r.value);
  }

  return (cheie: string, implicit: string) => harta.get(cheie) ?? implicit;
});

/** Scrie setările. Apelantul TREBUIE să fi verificat deja rolul. */
export async function salveazaSetari(valori: Record<string, unknown>) {
  const sb = await clientSesiune();
  if (!sb) return { ok: false as const, eroare: "Integrazione non configurata." };

  const { error } = await sb.from("ie_settings").update(valori).eq("id", 1);
  if (error) return { ok: false as const, eroare: error.message };
  return { ok: true as const };
}
