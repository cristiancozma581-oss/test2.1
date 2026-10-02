import { describe, expect, it } from "vitest";
import {
  ferestreLibere,
  normalizeaza,
  scade,
  slotValid,
  sloturiDisponibile,
  taieInSloturi,
  zileCuDisponibilitate,
  type CerereSloturi,
  type Exceptie,
  type RegulaProgram,
} from "./disponibilitate";

const ROMA = "Europe/Rome";
const OP = "operator-immy";

/** Programul real al biroului: L–V, 9:30–13:00 și 15:00–18:00. */
const PROGRAM: RegulaProgram[] = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, starts_at: "09:30", ends_at: "13:00", kind: "work" as const },
  { weekday, starts_at: "15:00", ends_at: "18:00", kind: "work" as const },
]);

function cerere(peste: Partial<CerereSloturi> = {}): CerereSloturi {
  return {
    fus: ROMA,
    zi: "2026-09-14", // o luni
    operatorId: OP,
    durataMinute: 30,
    pasMinute: 30,
    program: PROGRAM,
    exceptii: [],
    ocupate: [],
    // Cu o săptămână înainte, ca preavizul să nu taie nimic.
    acum: new Date("2026-09-07T08:00:00Z"),
    preavizMinute: 120,
    orizontZile: 60,
    ...peste,
  };
}

describe("normalizeaza", () => {
  it("reunește intervalele care se suprapun sau se ating", () => {
    expect(
      normalizeaza([
        { start: 600, sfarsit: 660 },
        { start: 660, sfarsit: 720 },
        { start: 540, sfarsit: 570 },
      ]),
    ).toEqual([
      { start: 540, sfarsit: 570 },
      { start: 600, sfarsit: 720 },
    ]);
  });

  it("aruncă intervalele goale sau inverse", () => {
    expect(normalizeaza([{ start: 600, sfarsit: 600 }, { start: 700, sfarsit: 650 }])).toEqual([]);
  });
});

describe("scade", () => {
  it("taie o gaură la mijloc", () => {
    expect(scade([{ start: 0, sfarsit: 100 }], [{ start: 40, sfarsit: 60 }])).toEqual([
      { start: 0, sfarsit: 40 },
      { start: 60, sfarsit: 100 },
    ]);
  });

  it("taie de la margini", () => {
    expect(scade([{ start: 0, sfarsit: 100 }], [{ start: 0, sfarsit: 30 }])).toEqual([
      { start: 30, sfarsit: 100 },
    ]);
    expect(scade([{ start: 0, sfarsit: 100 }], [{ start: 70, sfarsit: 200 }])).toEqual([
      { start: 0, sfarsit: 70 },
    ]);
  });

  it("șterge complet intervalul acoperit", () => {
    expect(scade([{ start: 10, sfarsit: 50 }], [{ start: 0, sfarsit: 100 }])).toEqual([]);
  });

  it("tratează atingerea la capăt ca neintersectare", () => {
    // `[)`: 0–40 și 40–80 sunt adiacente, deci scăderea nu taie nimic.
    expect(scade([{ start: 0, sfarsit: 40 }], [{ start: 40, sfarsit: 80 }])).toEqual([
      { start: 0, sfarsit: 40 },
    ]);
  });
});

describe("taieInSloturi", () => {
  it("aliniază la grila zilei, nu la începutul ferestrei", () => {
    // Fereastra începe la 9:35, pasul este 30: primul slot este la 10:00,
    // ca orele să fie aceleași peste tot în zi.
    expect(taieInSloturi({ start: 575, sfarsit: 720 }, 30, 30)).toEqual([600, 630, 660, 690]);
  });

  it("nu produce un slot care depășește fereastra", () => {
    expect(taieInSloturi({ start: 600, sfarsit: 640 }, 60, 30)).toEqual([]);
  });

  it("suprapune sloturile când pasul e mai mic decât durata", () => {
    expect(taieInSloturi({ start: 600, sfarsit: 720 }, 60, 15)).toEqual([600, 615, 630, 645, 660]);
  });
});

describe("ferestreLibere", () => {
  it("întoarce cele două ferestre de lucru ale zilei", () => {
    expect(ferestreLibere(cerere())).toEqual([
      { start: 570, sfarsit: 780 }, // 09:30–13:00
      { start: 900, sfarsit: 1080 }, // 15:00–18:00
    ]);
  });

  it("nu dă nimic sâmbăta", () => {
    expect(ferestreLibere(cerere({ zi: "2026-09-19" }))).toEqual([]);
  });

  it("scade pauza declarată", () => {
    const program: RegulaProgram[] = [
      { weekday: 1, starts_at: "09:00", ends_at: "18:00", kind: "work" },
      { weekday: 1, starts_at: "13:00", ends_at: "14:00", kind: "break" },
    ];
    expect(ferestreLibere(cerere({ program }))).toEqual([
      { start: 540, sfarsit: 780 },
      { start: 840, sfarsit: 1080 },
    ]);
  });

  it("închide ziua întreagă la o sărbătoare a biroului", () => {
    const exceptii: Exceptie[] = [
      {
        operator_id: null, // tot biroul
        date_from: "2026-09-14",
        date_to: "2026-09-14",
        kind: "holiday",
        starts_at: null,
        ends_at: null,
      },
    ];
    expect(ferestreLibere(cerere({ exceptii }))).toEqual([]);
  });

  it("nu închide ziua altui operator", () => {
    const exceptii: Exceptie[] = [
      {
        operator_id: "operator-emy",
        date_from: "2026-09-14",
        date_to: "2026-09-14",
        kind: "leave",
        starts_at: null,
        ends_at: null,
      },
    ];
    expect(ferestreLibere(cerere({ exceptii }))).toHaveLength(2);
  });

  it("taie doar dimineața la un concediu parțial", () => {
    const exceptii: Exceptie[] = [
      {
        operator_id: OP,
        date_from: "2026-09-14",
        date_to: "2026-09-14",
        kind: "leave",
        starts_at: "09:00",
        ends_at: "13:00",
      },
    ];
    expect(ferestreLibere(cerere({ exceptii }))).toEqual([{ start: 900, sfarsit: 1080 }]);
  });

  it("respectă o perioadă de concediu de mai multe zile", () => {
    const exceptii: Exceptie[] = [
      {
        operator_id: OP,
        date_from: "2026-09-10",
        date_to: "2026-09-20",
        kind: "leave",
        starts_at: null,
        ends_at: null,
      },
    ];
    expect(ferestreLibere(cerere({ exceptii }))).toEqual([]);
    expect(ferestreLibere(cerere({ exceptii, zi: "2026-09-21" }))).toHaveLength(2);
  });

  it("deschide o sâmbătă prin ore suplimentare", () => {
    const exceptii: Exceptie[] = [
      {
        operator_id: OP,
        date_from: "2026-09-19",
        date_to: "2026-09-19",
        kind: "extra",
        starts_at: "10:00",
        ends_at: "13:00",
      },
    ];
    expect(ferestreLibere(cerere({ zi: "2026-09-19", exceptii }))).toEqual([
      { start: 600, sfarsit: 780 },
    ]);
  });

  it("scade o programare existentă", () => {
    const ocupate = [
      { starts_at: "2026-09-14T08:00:00Z", ends_at: "2026-09-14T09:00:00Z" }, // 10:00–11:00 local
    ];
    expect(ferestreLibere(cerere({ ocupate }))).toEqual([
      { start: 570, sfarsit: 600 },
      { start: 660, sfarsit: 780 },
      { start: 900, sfarsit: 1080 },
    ]);
  });
});

describe("sloturiDisponibile", () => {
  it("dă orele așteptate într-o zi liberă", () => {
    const ore = sloturiDisponibile(cerere()).map((s) => s.ora);
    expect(ore[0]).toBe("09:30");
    expect(ore).toContain("12:30");
    expect(ore).not.toContain("13:00"); // 13:00–13:30 ar depăși fereastra
    expect(ore).not.toContain("14:00"); // pauza de prânz
    expect(ore).toContain("15:00");
    expect(ore[ore.length - 1]).toBe("17:30");
  });

  it("produce momente absolute corecte, cu ora de vară", () => {
    const primul = sloturiDisponibile(cerere())[0];
    // 09:30 la Roma în septembrie (ora de vară) = 07:30 UTC.
    expect(primul.inceput.toISOString()).toBe("2026-09-14T07:30:00.000Z");
    expect(primul.sfarsit.toISOString()).toBe("2026-09-14T08:00:00.000Z");
  });

  it("nu propune ore în trecut", () => {
    // „Acum" este în aceeași zi, la 11:00 locale (09:00 UTC), preaviz 120 min.
    const ore = sloturiDisponibile(
      cerere({ acum: new Date("2026-09-14T09:00:00Z") }),
    ).map((s) => s.ora);
    expect(ore).not.toContain("09:30");
    expect(ore).not.toContain("12:30"); // sub preavizul de 2 ore
    expect(ore).toContain("15:00");
  });

  it("respectă orizontul de rezervare", () => {
    expect(sloturiDisponibile(cerere({ zi: "2026-12-14", orizontZile: 30 }))).toEqual([]);
    expect(sloturiDisponibile(cerere({ zi: "2026-09-14", orizontZile: 30 })).length).toBeGreaterThan(0);
  });

  it("nu propune nimic pentru o zi trecută", () => {
    expect(sloturiDisponibile(cerere({ zi: "2026-09-01" }))).toEqual([]);
  });

  it("adaptează numărul de sloturi la durata serviciului", () => {
    const scurt = sloturiDisponibile(cerere({ durataMinute: 15, pasMinute: 15 }));
    const lung = sloturiDisponibile(cerere({ durataMinute: 60, pasMinute: 30 }));
    expect(scurt.length).toBeGreaterThan(lung.length);
    // O ședință de o oră nu poate începe la 12:30: s-ar termina la 13:30.
    expect(lung.map((s) => s.ora)).not.toContain("12:30");
    expect(lung.map((s) => s.ora)).toContain("12:00");
  });

  it("scoate din listă slotul deja rezervat — §78", () => {
    const ocupate = [
      { starts_at: "2026-09-14T07:30:00Z", ends_at: "2026-09-14T08:00:00Z" }, // 09:30
    ];
    const ore = sloturiDisponibile(cerere({ ocupate })).map((s) => s.ora);
    expect(ore).not.toContain("09:30");
    expect(ore).toContain("10:00");
  });

  it("eliberează slotul când programarea este anulată — §78", () => {
    // Apelantul nu trece programările anulate; efectul este că slotul revine.
    const ocupate = [{ starts_at: "2026-09-14T07:30:00Z", ends_at: "2026-09-14T08:00:00Z" }];
    expect(sloturiDisponibile(cerere({ ocupate })).map((s) => s.ora)).not.toContain("09:30");
    expect(sloturiDisponibile(cerere({ ocupate: [] })).map((s) => s.ora)).toContain("09:30");
  });

  it("tratează corect adiacența: o programare 10:00–10:30 lasă liber 10:30", () => {
    const ocupate = [{ starts_at: "2026-09-14T08:00:00Z", ends_at: "2026-09-14T08:30:00Z" }];
    const ore = sloturiDisponibile(cerere({ ocupate })).map((s) => s.ora);
    expect(ore).not.toContain("10:00");
    expect(ore).toContain("10:30");
    expect(ore).toContain("09:30");
  });

  it("funcționează în ziua în care ceasul sare înainte", () => {
    // 30 martie 2026 este lunea de după trecerea la ora de vară.
    const sloturi = sloturiDisponibile(
      cerere({ zi: "2026-03-30", acum: new Date("2026-03-23T08:00:00Z") }),
    );
    expect(sloturi[0].ora).toBe("09:30");
    // 09:30 la Roma, ora de vară = 07:30 UTC.
    expect(sloturi[0].inceput.toISOString()).toBe("2026-03-30T07:30:00.000Z");
  });

  it("funcționează în ziua în care ceasul dă înapoi", () => {
    // 26 octombrie 2026, lunea de după revenirea la ora de iarnă.
    const sloturi = sloturiDisponibile(
      cerere({ zi: "2026-10-26", acum: new Date("2026-10-19T08:00:00Z") }),
    );
    expect(sloturi[0].ora).toBe("09:30");
    // 09:30 la Roma, ora de iarnă = 08:30 UTC.
    expect(sloturi[0].inceput.toISOString()).toBe("2026-10-26T08:30:00.000Z");
  });
});

describe("slotValid", () => {
  it("acceptă exact orele propuse și refuză restul", () => {
    const c = cerere();
    const primul = sloturiDisponibile(c)[0];
    expect(slotValid(c, primul.inceput)).toBe(true);
    // Un minut mai târziu nu este un slot de pe grilă.
    expect(slotValid(c, new Date(primul.inceput.getTime() + 60_000))).toBe(false);
  });

  it("refuză un slot ocupat între timp — apărarea de la §75", () => {
    const c = cerere();
    const tinta = sloturiDisponibile(c)[0].inceput;
    const dupa = {
      ...c,
      ocupate: [{ starts_at: tinta, ends_at: new Date(tinta.getTime() + 30 * 60_000) }],
    };
    expect(slotValid(dupa, tinta)).toBe(false);
  });

  it("refuză o oră din afara programului, chiar dacă e liberă", () => {
    const c = cerere();
    // 07:00 locale — biroul e închis.
    expect(slotValid(c, new Date("2026-09-14T05:00:00Z"))).toBe(false);
  });
});

describe("zileCuDisponibilitate", () => {
  it("păstrează zilele lucrătoare și le scoate pe cele de weekend", () => {
    const cu = cerere();
    const fara = { ...cu, zi: undefined } as unknown as Omit<CerereSloturi, "zi">;
    const zile = ["2026-09-14", "2026-09-15", "2026-09-19", "2026-09-20"];
    expect(zileCuDisponibilitate(fara, zile)).toEqual(["2026-09-14", "2026-09-15"]);
  });
});
