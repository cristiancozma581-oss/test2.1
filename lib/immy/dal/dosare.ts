import "server-only";

import { clientSesiune } from "../supabase";
import { sesiuneCurenta } from "./sesiune";
import { auditeaza } from "../audit";
import { trimiteNotificare } from "../notificari";
import { poateSchimbaDosarul } from "../flux";
import { ETICHETE_DOSAR, type StatusDosar } from "../tipuri";
import { estePersonal, poate, poateVedeaDosarul } from "../rbac";
import type { Rezultat } from "./programari";

/**
 * Dosarele (§20-§21, §72).
 *
 * Dosarul este firul care leagă clientul, serviciul, documentele, mesajele și
 * programările (§79). Accesul se decide pe două niveluri: RLS taie la nivel de
 * rând, iar funcțiile de aici mai adaugă regula pe care RLS nu o poate exprima
 * simplu — un OPERATOR vede numai dosarele lui, nu pe ale colegilor.
 */

export type Dosar = {
  id: string;
  referinta: string;
  titlu: string;
  status: StatusDosar;
  statusEticheta: string;
  prioritate: string;
  termen: string | null;
  note: string | null;
  creatLa: string;
  client: { id: string; nume: string | null; email: string; telefon: string | null } | null;
  serviciu: { id: string; nume: string; slug: string } | null;
  operator: { id: string; nume: string; culoare: string } | null;
  numarDocumente?: number;
  documenteDeVerificat?: number;
};

const SELECT = `
  id, reference, title, status, priority, deadline, notes, created_at,
  ie_profiles ( id, full_name, email, phone ),
  ie_services ( id, name, slug ),
  ie_operators ( id, display_name, color )
`;

type Rand = {
  id: string;
  reference: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  notes: string | null;
  created_at: string;
  ie_profiles: { id: string; full_name: string | null; email: string; phone: string | null } | null;
  ie_services: { id: string; name: string; slug: string } | null;
  ie_operators: { id: string; display_name: string; color: string } | null;
};

function laDosar(r: Rand): Dosar {
  return {
    id: r.id,
    referinta: r.reference,
    titlu: r.title,
    status: r.status as StatusDosar,
    statusEticheta: ETICHETE_DOSAR[r.status as StatusDosar] ?? r.status,
    prioritate: r.priority,
    termen: r.deadline,
    note: r.notes,
    creatLa: r.created_at,
    client: r.ie_profiles
      ? {
          id: r.ie_profiles.id,
          nume: r.ie_profiles.full_name,
          email: r.ie_profiles.email,
          telefon: r.ie_profiles.phone,
        }
      : null,
    serviciu: r.ie_services
      ? { id: r.ie_services.id, nume: r.ie_services.name, slug: r.ie_services.slug }
      : null,
    operator: r.ie_operators
      ? { id: r.ie_operators.id, nume: r.ie_operators.display_name, culoare: r.ie_operators.color }
      : null,
  };
}

/** Dosarele clientului autentificat. */
export async function dosareleMele(): Promise<Dosar[]> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_cases")
    .select(SELECT)
    .eq("client_id", sesiune.id)
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as Rand[]).map(laDosar);
}

/**
 * Un dosar, cu tot ce ține de el.
 *
 * Întoarce `null` și pentru „nu există", și pentru „nu ai voie": diferența
 * dintre cele două ar spune unui străin că dosarul există, ceea ce e deja o
 * informație.
 */
export async function dosar(id: string) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return null;

  const sb = await clientSesiune();
  if (!sb) return null;

  const { data } = await sb
    .from("ie_cases")
    .select(
      `${SELECT}, client_id, operator_id,
       ie_documents ( id, label, status, current_version, review_note, updated_at ),
       ie_case_status_history ( id, from_status, to_status, created_at ),
       ie_appointments ( id, code, starts_at, status )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const r = data as unknown as Rand & {
    client_id: string;
    operator_id: string | null;
    ie_documents: {
      id: string; label: string; status: string;
      current_version: number; review_note: string | null; updated_at: string;
    }[];
    ie_case_status_history: {
      id: string; from_status: string | null; to_status: string; created_at: string;
    }[];
    ie_appointments: { id: string; code: string; starts_at: string; status: string }[];
  };

  /*
   * Cine are voie să vadă dosarul.
   *
   * Verificarea se face pe PERMISIUNI, nu pe numele rolului. O gardă scrisă
   * „dacă e OPERATOR…" lasă să treacă orice alt rol de personal — accoglienza,
   * de pildă, care nu are nicio permisiune pe dosare, dar pe care RLS o lasă să
   * citească rândul ca membru al personalului. Legătura din interfață îi
   * lipsește, însă adresa directă `/operatore/pratiche/<id>` mergea.
   *
   * Trei trepte, în ordine:
   *   1. clientul își vede propriul dosar;
   *   2. cine vede tot (administratorii) îl vede;
   *   3. cine vede doar ce e al lui (operatorii) îl vede numai dacă îi este
   *      atribuit;
   *   4. restul — refuz, cu urmă în jurnal.
   */
  const areVoie = poateVedeaDosarul(
    { rol: sesiune.rol, id: sesiune.id, operatorId: sesiune.operatorId },
    { clientId: r.client_id, operatorId: r.operator_id },
  );

  if (!areVoie) {
    const vedePropriu = poate(sesiune.rol, "dosare.vezi_propriu");
    await auditeaza({
      actorId: sesiune.id,
      actorEmail: sesiune.email,
      actorRol: sesiune.rol,
      actiune: "ACCESS_DENIED",
      entitate: "case",
      entitateId: id,
      rezumat: vedePropriu
        ? "Accesso a una pratica assegnata a un altro operatore."
        : "Accesso a una pratica senza permessi sulle pratiche.",
    });
    return null;
  }

  return {
    ...laDosar(r),
    documente: (r.ie_documents ?? []).map((d) => ({
      id: d.id,
      eticheta: d.label,
      status: d.status,
      versiune: d.current_version,
      observatie: d.review_note,
      actualizatLa: d.updated_at,
    })),
    istoric: (r.ie_case_status_history ?? []).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    ),
    programari: (r.ie_appointments ?? []).sort((a, b) =>
      b.starts_at.localeCompare(a.starts_at),
    ),
  };
}

/** Dosarele din spațiul de lucru al personalului. */
export async function dosarePersonal(filtru: { status?: StatusDosar; operatorId?: string } = {}) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !estePersonal(sesiune.rol)) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const vedeTot = poate(sesiune.rol, "dosare.vezi_tot");
  const vedePropriu = poate(sesiune.rol, "dosare.vezi_propriu");

  // Fără nicio permisiune pe dosare, lista este goală prin decizie, nu pentru
  // că se nimerește ca rolul să n-aibă fișă de operator.
  if (!vedeTot && !vedePropriu) return [];

  let q = sb.from("ie_cases").select(SELECT).order("created_at", { ascending: false });

  if (!vedeTot) {
    if (!sesiune.operatorId) return [];
    q = q.eq("operator_id", sesiune.operatorId);
  } else if (filtru.operatorId) {
    q = q.eq("operator_id", filtru.operatorId);
  }
  if (filtru.status) q = q.eq("status", filtru.status);

  const { data } = await q;
  return ((data ?? []) as unknown as Rand[]).map(laDosar);
}

/** Deschide un dosar (§72). */
export async function creeazaDosar(valori: {
  clientId: string;
  serviceId: string;
  operatorId?: string | null;
  titlu: string;
  termen?: string;
  prioritate?: string;
  note?: string;
  appointmentId?: string;
}): Promise<Rezultat<{ id: string; referinta: string }>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "dosare.creeaza")) {
    return { ok: false, eroare: "Non hai i permessi per creare una pratica." };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { data, error } = await sb
    .from("ie_cases")
    .insert({
      client_id: valori.clientId,
      service_id: valori.serviceId,
      // Un operator care deschide un dosar și-l atribuie sieși implicit;
      // altfel dosarul ar rămâne fără stăpân până când observă cineva.
      operator_id: valori.operatorId ?? sesiune.operatorId ?? null,
      title: valori.titlu,
      deadline: valori.termen || null,
      priority: valori.prioritate ?? "normal",
      notes: valori.note ?? null,
      status: "NEW",
    })
    .select("id, reference")
    .single();

  if (error || !data) {
    return { ok: false, eroare: "Non è stato possibile creare la pratica." };
  }

  if (valori.appointmentId) {
    await sb.from("ie_appointments").update({ case_id: data.id }).eq("id", valori.appointmentId);
  }

  await auditeaza({
    actorId: sesiune.id,
    actorEmail: sesiune.email,
    actorRol: sesiune.rol,
    actiune: "CREATE",
    entitate: "case",
    entitateId: data.id,
    rezumat: `${data.reference} — ${valori.titlu}`,
  });

  return { ok: true, date: { id: data.id, referinta: data.reference } };
}

/** Schimbă statusul unui dosar și anunță clientul (§72, §78). */
export async function schimbaStatusDosar(
  caseId: string,
  nou: StatusDosar,
  nota?: string,
): Promise<Rezultat<null>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "dosare.modifica")) {
    return { ok: false, eroare: "Non hai i permessi per questa operazione." };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { data: d } = await sb
    .from("ie_cases")
    .select("id, reference, title, status, client_id, operator_id")
    .eq("id", caseId)
    .maybeSingle();

  if (!d) return { ok: false, eroare: "Pratica non trovata." };

  if (
    sesiune.rol === "OPERATOR" &&
    !poate(sesiune.rol, "dosare.vezi_tot") &&
    d.operator_id !== sesiune.operatorId
  ) {
    return { ok: false, eroare: "Questa pratica è assegnata a un altro operatore." };
  }

  const din = d.status as StatusDosar;
  if (!poateSchimbaDosarul(din, nou, sesiune.rol)) {
    return {
      ok: false,
      eroare: `Non è possibile passare da «${ETICHETE_DOSAR[din]}» a «${ETICHETE_DOSAR[nou]}».`,
    };
  }

  const { error } = await sb
    .from("ie_cases")
    .update({
      status: nou,
      closed_at: ["COMPLETED", "CLOSED", "CANCELLED"].includes(nou)
        ? new Date().toISOString()
        : null,
    })
    .eq("id", caseId);

  if (error) return { ok: false, eroare: "Aggiornamento non riuscito." };

  /*
   * Nota însoțește TRANZIȚIA, nu dosarul.
   *
   * Triggerul din 0014 a scris deja rândul de istoric; îi adăugăm explicația.
   * Nota nu are ce căuta în `ie_cases.notes`, care este descrierea dosarului:
   * scrisă acolo, fiecare schimbare de status ar suprascrie observațiile
   * anterioare ale operatorului.
   */
  if (nota) {
    const { data: ultima } = await sb
      .from("ie_case_status_history")
      .select("id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultima) {
      await sb.from("ie_case_status_history").update({ note: nota }).eq("id", ultima.id);
    }
  }

  await Promise.all([
    trimiteNotificare({
      eveniment: "CASE_STATUS_CHANGED",
      destinatarId: d.client_id,
      context: { dosar: d.title, status: ETICHETE_DOSAR[nou], referinta: d.reference },
      entitate: { tip: "case", id: caseId },
    }),
    auditeaza({
      actorId: sesiune.id,
      actorEmail: sesiune.email,
      actorRol: sesiune.rol,
      actiune: "STATUS_CHANGE",
      entitate: "case",
      entitateId: caseId,
      rezumat: `${d.reference}: ${din} → ${nou}`,
      detalii: { nota },
    }),
  ]);

  return { ok: true, date: null };
}
