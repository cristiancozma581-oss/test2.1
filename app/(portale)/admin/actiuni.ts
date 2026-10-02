"use server";

import { revalidatePath } from "next/cache";
import { clientSesiune } from "@/lib/immy/supabase";
import { cerutAdmin, verifica } from "@/lib/immy/dal/sesiune";
import { salveazaSetari } from "@/lib/immy/dal/setari";
import { auditeaza } from "@/lib/immy/audit";
import {
  erori,
  schemaExceptie,
  schemaFaq,
  schemaOperator,
  schemaRegulaProgram,
  schemaServiciu,
  schemaSetari,
  uuid,
} from "@/lib/immy/validare";
import { ROLURI, type Rol } from "@/lib/immy/tipuri";

/**
 * Administrarea (§37, §38, §64, §73).
 *
 * `cerutAdmin()` la începutul fiecărei acțiuni: sunt endpointuri POST, deci
 * apelabile direct de oricine are adresa. Ascunderea legăturii din meniu nu
 * apără nimic — refuzul de aici, da.
 */

export type StareAdmin = {
  ok: boolean;
  eroare?: string;
  mesaj?: string;
  campuri?: Record<string, string>;
};

// --- Servicii (§8) -----------------------------------------------------------

export async function salveazaServiciul(
  _stare: StareAdmin,
  formular: FormData,
): Promise<StareAdmin> {
  const acces = await verifica("servicii.administreaza");
  if (!acces.ok) return { ok: false, eroare: acces.eroare };

  const verificat = schemaServiciu.safeParse({
    id: formular.get("id") || undefined,
    categoryId: formular.get("categoryId"),
    slug: formular.get("slug"),
    nume: formular.get("nume"),
    descriereScurta: formular.get("descriereScurta") || undefined,
    descriere: formular.get("descriere") || undefined,
    cuvinteCheie: formular.get("cuvinteCheie") || undefined,
    durataMinute: formular.get("durataMinute"),
    pretEuro: formular.get("pretEuro") || undefined,
    status: formular.get("status"),
    rezervabilOnline: formular.get("rezervabilOnline") === "on",
    cereDocumente: formular.get("cereDocumente") === "on",
    ordine: formular.get("ordine") || 0,
    operatori: formular.getAll("operatori").map(String),
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla i campi.", campuri: erori(verificat.error) };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const d = verificat.data;
  const rand = {
    category_id: d.categoryId,
    slug: d.slug,
    name: d.nume,
    short_description: d.descriereScurta ?? null,
    description: d.descriere ?? null,
    keywords: d.cuvinteCheie,
    duration_minutes: d.durataMinute,
    price_cents: d.pretEuro,
    status: d.status,
    bookable_online: d.rezervabilOnline,
    requires_documents: d.cereDocumente,
    sort_order: d.ordine,
  };

  const raspuns = d.id
    ? await sb.from("ie_services").update(rand).eq("id", d.id).select("id").single()
    : await sb.from("ie_services").insert(rand).select("id").single();

  if (raspuns.error || !raspuns.data) {
    return {
      ok: false,
      eroare:
        raspuns.error?.code === "23505"
          ? "Esiste già un servizio con questo slug."
          : "Salvataggio non riuscito.",
    };
  }

  // Legăturile cu operatorii se rescriu întregi: e mai simplu de urmărit decât
  // un calcul de diferențe și nu poate lăsa perechi orfane.
  const serviceId = raspuns.data.id;
  await sb.from("ie_operator_services").delete().eq("service_id", serviceId);
  if (d.operatori.length > 0) {
    await sb
      .from("ie_operator_services")
      .insert(d.operatori.map((operator_id) => ({ operator_id, service_id: serviceId })));
  }

  await auditeaza({
    actorId: acces.sesiune.id,
    actorEmail: acces.sesiune.email,
    actorRol: acces.sesiune.rol,
    actiune: d.id ? "UPDATE" : "CREATE",
    entitate: "service",
    entitateId: serviceId,
    rezumat: d.nume,
  });

  revalidatePath("/admin/servizi");
  revalidatePath("/servizi");
  revalidatePath("/", "layout");
  return { ok: true, mesaj: "Servizio salvato." };
}

// --- Operatori (§16) ---------------------------------------------------------

export async function salveazaOperatorul(
  _stare: StareAdmin,
  formular: FormData,
): Promise<StareAdmin> {
  const acces = await verifica("operatori.administreaza");
  if (!acces.ok) return { ok: false, eroare: acces.eroare };

  const verificat = schemaOperator.safeParse({
    id: formular.get("id") || undefined,
    numeAfisat: formular.get("numeAfisat"),
    slug: formular.get("slug"),
    titlu: formular.get("titlu") || undefined,
    email: formular.get("email") || "",
    telefon: formular.get("telefon") || "",
    culoare: formular.get("culoare") || "#00b34a",
    activ: formular.get("activ") === "on",
    servicii: formular.getAll("servicii").map(String),
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla i campi.", campuri: erori(verificat.error) };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const d = verificat.data;
  const rand = {
    display_name: d.numeAfisat,
    slug: d.slug,
    title: d.titlu ?? null,
    email: d.email ?? null,
    phone: d.telefon ?? null,
    color: d.culoare,
    is_active: d.activ,
  };

  const raspuns = d.id
    ? await sb.from("ie_operators").update(rand).eq("id", d.id).select("id").single()
    : await sb.from("ie_operators").insert(rand).select("id").single();

  if (raspuns.error || !raspuns.data) {
    return {
      ok: false,
      eroare:
        raspuns.error?.code === "23505"
          ? "Esiste già un operatore con questo slug."
          : "Salvataggio non riuscito.",
    };
  }

  const operatorId = raspuns.data.id;
  await sb.from("ie_operator_services").delete().eq("operator_id", operatorId);
  if (d.servicii.length > 0) {
    await sb
      .from("ie_operator_services")
      .insert(d.servicii.map((service_id) => ({ operator_id: operatorId, service_id })));
  }

  await auditeaza({
    actorId: acces.sesiune.id,
    actorEmail: acces.sesiune.email,
    actorRol: acces.sesiune.rol,
    actiune: d.id ? "UPDATE" : "CREATE",
    entitate: "operator",
    entitateId: operatorId,
    rezumat: d.numeAfisat,
  });

  revalidatePath("/admin/operatori");
  revalidatePath("/", "layout");
  return { ok: true, mesaj: "Operatore salvato." };
}

// --- Disponibilitate (§16, §17) ---------------------------------------------

export async function adaugaRegulaProgram(
  _stare: StareAdmin,
  formular: FormData,
): Promise<StareAdmin> {
  const acces = await verifica("disponibilitate.administreaza");
  if (!acces.ok) return { ok: false, eroare: acces.eroare };

  const verificat = schemaRegulaProgram.safeParse({
    operatorId: formular.get("operatorId"),
    ziuaSaptamanii: formular.get("ziuaSaptamanii"),
    deLa: formular.get("deLa"),
    panaLa: formular.get("panaLa"),
    tip: formular.get("tip") || "work",
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla gli orari.", campuri: erori(verificat.error) };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const d = verificat.data;
  const { error } = await sb.from("ie_availability").insert({
    operator_id: d.operatorId,
    weekday: d.ziuaSaptamanii,
    starts_at: d.deLa,
    ends_at: d.panaLa,
    kind: d.tip,
  });

  if (error) return { ok: false, eroare: "Salvataggio non riuscito." };

  await auditeaza({
    actorId: acces.sesiune.id,
    actorEmail: acces.sesiune.email,
    actorRol: acces.sesiune.rol,
    actiune: "CREATE",
    entitate: "availability",
    rezumat: `${d.deLa}–${d.panaLa}, giorno ${d.ziuaSaptamanii}`,
  });

  revalidatePath("/admin/disponibilita");
  return { ok: true, mesaj: "Orario aggiunto." };
}

export async function stergeRegulaProgram(formular: FormData) {
  await cerutAdmin();
  const id = formular.get("id");
  if (!uuid.safeParse(id).success) return;

  const sb = await clientSesiune();
  if (!sb) return;

  await sb.from("ie_availability").delete().eq("id", String(id));
  revalidatePath("/admin/disponibilita");
}

export async function adaugaExceptie(
  _stare: StareAdmin,
  formular: FormData,
): Promise<StareAdmin> {
  const acces = await verifica("disponibilitate.administreaza");
  if (!acces.ok) return { ok: false, eroare: acces.eroare };

  const operatorBrut = String(formular.get("operatorId") ?? "");
  const verificat = schemaExceptie.safeParse({
    // Câmpul gol înseamnă „tot biroul", nu un operator inexistent.
    operatorId: operatorBrut === "" ? null : operatorBrut,
    deLa: formular.get("deLa"),
    panaLa: formular.get("panaLa"),
    tip: formular.get("tip"),
    oraDeLa: formular.get("oraDeLa") || "",
    oraPanaLa: formular.get("oraPanaLa") || "",
    motiv: formular.get("motiv") || undefined,
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla le date.", campuri: erori(verificat.error) };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const d = verificat.data;
  const { error } = await sb.from("ie_availability_exceptions").insert({
    operator_id: d.operatorId,
    date_from: d.deLa,
    date_to: d.panaLa,
    kind: d.tip,
    starts_at: d.oraDeLa ?? null,
    ends_at: d.oraPanaLa ?? null,
    reason: d.motiv ?? null,
  });

  if (error) return { ok: false, eroare: "Salvataggio non riuscito." };

  await auditeaza({
    actorId: acces.sesiune.id,
    actorEmail: acces.sesiune.email,
    actorRol: acces.sesiune.rol,
    actiune: "CREATE",
    entitate: "availability_exception",
    rezumat: `${d.tip}: ${d.deLa} → ${d.panaLa}`,
  });

  revalidatePath("/admin/disponibilita");
  return { ok: true, mesaj: "Eccezione registrata." };
}

export async function stergeExceptie(formular: FormData) {
  await cerutAdmin();
  const id = formular.get("id");
  if (!uuid.safeParse(id).success) return;

  const sb = await clientSesiune();
  if (!sb) return;

  await sb.from("ie_availability_exceptions").delete().eq("id", String(id));
  revalidatePath("/admin/disponibilita");
}

// --- FAQ (§38) ---------------------------------------------------------------

export async function salveazaFaq(_stare: StareAdmin, formular: FormData): Promise<StareAdmin> {
  const acces = await verifica("faq.administreaza");
  if (!acces.ok) return { ok: false, eroare: acces.eroare };

  const verificat = schemaFaq.safeParse({
    id: formular.get("id") || undefined,
    intrebare: formular.get("intrebare"),
    raspuns: formular.get("raspuns"),
    ordine: formular.get("ordine") || 0,
    activa: formular.get("activa") === "on",
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla i campi.", campuri: erori(verificat.error) };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const d = verificat.data;
  const rand = {
    question: d.intrebare,
    answer: d.raspuns,
    sort_order: d.ordine,
    is_active: d.activa,
  };

  const { error } = d.id
    ? await sb.from("ie_faq").update(rand).eq("id", d.id)
    : await sb.from("ie_faq").insert(rand);

  if (error) return { ok: false, eroare: "Salvataggio non riuscito." };

  revalidatePath("/admin/faq");
  revalidatePath("/faq");
  return { ok: true, mesaj: "Domanda salvata." };
}

export async function stergeFaq(formular: FormData) {
  await cerutAdmin();
  const id = formular.get("id");
  if (!uuid.safeParse(id).success) return;

  const sb = await clientSesiune();
  if (!sb) return;

  await sb.from("ie_faq").delete().eq("id", String(id));
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
}

// --- Setări (§64) ------------------------------------------------------------

export async function salveazaSetarile(
  _stare: StareAdmin,
  formular: FormData,
): Promise<StareAdmin> {
  const acces = await verifica("setari.administreaza");
  if (!acces.ok) return { ok: false, eroare: acces.eroare };

  const verificat = schemaSetari.safeParse({
    numeFirma: formular.get("numeFirma"),
    slogan: formular.get("slogan") || undefined,
    telefon: formular.get("telefon"),
    telefonSecundar: formular.get("telefonSecundar") || undefined,
    whatsapp: formular.get("whatsapp") || undefined,
    email: formular.get("email"),
    adresa: formular.get("adresa"),
    fusOrar: formular.get("fusOrar") || "Europe/Rome",
    preavizMinute: formular.get("preavizMinute"),
    orizontZile: formular.get("orizontZile"),
    pasMinute: formular.get("pasMinute"),
    pragAnulareOre: formular.get("pragAnulareOre"),
    maxUploadMb: formular.get("maxUploadMb"),
    retentieLuni: formular.get("retentieLuni"),
    platiOnline: formular.get("platiOnline") === "on",
    asistentActiv: formular.get("asistentActiv") === "on",
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla i campi.", campuri: erori(verificat.error) };
  }

  const d = verificat.data;
  const r = await salveazaSetari({
    company_name: d.numeFirma,
    tagline: d.slogan ?? "",
    phone: d.telefon,
    phone_secondary: d.telefonSecundar ?? null,
    whatsapp: d.whatsapp ?? null,
    email: d.email,
    address: d.adresa,
    timezone: d.fusOrar,
    booking_lead_minutes: d.preavizMinute,
    booking_horizon_days: d.orizontZile,
    booking_granularity_minutes: d.pasMinute,
    cancel_cutoff_hours: d.pragAnulareOre,
    max_upload_mb: d.maxUploadMb,
    retention_months: d.retentieLuni,
    payments_online_enabled: d.platiOnline,
    ai_assistant_enabled: d.asistentActiv,
  });

  if (!r.ok) return { ok: false, eroare: "Salvataggio non riuscito." };

  await auditeaza({
    actorId: acces.sesiune.id,
    actorEmail: acces.sesiune.email,
    actorRol: acces.sesiune.rol,
    actiune: "UPDATE",
    entitate: "settings",
    rezumat: "Impostazioni della piattaforma aggiornate.",
  });

  revalidatePath("/", "layout");
  return { ok: true, mesaj: "Impostazioni salvate." };
}

// --- Utilizatori (§36) -------------------------------------------------------

export async function schimbaRolul(_stare: StareAdmin, formular: FormData): Promise<StareAdmin> {
  const acces = await verifica("roluri.schimba");
  if (!acces.ok) return { ok: false, eroare: acces.eroare };

  const id = formular.get("profileId");
  const rol = String(formular.get("rol") ?? "");

  if (!uuid.safeParse(id).success) return { ok: false, eroare: "Utente non valido." };
  if (!(ROLURI as readonly string[]).includes(rol)) return { ok: false, eroare: "Ruolo non valido." };

  // Nimeni nu-și schimbă propriul rol: altfel ultimul SUPER_ADMIN se poate
  // retrograda singur și lasă platforma fără nimeni care să repare asta.
  if (String(id) === acces.sesiune.id) {
    return { ok: false, eroare: "Non puoi cambiare il tuo stesso ruolo." };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { error } = await sb
    .from("ie_profiles")
    .update({ role: rol as Rol })
    .eq("id", String(id));

  if (error) return { ok: false, eroare: "Aggiornamento non riuscito." };

  await auditeaza({
    actorId: acces.sesiune.id,
    actorEmail: acces.sesiune.email,
    actorRol: acces.sesiune.rol,
    actiune: "ROLE_CHANGE",
    entitate: "profile",
    entitateId: String(id),
    rezumat: `Nuovo ruolo: ${rol}`,
  });

  revalidatePath("/admin/utenti");
  return { ok: true, mesaj: "Ruolo aggiornato." };
}

export async function comutaStatusUtilizator(
  _stare: StareAdmin,
  formular: FormData,
): Promise<StareAdmin> {
  const acces = await verifica("utilizatori.administreaza");
  if (!acces.ok) return { ok: false, eroare: acces.eroare };

  const id = formular.get("profileId");
  const status = String(formular.get("status") ?? "");

  if (!uuid.safeParse(id).success) return { ok: false, eroare: "Utente non valido." };
  if (!["active", "disabled"].includes(status)) return { ok: false, eroare: "Stato non valido." };
  if (String(id) === acces.sesiune.id) {
    return { ok: false, eroare: "Non puoi disattivare il tuo stesso account." };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { error } = await sb.from("ie_profiles").update({ status }).eq("id", String(id));
  if (error) return { ok: false, eroare: "Aggiornamento non riuscito." };

  await auditeaza({
    actorId: acces.sesiune.id,
    actorEmail: acces.sesiune.email,
    actorRol: acces.sesiune.rol,
    actiune: "UPDATE",
    entitate: "profile",
    entitateId: String(id),
    rezumat: status === "disabled" ? "Account disattivato." : "Account riattivato.",
  });

  revalidatePath("/admin/utenti");
  return { ok: true, mesaj: status === "disabled" ? "Account disattivato." : "Account riattivato." };
}
