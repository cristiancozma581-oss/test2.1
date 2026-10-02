import { describe, expect, it } from "vitest";
import {
  adaugaZile,
  componente,
  dataISO,
  decalajMinute,
  despartaData,
  diferentaZile,
  laMoment,
  minuteLaOra,
  momentDinZiSiMinut,
  oraLaMinute,
  ziSaptamanii,
} from "./fus-orar";

const ROMA = "Europe/Rome";

describe("decalajMinute", () => {
  it("dă +60 iarna și +120 vara la Roma", () => {
    expect(decalajMinute(ROMA, new Date("2026-01-15T12:00:00Z"))).toBe(60);
    expect(decalajMinute(ROMA, new Date("2026-07-15T12:00:00Z"))).toBe(120);
  });
});

describe("laMoment", () => {
  it("convertește ora de perete în moment absolut, iarna", () => {
    // 09:30 la Roma în ianuarie = 08:30 UTC.
    expect(laMoment(ROMA, 2026, 1, 15, 9, 30).toISOString()).toBe(
      "2026-01-15T08:30:00.000Z",
    );
  });

  it("convertește corect și vara", () => {
    // 09:30 la Roma în iulie = 07:30 UTC.
    expect(laMoment(ROMA, 2026, 7, 15, 9, 30).toISOString()).toBe(
      "2026-07-15T07:30:00.000Z",
    );
  });

  it("rezolvă ziua în care ceasul sare înainte", () => {
    // În 2026 ora de vară începe duminică 29 martie: la 02:00 locale ceasul
    // sare la 03:00. Ora 01:30 este încă de iarnă (+60), 03:30 deja de vară.
    expect(laMoment(ROMA, 2026, 3, 29, 1, 30).toISOString()).toBe(
      "2026-03-29T00:30:00.000Z",
    );
    expect(laMoment(ROMA, 2026, 3, 29, 3, 30).toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });

  it("rezolvă ziua în care ceasul dă înapoi", () => {
    // 25 octombrie 2026: la 03:00 locale ceasul revine la 02:00.
    expect(laMoment(ROMA, 2026, 10, 25, 9, 30).toISOString()).toBe(
      "2026-10-25T08:30:00.000Z",
    );
  });

  it("este inversul lui componente", () => {
    for (const [luna, zi] of [[1, 15], [3, 29], [7, 4], [10, 25], [12, 31]]) {
      const m = laMoment(ROMA, 2026, luna, zi, 15, 45);
      const c = componente(ROMA, m);
      expect([c.an, c.luna, c.zi, c.ore, c.minute]).toEqual([2026, luna, zi, 15, 45]);
    }
  });
});

describe("componente", () => {
  it("dă ziua săptămânii pe convenția 0 = duminică", () => {
    // 14 septembrie 2026 este o luni.
    expect(componente(ROMA, new Date("2026-09-14T10:00:00Z")).ziSaptamanii).toBe(1);
    expect(componente(ROMA, new Date("2026-09-13T10:00:00Z")).ziSaptamanii).toBe(0);
  });

  it("nu confundă ziua când UTC și ora locală sunt în zile diferite", () => {
    // 23:30 UTC = deja ziua următoare la Roma.
    expect(dataISO(ROMA, new Date("2026-07-14T23:30:00Z"))).toBe("2026-07-15");
  });
});

describe("despartaData", () => {
  it("respinge formatul greșit", () => {
    expect(() => despartaData("14/09/2026")).toThrow();
    expect(() => despartaData("2026-9-14")).toThrow();
  });

  it("respinge o zi care nu există", () => {
    expect(() => despartaData("2026-02-31")).toThrow(/nu există/);
    expect(() => despartaData("2026-13-01")).toThrow();
  });

  it("acceptă 29 februarie într-un an bisect", () => {
    expect(despartaData("2028-02-29")).toEqual({ an: 2028, luna: 2, zi: 29 });
  });
});

describe("ore și minute", () => {
  it("convertește în ambele sensuri", () => {
    expect(oraLaMinute("09:30")).toBe(570);
    expect(oraLaMinute("09:30:00")).toBe(570);
    expect(minuteLaOra(570)).toBe("09:30");
    expect(minuteLaOra(0)).toBe("00:00");
  });

  it("respinge orele imposibile", () => {
    expect(() => oraLaMinute("25:00")).toThrow();
    expect(() => oraLaMinute("09:60")).toThrow();
    expect(() => oraLaMinute("nouă și jumătate")).toThrow();
  });
});

describe("aritmetica zilelor", () => {
  it("trece corect peste marginea lunii și a anului", () => {
    expect(adaugaZile("2026-01-31", 1)).toBe("2026-02-01");
    expect(adaugaZile("2026-12-31", 1)).toBe("2027-01-01");
    expect(adaugaZile("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("nu pierde o zi la schimbarea orei", () => {
    // Aritmetica se face pe date calendaristice, nu pe milisecunde, deci
    // ziua de 25 de ore nu poate produce un rezultat deplasat.
    expect(adaugaZile("2026-03-28", 1)).toBe("2026-03-29");
    expect(adaugaZile("2026-03-29", 1)).toBe("2026-03-30");
    expect(diferentaZile("2026-03-28", "2026-03-30")).toBe(2);
    expect(diferentaZile("2026-10-24", "2026-10-26")).toBe(2);
  });
});

describe("ziSaptamanii", () => {
  it("folosește aceeași convenție ca Postgres extract(dow)", () => {
    expect(ziSaptamanii("2026-09-13")).toBe(0); // duminică
    expect(ziSaptamanii("2026-09-14")).toBe(1); // luni
    expect(ziSaptamanii("2026-09-19")).toBe(6); // sâmbătă
  });
});

describe("momentDinZiSiMinut", () => {
  it("compune ziua și minutul într-un moment absolut", () => {
    expect(momentDinZiSiMinut(ROMA, "2026-09-14", 570).toISOString()).toBe(
      "2026-09-14T07:30:00.000Z",
    );
  });
});
