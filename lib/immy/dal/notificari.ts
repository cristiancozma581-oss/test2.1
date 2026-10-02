import "server-only";

import { clientSesiune } from "../supabase";
import { sesiuneCurenta } from "./sesiune";
import { estePersonal } from "../rbac";

/**
 * Citirea notificărilor (§65, §66).
 *
 * Scrierea trăiește în `lib/immy/notificari.ts`, cu cheia de service. Aici se
 * citește sub RLS, deci fiecare vede exact ce îi este destinat: clientul
 * notificările lui, personalul pe cele ale biroului.
 *
 * Notificările de personal (`audience = 'staff'`) sunt PARTAJATE, nu
 * individuale: sunt avertizările biroului, iar cine le-a citit le-a citit
 * pentru toți. Într-un birou de doi-trei oameni asta e comportamentul dorit —
 * altfel aceeași programare nouă ar cere trei confirmări. Dacă echipa crește
 * și fiecare își vrea propria listă, aici se adaugă un tabel de citiri per
 * utilizator, fără să se schimbe scrierea.
 */

export type Notificare = {
  id: string;
  titlu: string;
  corp: string;
  link: string | null;
  severitate: "info" | "success" | "warning" | "urgent";
  eveniment: string;
  citita: boolean;
  creatLa: string;
};

export async function notificarileMele(limita = 50): Promise<Notificare[]> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  let q = sb
    .from("ie_notifications")
    .select("id, title, body, link, severity, event, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limita);

  q = estePersonal(sesiune.rol)
    ? q.eq("audience", "staff")
    : q.eq("audience", "client").eq("recipient_id", sesiune.id);

  const { data } = await q;

  return (data ?? []).map((n) => ({
    id: n.id,
    titlu: n.title,
    corp: n.body,
    link: n.link,
    severitate: n.severity as Notificare["severitate"],
    eveniment: n.event,
    citita: Boolean(n.read_at),
    creatLa: n.created_at,
  }));
}

export async function numarNecitite(): Promise<number> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return 0;

  const sb = await clientSesiune();
  if (!sb) return 0;

  let q = sb
    .from("ie_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  q = estePersonal(sesiune.rol)
    ? q.eq("audience", "staff")
    : q.eq("audience", "client").eq("recipient_id", sesiune.id);

  const { count } = await q;
  return count ?? 0;
}

/** Marchează una sau toate notificările ca citite. */
export async function marcheazaCitite(id?: string): Promise<void> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return;

  const sb = await clientSesiune();
  if (!sb) return;

  // RLS limitează oricum `update` la ce îi aparține utilizatorului; filtrele de
  // aici doar restrâng rândurile atinse.
  let q = sb
    .from("ie_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (id) q = q.eq("id", id);
  else if (estePersonal(sesiune.rol)) q = q.eq("audience", "staff");
  else q = q.eq("recipient_id", sesiune.id);

  await q;
}
