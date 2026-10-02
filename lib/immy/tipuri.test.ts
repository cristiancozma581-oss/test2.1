import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACTIUNI_AUDIT,
  EVENIMENTE,
  LIMBI,
  MIME_ACCEPTATE,
  ROLURI,
  STATUSURI_ACTIVE,
  STATUSURI_DOCUMENT,
  STATUSURI_DOSAR,
  STATUSURI_PLATA,
  STATUSURI_PROGRAMARE,
  STATUSURI_SERVICIU,
  limbaValida,
  programareActiva,
} from "./tipuri";

/**
 * Vocabularele din TypeScript trebuie să fie identice cu constrângerile `check`
 * din SQL. Dacă cineva adaugă un status doar într-un loc, aplicația fie oferă o
 * opțiune pe care baza o respinge, fie ascunde una validă. Testul citește chiar
 * fișierele de migrație, deci nu poate fi păcălit de o copie învechită.
 */
const MIGRATII = join(process.cwd(), "supabase", "migrations");

function sql(fisier: string): string {
  return readFileSync(join(MIGRATII, fisier), "utf8");
}

/** Extrage lista de literali dintr-un `check (coloana in (...))`. */
function valoriDinCheck(text: string, coloana: string): string[] {
  const re = new RegExp(`${coloana}\\s+in\\s*\\(([^)]*)\\)`, "i");
  const m = re.exec(text);
  if (!m) throw new Error(`Nu am găsit constrângerea pentru „${coloana}".`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe("vocabularele TypeScript ↔ SQL", () => {
  it("rolurile sunt aceleași", () => {
    const dinSql = valoriDinCheck(sql("0011_ie_identitate.sql"), "role");
    expect(new Set(dinSql)).toEqual(new Set(ROLURI));
  });

  it("statusurile de programare sunt aceleași", () => {
    const dinSql = valoriDinCheck(sql("0013_ie_programari.sql"), "status");
    expect(new Set(dinSql)).toEqual(new Set(STATUSURI_PROGRAMARE));
  });

  it("statusurile de dosar sunt aceleași", () => {
    const dinSql = valoriDinCheck(sql("0014_ie_dosare_documente.sql"), "status");
    expect(new Set(dinSql)).toEqual(new Set(STATUSURI_DOSAR));
  });

  it("statusurile de document sunt aceleași", () => {
    const text = sql("0014_ie_dosare_documente.sql");
    // A doua constrângere `status in (...)` din fișier este cea a documentelor.
    const toate = [...text.matchAll(/status\s+in\s*\(([^)]*)\)/gi)];
    const documente = [...toate[1][1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect(new Set(documente)).toEqual(new Set(STATUSURI_DOCUMENT));
  });

  it("statusurile de serviciu sunt aceleași", () => {
    const dinSql = valoriDinCheck(sql("0012_ie_catalog.sql"), "status");
    expect(new Set(dinSql)).toEqual(new Set(STATUSURI_SERVICIU));
  });

  it("evenimentele de notificare sunt aceleași", () => {
    const dinSql = valoriDinCheck(sql("0015_ie_comunicare.sql"), "event");
    expect(new Set(dinSql)).toEqual(new Set(EVENIMENTE));
  });

  it("acțiunile auditabile sunt aceleași", () => {
    const dinSql = valoriDinCheck(sql("0010_ie_fundatie.sql"), "action");
    expect(new Set(dinSql)).toEqual(new Set(ACTIUNI_AUDIT));
  });

  it("statusurile de plată sunt aceleași", () => {
    const text = sql("0015_ie_comunicare.sql");
    const toate = [...text.matchAll(/status\s+in\s*\(([^)]*)\)/gi)];
    const plati = toate
      .map((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))
      .find((lista) => lista.includes("REFUNDED"));
    expect(new Set(plati)).toEqual(new Set(STATUSURI_PLATA));
  });

  it("limbile sunt aceleași", () => {
    const dinSql = valoriDinCheck(sql("0011_ie_identitate.sql"), "preferred_locale");
    expect(new Set(dinSql)).toEqual(new Set(LIMBI));
  });
});

describe("statusurile active ↔ constrângerea EXCLUDE", () => {
  it("blochează exact aceleași statusuri ca indexul anti-suprapunere", () => {
    const text = sql("0013_ie_programari.sql");
    const m = /where\s*\(status\s+in\s*\(([^)]*)\)\)/i.exec(text);
    expect(m).not.toBeNull();
    const dinSql = [...(m as RegExpExecArray)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect(new Set(dinSql)).toEqual(new Set(STATUSURI_ACTIVE));
  });

  it("programareActiva răspunde la fel pentru fiecare status", () => {
    expect(programareActiva("PENDING")).toBe(true);
    expect(programareActiva("CONFIRMED")).toBe(true);
    expect(programareActiva("RESCHEDULED")).toBe(true);
    expect(programareActiva("CANCELLED")).toBe(false);
    expect(programareActiva("COMPLETED")).toBe(false);
    expect(programareActiva("NO_SHOW")).toBe(false);
  });
});

describe("tipurile de fișier ↔ bucket-ul de storage", () => {
  it("aplicația acceptă exact ce acceptă bucket-ul", () => {
    const text = sql("0016_ie_rls.sql");
    const m = /allowed_mime_types[\s\S]*?array\[([\s\S]*?)\]/i.exec(text);
    expect(m).not.toBeNull();
    const dinSql = [...(m as RegExpExecArray)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect(new Set(dinSql)).toEqual(new Set(MIME_ACCEPTATE));
  });
});

describe("limbaValida", () => {
  it("acceptă limbile cunoscute și respinge restul", () => {
    expect(limbaValida("it")).toBe(true);
    expect(limbaValida("ro")).toBe(true);
    expect(limbaValida("de")).toBe(false);
    expect(limbaValida(null)).toBe(false);
    expect(limbaValida(42)).toBe(false);
  });
});
