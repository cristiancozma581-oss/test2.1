import "server-only";

import { clientSesiune, clientServiciu } from "../supabase";
import { setari } from "./setari";
import { sesiuneCurenta } from "./sesiune";
import { slotEsteLiber } from "./disponibilitate";
import { auditeaza } from "../audit";
import { trimiteNotificare } from "../notificari";
import { clientulPoateAnula, poateSchimbaProgramarea } from "../flux";
import { dataISO, oraLocala } from "../fus-orar";
import { estePersonal, poate } from "../rbac";
import type { StatusProgramare } from "../tipuri";
import type { DateRezervare } from "../validare";

/**
 * Programările (§11-§14, §19, §71).
 *
 * Regula întregului modul: fiecare funcție își verifică singură autorizarea,
 * pentru că Server Functions sunt POST-uri apelabile direct. Nu se presupune
 * nicăieri că apelantul a verificat deja ceva.
 */

export type Programare = {
  id: string;
  cod: string;
  inceput: string;
  sfarsit: string;
  status: StatusProgramare;
  note: string | null;
  serviciu: { id: string; nume: string; slug: string; durataMinute: number } | null;
  operator: { id: string; nume: string; culoare: string } | null;
  client: { id: string | null; nume: string; email: string | null; telefon: string | null };
  caseId: string | null;
};

const SELECT = `
  id, code, starts_at, ends_at, status, notes, internal_notes, case_id,
  client_id, guest_first_name, guest_last_name, guest_email, guest_phone,
  ie_services ( id, name, slug, duration_minutes ),
  ie_operators ( id, display_name, color ),
  ie_profiles ( id, full_name, email, phone )
`;

type Rand = {
  id: string;
  code: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  case_id: string | null;
  client_id: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  ie_services: { id: string; name: string; slug: string; duration_minutes: number } | null;
  ie_operators: { id: string; display_name: string; color: string } | null;
  ie_profiles: { id: string; full_name: string | null; email: string; phone: string | null } | null;
};

function laProgramare(r: Rand): Programare {
  const p = r.ie_profiles;
  return {
    id: r.id,
    cod: r.code,
    inceput: r.starts_at,
    sfarsit: r.ends_at,
    status: r.status as StatusProgramare,
    note: r.notes,
    serviciu: r.ie_services
      ? {
          id: r.ie_services.id,
          nume: r.ie_services.name,
          slug: r.ie_services.slug,
          durataMinute: r.ie_services.duration_minutes,
        }
      : null,
    operator: r.ie_operators
      ? { id: r.ie_operators.id, nume: r.ie_operators.display_name, culoare: r.ie_operators.color }
      : null,
    client: {
      id: r.client_id,
      nume:
        p?.full_name ??
        [r.guest_first_name, r.guest_last_name].filter(Boolean).join(" ") ??
        "—",
      email: p?.email ?? r.guest_email,
      telefon: p?.phone ?? r.guest_phone,
    },
    caseId: r.case_id,
  };
}

export type Rezultat<T> = { ok: true; date: T } | { ok: false; eroare: string };

/**
 * Traduce eroarea bazei într-un mesaj pentru om.
 *
 * `23P01` este violarea constrângerii EXCLUDE: doi clienți au apăsat „Conferma"
 * pentru aceeași oră, iar baza a lăsat să treacă exact unul. Al doilea nu
 * trebuie să vadă un cod de eroare Postgres, ci ce s-a întâmplat de fapt.
 */
function mesajEroare(e: { code?: string; message: string }): string {
  if (e.code === "23P01") {
    return "Questo orario è stato appena prenotato da un'altra persona. Scegli un altro orario.";
  }
  if (e.code === "23505") {
    return "Esiste già una prenotazione identica.";
  }
  return "Non è stato possibile salvare la prenotazione. Riprova tra qualche istante.";
}

// --- Creare (§71) ------------------------------------------------------------

/**
 * Creează o programare din fluxul public.
 *
 * Funcționează pentru oaspeți și pentru clienți autentificați. Pentru oaspeți
 * se folosește cheia de service, pentru că nu au `auth.uid()` — dar NU ca
 * scurtătură: slotul este reverificat înainte, iar rândul se scrie cu exact
 * datele validate, niciodată cu valori venite direct din formular.
 */
export async function creeazaProgramare(
  date: DateRezervare,
): Promise<Rezultat<{ id: string; cod: string }>> {
  const sb = clientServiciu();
  if (!sb) {
    return {
      ok: false,
      eroare: "Le prenotazioni online non sono ancora attive. Chiamaci: 333 47 59 704.",
    };
  }

  // Serviciul trebuie să fie activ ȘI rezervabil online. Fără verificarea asta,
  // un `serviceId` copiat dintr-o ciornă ar deschide o programare invizibilă.
  const { data: serviciu } = await sb
    .from("ie_services")
    .select("id, name, duration_minutes, status, bookable_online")
    .eq("id", date.serviceId)
    .maybeSingle();

  if (!serviciu || serviciu.status !== "ACTIVE" || !serviciu.bookable_online) {
    return { ok: false, eroare: "Questo servizio non è prenotabile online." };
  }

  // Operatorul trebuie să presteze chiar serviciul cerut.
  const { data: legatura } = await sb
    .from("ie_operator_services")
    .select("operator_id")
    .eq("service_id", date.serviceId)
    .eq("operator_id", date.operatorId)
    .maybeSingle();

  if (!legatura) {
    return { ok: false, eroare: "L'operatore scelto non offre questo servizio." };
  }

  const inceput = new Date(date.inceput);
  if (Number.isNaN(inceput.getTime())) {
    return { ok: false, eroare: "Orario non valido." };
  }

  const liber = await slotEsteLiber(date.operatorId, serviciu.duration_minutes, inceput);
  if (!liber) {
    return {
      ok: false,
      eroare: "Questo orario non è più disponibile. Scegli un altro orario.",
    };
  }

  const sfarsit = new Date(inceput.getTime() + serviciu.duration_minutes * 60_000);
  const sesiune = await sesiuneCurenta();

  // Un client autentificat își leagă programarea de cont. Dacă e altcineva
  // (personal care rezervă pentru un client la telefon), rămâne pe datele de
  // oaspete — altfel programarea ar ajunge în contul operatorului.
  const clientId = sesiune?.rol === "CLIENT" ? sesiune.id : null;

  const { data, error } = await sb
    .from("ie_appointments")
    .insert({
      service_id: date.serviceId,
      operator_id: date.operatorId,
      client_id: clientId,
      guest_first_name: date.nume,
      guest_last_name: date.prenume,
      guest_email: date.email,
      guest_phone: date.telefon,
      starts_at: inceput.toISOString(),
      ends_at: sfarsit.toISOString(),
      status: "PENDING",
      locale: date.limba,
      notes: date.note ?? null,
      gdpr_consent_at: new Date().toISOString(),
      source: sesiune && estePersonal(sesiune.rol) ? "admin" : "web",
      created_by: sesiune?.id ?? null,
    })
    .select("id, code")
    .single();

  if (error || !data) {
    return { ok: false, eroare: mesajEroare(error ?? { message: "" }) };
  }

  const s = await setari();
  const context = {
    cod: data.code,
    serviciu: serviciu.name,
    data: dataISO(s.fusOrar, inceput),
    ora: oraLocala(s.fusOrar, inceput),
    nume: date.nume,
  };

  await Promise.all([
    trimiteNotificare({
      eveniment: "APPOINTMENT_CREATED",
      destinatarId: clientId,
      destinatarEmail: date.email,
      context,
      entitate: { tip: "appointment", id: data.id },
    }),
    trimiteNotificare({
      eveniment: "APPOINTMENT_CREATED",
      catrePersonal: true,
      context: { ...context, telefon: date.telefon, email: date.email },
      entitate: { tip: "appointment", id: data.id },
    }),
    auditeaza({
      actorId: sesiune?.id ?? null,
      actorEmail: sesiune?.email ?? date.email,
      actorRol: sesiune?.rol ?? "GUEST",
      actiune: "BOOKING",
      entitate: "appointment",
      entitateId: data.id,
      rezumat: `${serviciu.name} — ${context.data} ${context.ora}`,
      detalii: { cod: data.code, operatorId: date.operatorId },
    }),
  ]);

  return { ok: true, date: { id: data.id, cod: data.code } };
}

// --- Citire ------------------------------------------------------------------

/** Programările clientului autentificat (§19). */
export async function programarileMele(): Promise<Programare[]> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  // RLS limitează oricum la `client_id = auth.uid()`; filtrul explicit face
  // intenția vizibilă la citirea codului și scutește o scanare inutilă.
  const { data } = await sb
    .from("ie_appointments")
    .select(SELECT)
    .eq("client_id", sesiune.id)
    .order("starts_at", { ascending: false });

  return ((data ?? []) as unknown as Rand[]).map(laProgramare);
}

/** O programare anume. Întoarce `null` dacă nu ai voie s-o vezi. */
export async function programare(id: string): Promise<Programare | null> {
  const sb = await clientSesiune();
  if (!sb) return null;

  const { data } = await sb.from("ie_appointments").select(SELECT).eq("id", id).maybeSingle();
  return data ? laProgramare(data as unknown as Rand) : null;
}

/**
 * Programările pentru calendarul personalului (§15).
 *
 * Un OPERATOR vede numai propriile ore; restul personalului vede tot. Filtrul
 * se aplică aici, pe server, nu în componenta de calendar.
 */
export async function programariInterval(
  deLa: Date,
  panaLa: Date,
  filtru: { operatorId?: string; serviceId?: string; status?: StatusProgramare } = {},
): Promise<Programare[]> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !estePersonal(sesiune.rol)) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  let q = sb
    .from("ie_appointments")
    .select(SELECT)
    .gte("starts_at", deLa.toISOString())
    .lt("starts_at", panaLa.toISOString())
    .order("starts_at");

  const doarAleLui = !poate(sesiune.rol, "calendar.vezi_tot");
  if (doarAleLui) {
    // Un operator fără fișă de operator nu are ce vedea; îi întoarcem gol în
    // loc să-i arătăm din greșeală calendarul întregului birou.
    if (!sesiune.operatorId) return [];
    q = q.eq("operator_id", sesiune.operatorId);
  } else if (filtru.operatorId) {
    q = q.eq("operator_id", filtru.operatorId);
  }

  if (filtru.serviceId) q = q.eq("service_id", filtru.serviceId);
  if (filtru.status) q = q.eq("status", filtru.status);

  const { data } = await q;
  return ((data ?? []) as unknown as Rand[]).map(laProgramare);
}

/** Căutare globală după cod, nume, e-mail sau telefon (§47). */
export async function cautaProgramari(interogare: string): Promise<Programare[]> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !estePersonal(sesiune.rol)) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const q = interogare.trim().replace(/[%_\\]/g, "\\$&");
  if (!q) return [];

  const { data } = await sb
    .from("ie_appointments")
    .select(SELECT)
    .or(
      [
        `code.ilike.%${q}%`,
        `guest_email.ilike.%${q}%`,
        `guest_phone.ilike.%${q}%`,
        `guest_first_name.ilike.%${q}%`,
        `guest_last_name.ilike.%${q}%`,
      ].join(","),
    )
    .order("starts_at", { ascending: false })
    .limit(50);

  return ((data ?? []) as unknown as Rand[]).map(laProgramare);
}

// --- Schimbări de status -----------------------------------------------------

/**
 * Anularea de către client (§19, §78).
 *
 * Verifică proprietatea, apoi pragul de timp. Slotul se eliberează automat:
 * `CANCELLED` iese din predicatul constrângerii EXCLUDE și din filtrul
 * motorului de sloturi, deci ora redevine disponibilă fără niciun cod în plus.
 */
export async function anuleazaCaClient(
  appointmentId: string,
  motiv?: string,
): Promise<Rezultat<null>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return { ok: false, eroare: "Sessione scaduta. Accedi di nuovo." };

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { data: p } = await sb
    .from("ie_appointments")
    .select("id, code, status, starts_at, client_id, service_id, ie_services ( name )")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!p) return { ok: false, eroare: "Prenotazione non trovata." };

  // Verificarea de proprietate este explicită, nu lăsată doar în seama RLS:
  // dacă mâine o politică se lărgește, refuzul de aici rămâne în picioare.
  if (p.client_id !== sesiune.id) {
    await auditeaza({
      actorId: sesiune.id,
      actorEmail: sesiune.email,
      actorRol: sesiune.rol,
      actiune: "ACCESS_DENIED",
      entitate: "appointment",
      entitateId: appointmentId,
      rezumat: "Tentativo di annullare una prenotazione altrui.",
    });
    return { ok: false, eroare: "Prenotazione non trovata." };
  }

  const s = await setari();
  const verdict = clientulPoateAnula(
    p.status as StatusProgramare,
    new Date(p.starts_at),
    new Date(),
    s.pragAnulareOre,
  );
  if (!verdict.permis) return { ok: false, eroare: verdict.motiv ?? "Operazione non consentita." };

  const { error } = await sb
    .from("ie_appointments")
    .update({ status: "CANCELLED", cancel_reason: motiv ?? null })
    .eq("id", appointmentId);

  if (error) return { ok: false, eroare: "Non è stato possibile annullare. Riprova." };

  const serviciu = Array.isArray(p.ie_services) ? p.ie_services[0] : p.ie_services;
  const context = {
    cod: p.code,
    serviciu: serviciu?.name ?? "",
    data: dataISO(s.fusOrar, new Date(p.starts_at)),
    ora: oraLocala(s.fusOrar, new Date(p.starts_at)),
    nume: sesiune.numeComplet ?? sesiune.email,
  };

  await Promise.all([
    trimiteNotificare({
      eveniment: "APPOINTMENT_CANCELLED",
      destinatarId: sesiune.id,
      destinatarEmail: sesiune.email,
      context,
      entitate: { tip: "appointment", id: appointmentId },
    }),
    trimiteNotificare({
      eveniment: "APPOINTMENT_CANCELLED",
      catrePersonal: true,
      context,
      entitate: { tip: "appointment", id: appointmentId },
    }),
    auditeaza({
      actorId: sesiune.id,
      actorEmail: sesiune.email,
      actorRol: sesiune.rol,
      actiune: "CANCEL",
      entitate: "appointment",
      entitateId: appointmentId,
      rezumat: `Annullata dal cliente — ${p.code}`,
    }),
  ]);

  return { ok: true, date: null };
}

/** Schimbarea statusului de către personal (§15, §72). */
export async function schimbaStatus(
  appointmentId: string,
  nou: StatusProgramare,
  motiv?: string,
): Promise<Rezultat<null>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !estePersonal(sesiune.rol)) {
    return { ok: false, eroare: "Non hai i permessi per questa operazione." };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { data: p } = await sb
    .from("ie_appointments")
    .select(
      "id, code, status, starts_at, client_id, guest_email, operator_id, ie_services ( name )",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (!p) return { ok: false, eroare: "Prenotazione non trovata." };

  // Un operator nu are voie să umble la programările colegului.
  if (
    !poate(sesiune.rol, "calendar.vezi_tot") &&
    sesiune.operatorId &&
    p.operator_id !== sesiune.operatorId
  ) {
    return { ok: false, eroare: "Questa prenotazione è di un altro operatore." };
  }

  const din = p.status as StatusProgramare;
  if (!poateSchimbaProgramarea(din, nou, sesiune.rol)) {
    return {
      ok: false,
      eroare: `Non è possibile passare da «${din}» a «${nou}».`,
    };
  }

  const { error } = await sb
    .from("ie_appointments")
    .update({ status: nou, cancel_reason: motiv ?? null })
    .eq("id", appointmentId);

  if (error) return { ok: false, eroare: "Aggiornamento non riuscito. Riprova." };

  const s = await setari();
  const serviciu = Array.isArray(p.ie_services) ? p.ie_services[0] : p.ie_services;
  const eveniment =
    nou === "CONFIRMED"
      ? "APPOINTMENT_CONFIRMED"
      : nou === "CANCELLED"
        ? "APPOINTMENT_CANCELLED"
        : nou === "COMPLETED"
          ? "APPOINTMENT_COMPLETED"
          : null;

  if (eveniment) {
    await trimiteNotificare({
      eveniment,
      destinatarId: p.client_id,
      destinatarEmail: p.guest_email,
      context: {
        cod: p.code,
        serviciu: serviciu?.name ?? "",
        data: dataISO(s.fusOrar, new Date(p.starts_at)),
        ora: oraLocala(s.fusOrar, new Date(p.starts_at)),
      },
      entitate: { tip: "appointment", id: appointmentId },
    });
  }

  await auditeaza({
    actorId: sesiune.id,
    actorEmail: sesiune.email,
    actorRol: sesiune.rol,
    actiune: "STATUS_CHANGE",
    entitate: "appointment",
    entitateId: appointmentId,
    rezumat: `${din} → ${nou} (${p.code})`,
    detalii: { motiv },
  });

  return { ok: true, date: null };
}

/** Reprogramarea (§15, §19). */
export async function reprogrameaza(
  appointmentId: string,
  inceputNou: Date,
  operatorNou?: string,
): Promise<Rezultat<null>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !estePersonal(sesiune.rol)) {
    return { ok: false, eroare: "Non hai i permessi per questa operazione." };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { data: p } = await sb
    .from("ie_appointments")
    .select(
      "id, code, status, starts_at, ends_at, operator_id, client_id, guest_email, ie_services ( name, duration_minutes )",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (!p) return { ok: false, eroare: "Prenotazione non trovata." };

  const serviciu = Array.isArray(p.ie_services) ? p.ie_services[0] : p.ie_services;
  if (!serviciu) return { ok: false, eroare: "Servizio non trovato." };

  const operatorId = operatorNou ?? p.operator_id;

  // Slotul se verifică EXCLUZÂND programarea curentă: altfel ea s-ar găsi pe
  // sine ca ocupantă și orice mutare de câteva minute ar părea imposibilă.
  const { sloturiPentru } = await import("./disponibilitate");
  const s = await setari();
  const zi = dataISO(s.fusOrar, inceputNou);
  const zile = await sloturiPentru(operatorId, serviciu.duration_minutes, zi, 1, {
    exclude: { starts_at: p.starts_at, ends_at: p.ends_at },
  });

  const potrivit = zile[0]?.sloturi.some(
    (x) => x.inceput.getTime() === inceputNou.getTime(),
  );
  if (!potrivit) {
    return { ok: false, eroare: "Il nuovo orario non è disponibile." };
  }

  const sfarsit = new Date(inceputNou.getTime() + serviciu.duration_minutes * 60_000);
  const { error } = await sb
    .from("ie_appointments")
    .update({
      starts_at: inceputNou.toISOString(),
      ends_at: sfarsit.toISOString(),
      operator_id: operatorId,
      status: "RESCHEDULED",
    })
    .eq("id", appointmentId);

  if (error) return { ok: false, eroare: mesajEroare(error) };

  await Promise.all([
    trimiteNotificare({
      eveniment: "APPOINTMENT_RESCHEDULED",
      destinatarId: p.client_id,
      destinatarEmail: p.guest_email,
      context: {
        cod: p.code,
        serviciu: serviciu.name,
        data: dataISO(s.fusOrar, inceputNou),
        ora: oraLocala(s.fusOrar, inceputNou),
      },
      entitate: { tip: "appointment", id: appointmentId },
    }),
    auditeaza({
      actorId: sesiune.id,
      actorEmail: sesiune.email,
      actorRol: sesiune.rol,
      actiune: "RESCHEDULE",
      entitate: "appointment",
      entitateId: appointmentId,
      rezumat: `${p.code}: ${p.starts_at} → ${inceputNou.toISOString()}`,
    }),
  ]);

  return { ok: true, date: null };
}

/**
 * Leagă la un cont nou programările făcute anterior ca oaspete (§12).
 *
 * Se apelează după înregistrare. Potrivirea se face pe e-mail, deci se rulează
 * numai pentru un cont a cărui adresă a fost confirmată de Auth.
 */
export async function leagaProgramariDeCont(profileId: string, email: string) {
  const sb = clientServiciu();
  if (!sb) return 0;

  /*
   * `_` și `%` sunt jokeri pentru `ilike`, iar `_` chiar apare în adrese.
   *
   * Fără escapare, „maria_rossi@x.it" s-ar potrivi și cu „mariaXrossi@x.it",
   * adică programările unui străin ar ajunge în contul altcuiva.
   */
  const sigur = email.replace(/[%_\\]/g, "\\$&");

  const { data } = await sb
    .from("ie_appointments")
    .update({ client_id: profileId })
    .is("client_id", null)
    .ilike("guest_email", sigur)
    .select("id");

  return data?.length ?? 0;
}
