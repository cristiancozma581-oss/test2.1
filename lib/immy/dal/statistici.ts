import "server-only";

import { clientSesiune } from "../supabase";
import { sesiuneCurenta } from "./sesiune";
import { setari } from "./setari";
import { adaugaZile, dataISO, momentDinZiSiMinut } from "../fus-orar";
import { estePersonal, poate } from "../rbac";

/**
 * Indicatorii pentru tabloul de bord și rapoarte (§33, §41, §42).
 *
 * Numărătorile se fac în bază, cu `head: true` și `count: "exact"`: aducerea
 * rândurilor doar ca să le numeri în JavaScript devine costisitoare exact când
 * biroul are destui clienți încât cifra să conteze.
 */

export type Kpi = {
  programariAzi: number;
  programariMaine: number;
  inAsteptare: number;
  dosareActive: number;
  documenteDeVerificat: number;
  clientiNoi: number;
  mesajeNecitite: number;
  anulariLunaAceasta: number;
  neprezentariLunaAceasta: number;
};

async function interval(zi: string, zile = 1) {
  const s = await setari();
  return {
    de: momentDinZiSiMinut(s.fusOrar, zi, 0).toISOString(),
    pana: momentDinZiSiMinut(s.fusOrar, adaugaZile(zi, zile), 0).toISOString(),
  };
}

export async function kpi(): Promise<Kpi | null> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !estePersonal(sesiune.rol)) return null;

  const sb = await clientSesiune();
  if (!sb) return null;

  const s = await setari();
  const azi = dataISO(s.fusOrar, new Date());
  const maine = adaugaZile(azi, 1);
  const inceputLuna = `${azi.slice(0, 7)}-01`;

  const iAzi = await interval(azi);
  const iMaine = await interval(maine);
  const iLuna = await interval(inceputLuna, 31);

  /*
   * Un operator vede numărătorile lui, nu ale biroului.
   *
   * Filtrul se aplică la construirea interogării, nu printr-un ajutor generic:
   * constructorul de interogări Supabase își poartă tipul rândului prin fiecare
   * apel, iar un ajutor generic peste el face TypeScript să se învârtă în gol.
   */
  const opId =
    !poate(sesiune.rol, "calendar.vezi_tot") && sesiune.operatorId
      ? sesiune.operatorId
      : null;

  const programari = () => {
    const q = sb.from("ie_appointments").select("id", { count: "exact", head: true });
    return opId ? q.eq("operator_id", opId) : q;
  };
  const dosare = () => {
    const q = sb.from("ie_cases").select("id", { count: "exact", head: true });
    return opId ? q.eq("operator_id", opId) : q;
  };
  const numar = (tabel: "ie_documents" | "ie_profiles" | "ie_messages") =>
    sb.from(tabel).select("id", { count: "exact", head: true });

  const [
    programariAzi,
    programariMaine,
    inAsteptare,
    dosareActive,
    documente,
    clientiNoi,
    mesaje,
    anulari,
    neprezentari,
  ] = await Promise.all([
    programari()
      .gte("starts_at", iAzi.de)
      .lt("starts_at", iAzi.pana)
      .in("status", ["PENDING", "CONFIRMED", "RESCHEDULED"]),
    programari()
      .gte("starts_at", iMaine.de)
      .lt("starts_at", iMaine.pana)
      .in("status", ["PENDING", "CONFIRMED", "RESCHEDULED"]),
    programari().eq("status", "PENDING"),
    dosare().in("status", [
      "NEW", "IN_PROGRESS", "WAITING_DOCUMENTS",
      "DOCUMENTS_RECEIVED", "UNDER_REVIEW", "READY",
    ]),
    numar("ie_documents").in("status", ["UPLOADED", "UNDER_REVIEW"]),
    numar("ie_profiles").eq("role", "CLIENT").gte("created_at", iLuna.de),
    numar("ie_messages").is("read_at", null).eq("sender_role", "CLIENT"),
    programari()
      .eq("status", "CANCELLED")
      .gte("starts_at", iLuna.de)
      .lt("starts_at", iLuna.pana),
    programari()
      .eq("status", "NO_SHOW")
      .gte("starts_at", iLuna.de)
      .lt("starts_at", iLuna.pana),
  ]);

  return {
    programariAzi: programariAzi.count ?? 0,
    programariMaine: programariMaine.count ?? 0,
    inAsteptare: inAsteptare.count ?? 0,
    dosareActive: dosareActive.count ?? 0,
    documenteDeVerificat: documente.count ?? 0,
    clientiNoi: clientiNoi.count ?? 0,
    mesajeNecitite: mesaje.count ?? 0,
    anulariLunaAceasta: anulari.count ?? 0,
    neprezentariLunaAceasta: neprezentari.count ?? 0,
  };
}

/** Programări pe zi, pentru graficul din §41. */
export async function programariPeZi(zile = 30) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "statistici.vezi")) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const s = await setari();
  const azi = dataISO(s.fusOrar, new Date());
  const start = adaugaZile(azi, -zile + 1);
  const i = await interval(start, zile);

  const { data } = await sb
    .from("ie_appointments")
    .select("starts_at, status")
    .gte("starts_at", i.de)
    .lt("starts_at", i.pana);

  // Pornim de la zero pentru fiecare zi: un grafic care sare peste zilele goale
  // sugerează o activitate mai uniformă decât cea reală.
  const harta = new Map<string, { total: number; anulate: number }>();
  for (let k = 0; k < zile; k++) {
    harta.set(adaugaZile(start, k), { total: 0, anulate: 0 });
  }

  for (const r of data ?? []) {
    const zi = dataISO(s.fusOrar, new Date(r.starts_at));
    const intrare = harta.get(zi);
    if (!intrare) continue;
    intrare.total += 1;
    if (r.status === "CANCELLED" || r.status === "NO_SHOW") intrare.anulate += 1;
  }

  return [...harta.entries()].map(([zi, v]) => ({ zi, ...v }));
}

/** Cele mai cerute servicii (§41). */
export async function serviciiPopulare(limita = 8) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "statistici.vezi")) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_appointments")
    .select("service_id, ie_services ( name )")
    .limit(5000);

  type Rand = { service_id: string; ie_services: { name: string } | null };
  const contor = new Map<string, { nume: string; total: number }>();

  for (const r of (data ?? []) as unknown as Rand[]) {
    const nume = r.ie_services?.name ?? "—";
    const intrare = contor.get(r.service_id) ?? { nume, total: 0 };
    intrare.total += 1;
    contor.set(r.service_id, intrare);
  }

  return [...contor.values()].sort((a, b) => b.total - a.total).slice(0, limita);
}

/** Repartiția pe operatori (§41). */
export async function incarcareOperatori() {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "statistici.vezi")) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const s = await setari();
  const azi = dataISO(s.fusOrar, new Date());
  const i = await interval(adaugaZile(azi, -30), 31);

  const { data } = await sb
    .from("ie_appointments")
    .select("operator_id, status, ie_operators ( display_name, color )")
    .gte("starts_at", i.de)
    .lt("starts_at", i.pana);

  type Rand = {
    operator_id: string;
    status: string;
    ie_operators: { display_name: string; color: string } | null;
  };

  const contor = new Map<string, { nume: string; culoare: string; total: number; finalizate: number }>();

  for (const r of (data ?? []) as unknown as Rand[]) {
    const intrare = contor.get(r.operator_id) ?? {
      nume: r.ie_operators?.display_name ?? "—",
      culoare: r.ie_operators?.color ?? "#00b34a",
      total: 0,
      finalizate: 0,
    };
    intrare.total += 1;
    if (r.status === "COMPLETED") intrare.finalizate += 1;
    contor.set(r.operator_id, intrare);
  }

  return [...contor.values()].sort((a, b) => b.total - a.total);
}

/**
 * Rândurile pentru exportul CSV (§42).
 *
 * Întoarce date, nu un fișier: formatul se decide în ruta care servește
 * descărcarea, iar aceeași sursă poate alimenta și un raport pe ecran.
 */
export async function randuriRaport(deLa: string, panaLa: string) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "statistici.vezi")) return [];

  const sb = await clientSesiune();
  if (!sb) return [];

  const s = await setari();
  const de = momentDinZiSiMinut(s.fusOrar, deLa, 0).toISOString();
  const pana = momentDinZiSiMinut(s.fusOrar, adaugaZile(panaLa, 1), 0).toISOString();

  const { data } = await sb
    .from("ie_appointments")
    .select(
      `code, starts_at, status, guest_first_name, guest_last_name, guest_email, guest_phone,
       ie_services ( name ), ie_operators ( display_name ), ie_profiles ( full_name, email )`,
    )
    .gte("starts_at", de)
    .lt("starts_at", pana)
    .order("starts_at");

  return data ?? [];
}
