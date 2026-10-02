import "server-only";

import { clientSesiune } from "../supabase";
import { sesiuneCurenta } from "./sesiune";
import { auditeaza } from "../audit";
import { trimiteNotificare } from "../notificari";
import { estePersonal, poate } from "../rbac";
import type { Rezultat } from "./programari";

/**
 * Mesageria internă (§26).
 *
 * Firul aparține clientului și, opțional, unui dosar. Personalul răspunde în
 * firele clienților; un client nu poate scrie într-un fir care nu e al lui, iar
 * rolul expeditorului se stabilește pe server, din sesiune — niciodată din ce
 * trimite formularul.
 */

export type Fir = {
  id: string;
  subiect: string;
  caseId: string | null;
  dosar: string | null;
  inchis: boolean;
  ultimulMesaj: string;
  client: { id: string; nume: string | null; email: string } | null;
  necitite: number;
};

export type Mesaj = {
  id: string;
  corp: string;
  expeditorRol: "CLIENT" | "OPERATOR" | "ADMIN" | "SYSTEM";
  expeditorNume: string | null;
  citit: boolean;
  creatLa: string;
};

const SELECT_FIR = `
  id, subject, case_id, is_closed, last_message_at, client_id, operator_id,
  ie_cases ( id, title, operator_id ),
  ie_profiles ( id, full_name, email )
`;

type RandFir = {
  id: string;
  subject: string;
  case_id: string | null;
  is_closed: boolean;
  last_message_at: string;
  client_id: string;
  operator_id: string | null;
  ie_cases: { id: string; title: string; operator_id: string | null } | null;
  ie_profiles: { id: string; full_name: string | null; email: string } | null;
};

function laFir(r: RandFir, necitite = 0): Fir {
  return {
    id: r.id,
    subiect: r.subject,
    caseId: r.case_id,
    dosar: r.ie_cases?.title ?? null,
    inchis: r.is_closed,
    ultimulMesaj: r.last_message_at,
    client: r.ie_profiles
      ? { id: r.ie_profiles.id, nume: r.ie_profiles.full_name, email: r.ie_profiles.email }
      : null,
    necitite,
  };
}

/** Firele clientului autentificat. */
export async function firurileMele(): Promise<Fir[]> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_threads")
    .select(SELECT_FIR)
    .eq("client_id", sesiune.id)
    .order("last_message_at", { ascending: false });

  return ((data ?? []) as unknown as RandFir[]).map((r) => laFir(r));
}

/** Firele din inbox-ul personalului. */
export async function firuriPersonal(): Promise<Fir[]> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "mesaje.raspunde")) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_threads")
    .select(SELECT_FIR)
    .order("last_message_at", { ascending: false })
    .limit(200);

  const toate = (data ?? []) as unknown as RandFir[];

  // Operatorul vede firele dosarelor lui plus cele care i-au fost atribuite
  // direct; altfel ar citi corespondența colegului.
  const vizibile =
    poate(sesiune.rol, "dosare.vezi_tot") || !sesiune.operatorId
      ? toate
      : toate.filter(
          (r) =>
            r.operator_id === sesiune.operatorId ||
            r.ie_cases?.operator_id === sesiune.operatorId,
        );

  return vizibile.map((r) => laFir(r));
}

/** Un fir cu mesajele lui. Marchează ca citite mesajele celuilalt. */
export async function fir(threadId: string) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return null;

  const sb = await clientSesiune();
  if (!sb) return null;

  const { data } = await sb.from("ie_threads").select(SELECT_FIR).eq("id", threadId).maybeSingle();
  if (!data) return null;

  const r = data as unknown as RandFir;

  const alMeu = r.client_id === sesiune.id;
  const potCaPersonal =
    estePersonal(sesiune.rol) &&
    poate(sesiune.rol, "mesaje.raspunde") &&
    (poate(sesiune.rol, "dosare.vezi_tot") ||
      !sesiune.operatorId ||
      r.operator_id === sesiune.operatorId ||
      r.ie_cases?.operator_id === sesiune.operatorId);

  if (!alMeu && !potCaPersonal) {
    await auditeaza({
      actorId: sesiune.id,
      actorEmail: sesiune.email,
      actorRol: sesiune.rol,
      actiune: "ACCESS_DENIED",
      entitate: "thread",
      entitateId: threadId,
      rezumat: "Accesso a una conversazione non propria.",
    });
    return null;
  }

  const { data: mesaje } = await sb
    .from("ie_messages")
    .select("id, body, sender_role, sender_id, read_at, created_at, ie_profiles ( full_name )")
    .eq("thread_id", threadId)
    .order("created_at");

  type RandMesaj = {
    id: string;
    body: string;
    sender_role: string;
    sender_id: string | null;
    read_at: string | null;
    created_at: string;
    ie_profiles: { full_name: string | null } | null;
  };

  const lista = ((mesaje ?? []) as unknown as RandMesaj[]).map<Mesaj>((m) => ({
    id: m.id,
    corp: m.body,
    expeditorRol: m.sender_role as Mesaj["expeditorRol"],
    expeditorNume: m.ie_profiles?.full_name ?? null,
    citit: Boolean(m.read_at),
    creatLa: m.created_at,
  }));

  // Marcăm citite doar mesajele CELUILALT: propriile mesaje nu au ce citi.
  const rolulMeu = alMeu ? "CLIENT" : "OPERATOR";
  const deMarcat = ((mesaje ?? []) as unknown as RandMesaj[])
    .filter((m) => !m.read_at && m.sender_role !== rolulMeu)
    .map((m) => m.id);

  if (deMarcat.length > 0) {
    await sb
      .from("ie_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", deMarcat);
  }

  return { ...laFir(r), mesaje: lista };
}

/** Deschide un fir nou (client sau personal). */
export async function deschideFir(valori: {
  subiect: string;
  corp: string;
  caseId?: string;
  clientId?: string;
}): Promise<Rezultat<{ id: string }>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return { ok: false, eroare: "Sessione scaduta. Accedi di nuovo." };

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const esteClient = sesiune.rol === "CLIENT";
  // Un client deschide firul numai pentru el; personalul îl deschide pentru
  // clientul indicat. Fără despărțirea asta, un client ar putea deschide un fir
  // în numele altcuiva trimițând un `clientId` străin.
  const clientId = esteClient ? sesiune.id : valori.clientId;
  if (!clientId) return { ok: false, eroare: "Cliente non indicato." };

  if (!esteClient && !poate(sesiune.rol, "mesaje.raspunde")) {
    return { ok: false, eroare: "Non hai i permessi per questa operazione." };
  }

  const { data: firNou, error } = await sb
    .from("ie_threads")
    .insert({
      client_id: clientId,
      case_id: valori.caseId ?? null,
      operator_id: sesiune.operatorId ?? null,
      subject: valori.subiect,
    })
    .select("id")
    .single();

  if (error || !firNou) return { ok: false, eroare: "Non è stato possibile aprire la conversazione." };

  const rezultat = await trimiteMesaj(firNou.id, valori.corp);
  if (!rezultat.ok) return rezultat;

  return { ok: true, date: { id: firNou.id } };
}

/** Trimite un mesaj într-un fir existent. */
export async function trimiteMesaj(threadId: string, corp: string): Promise<Rezultat<null>> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return { ok: false, eroare: "Sessione scaduta. Accedi di nuovo." };

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { data } = await sb
    .from("ie_threads")
    .select("id, subject, client_id, operator_id, is_closed, ie_cases ( operator_id )")
    .eq("id", threadId)
    .maybeSingle();

  if (!data) return { ok: false, eroare: "Conversazione non trovata." };
  if (data.is_closed) return { ok: false, eroare: "Questa conversazione è chiusa." };

  const dosar = Array.isArray(data.ie_cases) ? data.ie_cases[0] : data.ie_cases;
  const alMeu = data.client_id === sesiune.id;
  const potCaPersonal =
    estePersonal(sesiune.rol) &&
    poate(sesiune.rol, "mesaje.raspunde") &&
    (poate(sesiune.rol, "dosare.vezi_tot") ||
      !sesiune.operatorId ||
      data.operator_id === sesiune.operatorId ||
      dosar?.operator_id === sesiune.operatorId);

  if (!alMeu && !potCaPersonal) {
    return { ok: false, eroare: "Conversazione non trovata." };
  }

  // Rolul expeditorului vine din sesiune, nu din formular: altfel un client ar
  // putea semna un mesaj ca „OPERATOR".
  const rolExpeditor = alMeu
    ? "CLIENT"
    : sesiune.rol === "OPERATOR" || sesiune.rol === "RECEPTIONIST"
      ? "OPERATOR"
      : "ADMIN";

  const { error } = await sb.from("ie_messages").insert({
    thread_id: threadId,
    sender_id: sesiune.id,
    sender_role: rolExpeditor,
    body: corp,
  });

  if (error) return { ok: false, eroare: "Il messaggio non è stato inviato. Riprova." };

  const fragment = corp.length > 140 ? `${corp.slice(0, 140)}…` : corp;

  if (rolExpeditor === "CLIENT") {
    await trimiteNotificare({
      eveniment: "MESSAGE_RECEIVED",
      catrePersonal: true,
      context: { expeditor: sesiune.numeComplet ?? sesiune.email, fragment },
      entitate: { tip: "thread", id: threadId },
    });
  } else {
    await trimiteNotificare({
      eveniment: "MESSAGE_RECEIVED",
      destinatarId: data.client_id,
      context: { expeditor: sesiune.numeComplet ?? "IMMY & EMY", fragment },
      entitate: { tip: "thread", id: threadId },
    });
  }

  return { ok: true, date: null };
}

/** Câte mesaje necitite are utilizatorul curent — pentru bulina din meniu. */
export async function mesajeNecitite(): Promise<number> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return 0;

  const sb = await clientSesiune();
  if (!sb) return 0;

  const rolulMeu = sesiune.rol === "CLIENT" ? "CLIENT" : "OPERATOR";
  const { count } = await sb
    .from("ie_messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .neq("sender_role", rolulMeu);

  return count ?? 0;
}
