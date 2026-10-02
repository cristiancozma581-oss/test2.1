import "server-only";

import { clientPublic } from "../supabase";
import { setari } from "./setari";
import {
  adaugaZile,
  dataISO,
  minuteLaOra,
  momentDinZiSiMinut,
} from "../fus-orar";
import {
  sloturiDisponibile,
  slotValid,
  type CerereSloturi,
  type Exceptie,
  type RegulaProgram,
  type Slot,
} from "../disponibilitate";
import { STATUSURI_ACTIVE } from "../tipuri";

/**
 * Aducerea datelor pentru motorul de sloturi (§17).
 *
 * Modulul acesta face UN singur lucru: strânge programul, excepțiile și orele
 * deja ocupate, apoi le dă motorului pur din `lib/immy/disponibilitate.ts`.
 * Calculul nu se face aici, ca să rămână testabil acolo.
 */

type Context = {
  program: RegulaProgram[];
  exceptii: Exceptie[];
  ocupate: { starts_at: string; ends_at: string }[];
};

/**
 * Strânge tot ce ține de un operator, într-un interval de zile.
 *
 * O singură rundă de interogări pentru tot intervalul, nu una pe zi: pagina de
 * rezervare desenează două săptămâni deodată, iar 14 × 3 interogări ar fi o
 * risipă care se simte.
 */
async function context(
  operatorId: string,
  deLaZi: string,
  panaLaZi: string,
  fus: string,
): Promise<Context> {
  const sb = clientPublic();
  if (!sb) return { program: [], exceptii: [], ocupate: [] };

  // Marginile se lărgesc cu o zi ca o programare care intră în zi dinspre
  // ziua precedentă să fie tot văzută.
  const de = momentDinZiSiMinut(fus, adaugaZile(deLaZi, -1), 0).toISOString();
  const pana = momentDinZiSiMinut(fus, adaugaZile(panaLaZi, 2), 0).toISOString();

  const [program, exceptii, ocupate] = await Promise.all([
    sb
      .from("ie_availability")
      .select("weekday, starts_at, ends_at, kind")
      .eq("operator_id", operatorId),
    sb
      .from("ie_availability_exceptions")
      .select("operator_id, date_from, date_to, kind, starts_at, ends_at")
      .lte("date_from", panaLaZi)
      .gte("date_to", deLaZi)
      // `null` = închidere pentru tot biroul, deci trebuie inclusă și ea.
      .or(`operator_id.eq.${operatorId},operator_id.is.null`),
    sb
      .from("ie_appointments")
      .select("starts_at, ends_at")
      .eq("operator_id", operatorId)
      .in("status", [...STATUSURI_ACTIVE])
      .gte("starts_at", de)
      .lt("starts_at", pana),
  ]);

  return {
    program: (program.data ?? []) as RegulaProgram[],
    exceptii: (exceptii.data ?? []) as Exceptie[],
    ocupate: ocupate.data ?? [],
  };
}

export type ZiCuSloturi = { zi: string; sloturi: Slot[] };

/**
 * Sloturile libere ale unui operator, zi cu zi.
 *
 * `exclude` scoate o programare din lista celor care ocupă — folosit la
 * reprogramare, ca ora curentă a clientului să nu apară ocupată de el însuși.
 */
export async function sloturiPentru(
  operatorId: string,
  durataMinute: number,
  deLaZi: string,
  numarZile: number,
  optiuni: { exclude?: { starts_at: string; ends_at: string } } = {},
): Promise<ZiCuSloturi[]> {
  const s = await setari();
  const panaLaZi = adaugaZile(deLaZi, numarZile - 1);
  const ctx = await context(operatorId, deLaZi, panaLaZi, s.fusOrar);

  const ocupate = optiuni.exclude
    ? ctx.ocupate.filter(
        (o) =>
          !(
            o.starts_at === optiuni.exclude!.starts_at &&
            o.ends_at === optiuni.exclude!.ends_at
          ),
      )
    : ctx.ocupate;

  const acum = new Date();
  const rezultat: ZiCuSloturi[] = [];

  for (let i = 0; i < numarZile; i++) {
    const zi = adaugaZile(deLaZi, i);
    rezultat.push({
      zi,
      sloturi: sloturiDisponibile({
        fus: s.fusOrar,
        zi,
        operatorId,
        durataMinute,
        pasMinute: s.pasMinute,
        program: ctx.program,
        exceptii: ctx.exceptii,
        ocupate,
        acum,
        preavizMinute: s.preavizMinute,
        orizontZile: s.orizontZile,
      }),
    });
  }
  return rezultat;
}

/**
 * Reverificarea dinaintea scrierii (§78).
 *
 * Între momentul în care clientul a văzut ora și cel în care apasă „Conferma"
 * pot trece minute. Verificarea de aici prinde cazul obișnuit și dă un mesaj
 * omenesc; constrângerea EXCLUDE din bază prinde cazul în care doi oameni apasă
 * în aceeași clipă și dă o eroare pe care o traducem tot într-un mesaj omenesc.
 */
export async function slotEsteLiber(
  operatorId: string,
  durataMinute: number,
  inceput: Date,
): Promise<boolean> {
  const s = await setari();
  const zi = dataISO(s.fusOrar, inceput);
  const ctx = await context(operatorId, zi, zi, s.fusOrar);

  const cerere: CerereSloturi = {
    fus: s.fusOrar,
    zi,
    operatorId,
    durataMinute,
    pasMinute: s.pasMinute,
    program: ctx.program,
    exceptii: ctx.exceptii,
    ocupate: ctx.ocupate,
    acum: new Date(),
    preavizMinute: s.preavizMinute,
    orizontZile: s.orizontZile,
  };

  return slotValid(cerere, inceput);
}

/** Prima zi cu locuri libere, pornind de la o dată. Pentru „primul posto libero". */
export async function primaZiLibera(
  operatorId: string,
  durataMinute: number,
  deLaZi: string,
  maximZile = 60,
): Promise<string | null> {
  const zile = await sloturiPentru(operatorId, durataMinute, deLaZi, maximZile);
  return zile.find((z) => z.sloturi.length > 0)?.zi ?? null;
}

/** Programul săptămânal al unui operator, gata de afișat în admin. */
export async function programSaptamanal(operatorId: string) {
  const sb = clientPublic();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_availability")
    .select("id, weekday, starts_at, ends_at, kind")
    .eq("operator_id", operatorId)
    .order("weekday")
    .order("starts_at");

  return (data ?? []).map((r) => ({
    id: r.id,
    ziuaSaptamanii: r.weekday,
    deLa: minuteLaOra(
      Number(r.starts_at.slice(0, 2)) * 60 + Number(r.starts_at.slice(3, 5)),
    ),
    panaLa: minuteLaOra(
      Number(r.ends_at.slice(0, 2)) * 60 + Number(r.ends_at.slice(3, 5)),
    ),
    tip: r.kind as "work" | "break",
  }));
}

export async function exceptiiViitoare(operatorId?: string) {
  const sb = clientPublic();
  if (!sb) return [];

  const s = await setari();
  const azi = dataISO(s.fusOrar, new Date());

  let q = sb
    .from("ie_availability_exceptions")
    .select("id, operator_id, date_from, date_to, kind, starts_at, ends_at, reason")
    .gte("date_to", azi)
    .order("date_from");

  if (operatorId) q = q.or(`operator_id.eq.${operatorId},operator_id.is.null`);

  const { data } = await q;
  return data ?? [];
}
