/**
 * Motorul de disponibilitate (§17).
 *
 *   PROGRAM OPERATOR − PAUZE − ZILE LIBERE − PROGRAMĂRI EXISTENTE = SLOTURI
 *
 * Modulul este pur: primește intervale, întoarce intervale. Nu știe de bază de
 * date, nu citește ceasul singur (momentul „acum" se dă din afară) și nu are
 * efecte. De aceea poate fi testat direct, iar testul chiar prinde regresii —
 * inclusiv nopțile de schimbare a orei, care altfel n-ar fi verificate niciodată.
 *
 * Contract: TOATE intervalele sunt semi-deschise `[start, sfarsit)` și se
 * exprimă în minute de la miezul nopții LOCALE. Convenția `[)` este aceeași cu
 * a constrângerii EXCLUDE din migrația 0013, deci 10:00–10:30 și 10:30–11:00
 * sunt adiacente, nu suprapuse — în ambele straturi la fel.
 */

import {
  dataISO,
  momentDinZiSiMinut,
  minuteLaOra,
  oraLaMinute,
  ziSaptamanii,
} from "./fus-orar";

export type Interval = { start: number; sfarsit: number };

export type RegulaProgram = {
  weekday: number;
  starts_at: string;
  ends_at: string;
  kind: "work" | "break";
};

export type Exceptie = {
  operator_id: string | null;
  date_from: string;
  date_to: string;
  kind: "closed" | "holiday" | "leave" | "extra";
  starts_at: string | null;
  ends_at: string | null;
};

export type Ocupare = { starts_at: string | Date; ends_at: string | Date };

export type Slot = {
  /** Minute de la miezul nopții locale. */
  minut: number;
  /** `HH:MM`, gata de afișat. */
  ora: string;
  /** Momentul absolut de început, pentru scrierea în bază. */
  inceput: Date;
  sfarsit: Date;
};

// --- Algebră de intervale ----------------------------------------------------

/** Reunește intervalele care se ating sau se suprapun; le și ordonează. */
export function normalizeaza(intervale: readonly Interval[]): Interval[] {
  const sortate = [...intervale]
    .filter((i) => i.sfarsit > i.start)
    .sort((a, b) => a.start - b.start || a.sfarsit - b.sfarsit);

  const rezultat: Interval[] = [];
  for (const i of sortate) {
    const ultim = rezultat[rezultat.length - 1];
    if (ultim && i.start <= ultim.sfarsit) {
      ultim.sfarsit = Math.max(ultim.sfarsit, i.sfarsit);
    } else {
      rezultat.push({ ...i });
    }
  }
  return rezultat;
}

/** `baza` minus `scazut`. Ambele se normalizează întâi. */
export function scade(
  baza: readonly Interval[],
  scazut: readonly Interval[],
): Interval[] {
  const gauri = normalizeaza(scazut);
  let curent = normalizeaza(baza);

  for (const g of gauri) {
    const urmator: Interval[] = [];
    for (const b of curent) {
      // Fără atingere: intervalul rămâne întreg.
      if (g.sfarsit <= b.start || g.start >= b.sfarsit) {
        urmator.push(b);
        continue;
      }
      // Rest la stânga și/sau la dreapta găurii.
      if (g.start > b.start) urmator.push({ start: b.start, sfarsit: g.start });
      if (g.sfarsit < b.sfarsit) urmator.push({ start: g.sfarsit, sfarsit: b.sfarsit });
    }
    curent = urmator;
  }
  return curent;
}

/** Taie un interval în sloturi de `durata`, din `pas` în `pas`. */
export function taieInSloturi(
  interval: Interval,
  durata: number,
  pas: number,
): number[] {
  if (durata <= 0 || pas <= 0) return [];

  const inceputuri: number[] = [];
  // Aliniem la grila globală a zilei, nu la începutul intervalului: altfel
  // fereastra de după pauză ar produce ore de tipul 15:07, diferite de cele
  // de dimineață, și clientul ar vedea un calendar neregulat fără motiv.
  const primul = Math.ceil(interval.start / pas) * pas;
  for (let t = primul; t + durata <= interval.sfarsit; t += pas) {
    inceputuri.push(t);
  }
  return inceputuri;
}

// --- Compunerea zilei --------------------------------------------------------

export type CerereSloturi = {
  fus: string;
  /** Ziua căutată, `AAAA-LL-ZZ`, în ora locală a biroului. */
  zi: string;
  operatorId: string;
  durataMinute: number;
  pasMinute: number;
  program: readonly RegulaProgram[];
  exceptii: readonly Exceptie[];
  ocupate: readonly Ocupare[];
  /** Momentul „acum", dat din afară ca funcția să rămână pură. */
  acum: Date;
  /** Cât de devreme se poate rezerva față de „acum" (§64). */
  preavizMinute: number;
  /** Cât de departe în viitor se poate rezerva. */
  orizontZile: number;
};

/** Ce a rămas liber într-o zi, ca intervale (nu încă tăiat în sloturi). */
export function ferestreLibere(cerere: CerereSloturi): Interval[] {
  const { zi, operatorId, program, exceptii } = cerere;
  const dow = ziSaptamanii(zi);

  const aplicabile = exceptii.filter(
    (e) =>
      (e.operator_id === null || e.operator_id === operatorId) &&
      e.date_from <= zi &&
      e.date_to >= zi,
  );

  // O închidere acoperă ziua întreagă, indiferent ce spune programul.
  const inchisToataZiua = aplicabile.some(
    (e) => e.kind !== "extra" && (!e.starts_at || !e.ends_at),
  );
  if (inchisToataZiua) return [];

  const reguli = program.filter((r) => r.weekday === dow);

  const lucru = reguli
    .filter((r) => r.kind === "work")
    .map((r) => ({ start: oraLaMinute(r.starts_at), sfarsit: oraLaMinute(r.ends_at) }));

  // Orele suplimentare se adaugă la program înainte de scăderi: o zi liberă
  // deschisă excepțional trebuie să producă sloturi chiar dacă `weekday` nu
  // are nicio regulă (o sâmbătă, de pildă).
  const extra = aplicabile
    .filter((e) => e.kind === "extra" && e.starts_at && e.ends_at)
    .map((e) => ({
      start: oraLaMinute(e.starts_at as string),
      sfarsit: oraLaMinute(e.ends_at as string),
    }));

  const disponibil = normalizeaza([...lucru, ...extra]);
  if (disponibil.length === 0) return [];

  const pauze = reguli
    .filter((r) => r.kind === "break")
    .map((r) => ({ start: oraLaMinute(r.starts_at), sfarsit: oraLaMinute(r.ends_at) }));

  // Închiderile parțiale (o dimineață de concediu) se scad ca pauze.
  const inchideriPartiale = aplicabile
    .filter((e) => e.kind !== "extra" && e.starts_at && e.ends_at)
    .map((e) => ({
      start: oraLaMinute(e.starts_at as string),
      sfarsit: oraLaMinute(e.ends_at as string),
    }));

  const ocupate = ocupareInMinute(cerere);

  return scade(disponibil, [...pauze, ...inchideriPartiale, ...ocupate]);
}

/**
 * Programările existente, proiectate pe axa minutelor zilei cerute.
 *
 * O programare care intră în zi dinspre ziua precedentă (sau iese în cea
 * următoare) se decupează la marginile zilei, în loc să fie ignorată — altfel
 * o ședință lungă peste miezul nopții ar lăsa slotul aparent liber.
 */
function ocupareInMinute(cerere: CerereSloturi): Interval[] {
  const { fus, zi, ocupate } = cerere;
  const zeroZi = momentDinZiSiMinut(fus, zi, 0).getTime();
  const rezultat: Interval[] = [];

  for (const o of ocupate) {
    const inceput = o.starts_at instanceof Date ? o.starts_at : new Date(o.starts_at);
    const sfarsit = o.ends_at instanceof Date ? o.ends_at : new Date(o.ends_at);

    const a = Math.round((inceput.getTime() - zeroZi) / 60_000);
    const b = Math.round((sfarsit.getTime() - zeroZi) / 60_000);

    // 1440 este marginea zilei doar în zilele „normale"; în noaptea schimbării
    // orei ziua are 1380 sau 1500 de minute. Decupăm generos și lăsăm
    // `scade` să se ocupe: intervalele din afara programului nu au ce tăia.
    if (b <= 0 || a >= 1500) continue;
    rezultat.push({ start: Math.max(a, 0), sfarsit: Math.min(b, 1500) });
  }
  return rezultat;
}

/**
 * Sloturile rezervabile dintr-o zi.
 *
 * Filtrează și ce este prea aproape („preaviz") sau prea departe („orizont"),
 * ca lista întoarsă să conțină numai ore pe care sistemul chiar le acceptă la
 * confirmare. Un slot afișat, dar respins la „Conferma", este mai rău decât un
 * slot lipsă.
 */
export function sloturiDisponibile(cerere: CerereSloturi): Slot[] {
  const { fus, zi, durataMinute, pasMinute, acum, preavizMinute, orizontZile } = cerere;

  const azi = dataISO(fus, acum);
  if (zi < azi) return [];

  const limita = new Date(acum.getTime() + orizontZile * 86_400_000);
  if (zi > dataISO(fus, limita)) return [];

  const celMaiDevreme = acum.getTime() + preavizMinute * 60_000;

  const sloturi: Slot[] = [];
  for (const fereastra of ferestreLibere(cerere)) {
    for (const minut of taieInSloturi(fereastra, durataMinute, pasMinute)) {
      const inceput = momentDinZiSiMinut(fus, zi, minut);
      if (inceput.getTime() < celMaiDevreme) continue;
      sloturi.push({
        minut,
        ora: minuteLaOra(minut),
        inceput,
        sfarsit: new Date(inceput.getTime() + durataMinute * 60_000),
      });
    }
  }
  return sloturi;
}

/**
 * Verifică dacă un moment propus se potrivește peste sloturile calculate.
 *
 * Aceeași funcție este folosită de interfață (pentru a afișa) și de stratul de
 * scriere (înainte de insert). Din aceleași intrări nu pot ieși două verdicte
 * diferite — ceea ce nu s-ar putea garanta cu două implementări paralele.
 */
export function slotValid(cerere: CerereSloturi, inceput: Date): boolean {
  const t = inceput.getTime();
  return sloturiDisponibile(cerere).some((s) => s.inceput.getTime() === t);
}

/** Câte zile din interval au măcar un slot — pentru punctele din calendar. */
export function zileCuDisponibilitate(
  cerere: Omit<CerereSloturi, "zi">,
  zile: readonly string[],
): string[] {
  return zile.filter((zi) => sloturiDisponibile({ ...cerere, zi }).length > 0);
}

/** Eticheta lizibilă a unei zile („lunedì 14 settembre"). */
export function etichetaZi(fus: string, zi: string, limba = "it"): string {
  const moment = momentDinZiSiMinut(fus, zi, 12 * 60);
  return new Intl.DateTimeFormat(limba, {
    timeZone: fus,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(moment);
}

export { oraLocala } from "./fus-orar";
