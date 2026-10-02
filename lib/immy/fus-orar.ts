/**
 * Conversia între ora de perete a biroului și momentele absolute din bază.
 *
 * De ce nu se poate ocoli: biroul lucrează 9:30–18:00 „ora Torino", iar Italia
 * trece la ora de vară. Dacă am stoca ore locale sau am converti cu un decalaj
 * fix, în ultima duminică din martie programul s-ar deplasa cu o oră și
 * calendarul ar minți exact în ziua în care nimeni nu verifică.
 *
 * Baza stochează `timestamptz` — momente absolute. Modulul acesta traduce între
 * ele și ora de perete, folosind `Intl`, deci baza de fusuri a platformei, fără
 * dependențe și fără tabele de decalaje de întreținut.
 */

export const FUS_IMPLICIT = "Europe/Rome";

/** Câte minute este fusul înaintea UTC în momentul dat. */
export function decalajMinute(fus: string, moment: Date): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: fus,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const p: Record<string, number> = {};
  for (const { type, value } of f.formatToParts(moment)) {
    if (type !== "literal") p[type] = Number(value);
  }

  // `hour` poate veni 24 pentru miezul nopții în unele implementări hour12:false.
  const ora = p.hour === 24 ? 0 : p.hour;
  const caUtc = Date.UTC(p.year, p.month - 1, p.day, ora, p.minute, p.second);
  return (caUtc - moment.getTime()) / 60_000;
}

/**
 * Ora de perete → moment absolut.
 *
 * Două treceri, pentru că decalajul depinde de momentul pe care tocmai încercăm
 * să-l aflăm. Prima trecere dă o aproximare, a doua o corectează — asta rezolvă
 * și cele două nopți pe an în care ceasul sare.
 */
export function laMoment(
  fus: string,
  an: number,
  luna: number,
  zi: number,
  ore = 0,
  minute = 0,
): Date {
  const naiv = Date.UTC(an, luna - 1, zi, ore, minute);
  const d1 = decalajMinute(fus, new Date(naiv));
  const d2 = decalajMinute(fus, new Date(naiv - d1 * 60_000));
  return new Date(naiv - d2 * 60_000);
}

/** Componentele orei de perete pentru un moment absolut. */
export function componente(
  fus: string,
  moment: Date,
): { an: number; luna: number; zi: number; ore: number; minute: number; ziSaptamanii: number } {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: fus,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const p: Record<string, string> = {};
  for (const { type, value } of f.formatToParts(moment)) {
    if (type !== "literal") p[type] = value;
  }

  const zile = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const ora = Number(p.hour) === 24 ? 0 : Number(p.hour);

  return {
    an: Number(p.year),
    luna: Number(p.month),
    zi: Number(p.day),
    ore: ora,
    minute: Number(p.minute),
    ziSaptamanii: zile.indexOf(p.weekday),
  };
}

/** Data locală în forma `AAAA-LL-ZZ` — cheia pe care o folosesc URL-urile. */
export function dataISO(fus: string, moment: Date): string {
  const c = componente(fus, moment);
  return `${c.an}-${String(c.luna).padStart(2, "0")}-${String(c.zi).padStart(2, "0")}`;
}

/** `AAAA-LL-ZZ` → părți numerice. Aruncă pe orice altă formă. */
export function despartaData(iso: string): { an: number; luna: number; zi: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Data „${iso}" nu este în formatul AAAA-LL-ZZ.`);

  const an = Number(m[1]);
  const luna = Number(m[2]);
  const zi = Number(m[3]);

  // `Date.UTC` acceptă tăcut 2026-02-31 și îl mută în martie. Verificăm
  // întoarcerea, ca o dată inexistentă să fie eroare, nu altă zi.
  const d = new Date(Date.UTC(an, luna - 1, zi));
  if (
    d.getUTCFullYear() !== an ||
    d.getUTCMonth() !== luna - 1 ||
    d.getUTCDate() !== zi
  ) {
    throw new Error(`Data „${iso}" nu există în calendar.`);
  }
  return { an, luna, zi };
}

/** Ziua săptămânii (0 = duminică) pentru o dată locală. */
export function ziSaptamanii(iso: string): number {
  const { an, luna, zi } = despartaData(iso);
  return new Date(Date.UTC(an, luna - 1, zi)).getUTCDay();
}

/** `AAAA-LL-ZZ` + minute de la miezul nopții → moment absolut. */
export function momentDinZiSiMinut(fus: string, iso: string, minut: number): Date {
  const { an, luna, zi } = despartaData(iso);
  return laMoment(fus, an, luna, zi, 0, minut);
}

/** `HH:MM[:SS]` → minute de la miezul nopții. */
export function oraLaMinute(ora: string): number {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(ora.trim());
  if (!m) throw new Error(`Ora „${ora}" nu este în formatul HH:MM.`);
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) throw new Error(`Ora „${ora}" nu există.`);
  return h * 60 + mi;
}

/** Minute de la miezul nopții → `HH:MM`. */
export function minuteLaOra(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Adună zile peste o dată locală, fără să treacă prin fus orar. */
export function adaugaZile(iso: string, zile: number): string {
  const { an, luna, zi } = despartaData(iso);
  const d = new Date(Date.UTC(an, luna - 1, zi));
  d.setUTCDate(d.getUTCDate() + zile);
  return d.toISOString().slice(0, 10);
}

/** Numărul de zile de la `de la` la `pana la` (poate fi negativ). */
export function diferentaZile(dela: string, panaLa: string): number {
  const a = despartaData(dela);
  const b = despartaData(panaLa);
  const ma = Date.UTC(a.an, a.luna - 1, a.zi);
  const mb = Date.UTC(b.an, b.luna - 1, b.zi);
  return Math.round((mb - ma) / 86_400_000);
}

/** Ora locală a unui moment absolut, `HH:MM`. */
export function oraLocala(fus: string, moment: Date): string {
  const c = componente(fus, moment);
  return `${String(c.ore).padStart(2, "0")}:${String(c.minute).padStart(2, "0")}`;
}
