import { describe, expect, it } from "vitest";
import {
  TRANZITII_DOCUMENT,
  TRANZITII_DOSAR,
  TRANZITII_PROGRAMARE,
  clientulPoateAnula,
  poateSchimbaDocumentul,
  poateSchimbaDosarul,
  poateSchimbaProgramarea,
  statusuriDosarUrmatoare,
  statusuriProgramareUrmatoare,
  tranzitieProgramarePermisa,
} from "./flux";
import { STATUSURI_DOCUMENT, STATUSURI_DOSAR, STATUSURI_PROGRAMARE } from "./tipuri";

describe("integritatea matricelor", () => {
  it("nu conține statusuri inventate", () => {
    for (const t of TRANZITII_PROGRAMARE) {
      expect(STATUSURI_PROGRAMARE).toContain(t.din);
      expect(STATUSURI_PROGRAMARE).toContain(t.in);
    }
    for (const t of TRANZITII_DOSAR) {
      expect(STATUSURI_DOSAR).toContain(t.din);
      expect(STATUSURI_DOSAR).toContain(t.in);
    }
    for (const t of TRANZITII_DOCUMENT) {
      expect(STATUSURI_DOCUMENT).toContain(t.din);
      expect(STATUSURI_DOCUMENT).toContain(t.in);
    }
  });

  it("nu conține tranziții duplicate", () => {
    const chei = TRANZITII_PROGRAMARE.map((t) => `${t.din}->${t.in}`);
    expect(new Set(chei).size).toBe(chei.length);
  });

  it("nu conține tranziții către sine", () => {
    for (const t of [...TRANZITII_PROGRAMARE, ...TRANZITII_DOSAR, ...TRANZITII_DOCUMENT]) {
      expect(t.din).not.toBe(t.in);
    }
  });

  it("nicio tranziție nu are lista de roluri goală", () => {
    for (const t of [...TRANZITII_PROGRAMARE, ...TRANZITII_DOSAR, ...TRANZITII_DOCUMENT]) {
      expect(t.roluri.length).toBeGreaterThan(0);
    }
  });
});

describe("fluxul programării", () => {
  it("permite drumul normal PENDING → CONFIRMED → COMPLETED", () => {
    expect(tranzitieProgramarePermisa("PENDING", "CONFIRMED")).toBe(true);
    expect(tranzitieProgramarePermisa("CONFIRMED", "COMPLETED")).toBe(true);
  });

  it("închide definitiv statusurile terminale", () => {
    for (const terminal of ["COMPLETED", "CANCELLED", "NO_SHOW"] as const) {
      for (const tinta of STATUSURI_PROGRAMARE) {
        expect(tranzitieProgramarePermisa(terminal, tinta)).toBe(false);
      }
    }
  });

  it("nu lasă clientul să-și confirme singur programarea", () => {
    expect(poateSchimbaProgramarea("PENDING", "CONFIRMED", "CLIENT")).toBe(false);
    expect(poateSchimbaProgramarea("PENDING", "CONFIRMED", "OPERATOR")).toBe(true);
  });

  it("nu lasă clientul să marcheze COMPLETED sau NO_SHOW", () => {
    expect(poateSchimbaProgramarea("CONFIRMED", "COMPLETED", "CLIENT")).toBe(false);
    expect(poateSchimbaProgramarea("CONFIRMED", "NO_SHOW", "CLIENT")).toBe(false);
  });

  it("lasă clientul să anuleze", () => {
    expect(poateSchimbaProgramarea("PENDING", "CANCELLED", "CLIENT")).toBe(true);
    expect(poateSchimbaProgramarea("CONFIRMED", "CANCELLED", "CLIENT")).toBe(true);
  });

  it("nu oferă clientului nicio destinație în afară de anulare", () => {
    expect(statusuriProgramareUrmatoare("CONFIRMED", "CLIENT")).toEqual(["CANCELLED"]);
  });
});

describe("clientulPoateAnula", () => {
  const inceput = new Date("2026-09-14T08:00:00Z");

  it("permite anularea cu mult înainte", () => {
    const r = clientulPoateAnula("CONFIRMED", inceput, new Date("2026-09-12T08:00:00Z"), 12);
    expect(r.permis).toBe(true);
  });

  it("refuză sub pragul configurat, cu un motiv lizibil", () => {
    const r = clientulPoateAnula("CONFIRMED", inceput, new Date("2026-09-14T00:00:00Z"), 12);
    expect(r.permis).toBe(false);
    expect(r.motiv).toMatch(/12 ore/);
  });

  it("refuză o programare deja anulată", () => {
    const r = clientulPoateAnula("CANCELLED", inceput, new Date("2026-09-01T08:00:00Z"), 12);
    expect(r.permis).toBe(false);
  });

  it("respectă pragul 0 ca „oricând înainte de început”", () => {
    expect(
      clientulPoateAnula("CONFIRMED", inceput, new Date("2026-09-14T07:59:00Z"), 0).permis,
    ).toBe(true);
    expect(
      clientulPoateAnula("CONFIRMED", inceput, new Date("2026-09-14T08:01:00Z"), 0).permis,
    ).toBe(false);
  });
});

describe("fluxul dosarului", () => {
  it("nu lasă clientul să schimbe statusul dosarului", () => {
    for (const t of TRANZITII_DOSAR) {
      expect(t.roluri).not.toContain("CLIENT");
    }
    expect(poateSchimbaDosarul("NEW", "IN_PROGRESS", "CLIENT")).toBe(false);
  });

  it("rezervă redeschiderea unui dosar închis administratorilor", () => {
    expect(poateSchimbaDosarul("CLOSED", "IN_PROGRESS", "OPERATOR")).toBe(false);
    expect(poateSchimbaDosarul("CLOSED", "IN_PROGRESS", "ADMIN")).toBe(true);
    expect(poateSchimbaDosarul("CLOSED", "IN_PROGRESS", "SUPER_ADMIN")).toBe(true);
  });

  it("permite drumul complet până la închidere", () => {
    const drum = [
      "NEW", "WAITING_DOCUMENTS", "DOCUMENTS_RECEIVED",
      "UNDER_REVIEW", "READY", "COMPLETED", "CLOSED",
    ] as const;
    for (let i = 0; i < drum.length - 1; i++) {
      expect(poateSchimbaDosarul(drum[i], drum[i + 1], "OPERATOR")).toBe(true);
    }
  });

  it("nu oferă operatorului nicio ieșire dintr-un dosar anulat", () => {
    expect(statusuriDosarUrmatoare("CANCELLED", "OPERATOR")).toEqual([]);
  });
});

describe("fluxul documentului", () => {
  it("lasă clientul să încarce și să corecteze, dar nu să verifice", () => {
    expect(poateSchimbaDocumentul("REQUESTED", "UPLOADED", "CLIENT")).toBe(true);
    expect(poateSchimbaDocumentul("NEEDS_CORRECTION", "UPLOADED", "CLIENT")).toBe(true);
    expect(poateSchimbaDocumentul("UPLOADED", "VERIFIED", "CLIENT")).toBe(false);
    expect(poateSchimbaDocumentul("UPLOADED", "VERIFIED", "OPERATOR")).toBe(true);
  });

  it("permite redeschiderea unui document verificat", () => {
    expect(poateSchimbaDocumentul("VERIFIED", "UNDER_REVIEW", "OPERATOR")).toBe(true);
  });
});
