import { describe, expect, it } from "vitest";
import {
  PERMISIUNI,
  esteAdmin,
  estePersonal,
  paginaDeStart,
  permisiunileRolului,
  poate,
  poateOricare,
  poateToate,
  poateVedeaDosarul,
} from "./rbac";
import { ROLURI } from "./tipuri";

describe("poate", () => {
  it("dă totul lui SUPER_ADMIN", () => {
    for (const p of PERMISIUNI) expect(poate("SUPER_ADMIN", p)).toBe(true);
  });

  it("nu dă nimic clientului — §34, §75", () => {
    for (const p of PERMISIUNI) expect(poate("CLIENT", p)).toBe(false);
  });

  it("nu dă nimic unei sesiuni fără rol", () => {
    for (const p of PERMISIUNI) {
      expect(poate(null, p)).toBe(false);
      expect(poate(undefined, p)).toBe(false);
    }
  });

  it("ține un client departe de dashboard-ul administratorului — §75", () => {
    expect(poate("CLIENT", "dashboard.admin")).toBe(false);
    expect(poate("CLIENT", "audit.vezi")).toBe(false);
    expect(poate("CLIENT", "utilizatori.administreaza")).toBe(false);
  });
});

describe("limitele operatorului — §34", () => {
  it("nu îi dă funcțiile globale de administrare", () => {
    for (const p of [
      "dashboard.admin",
      "servicii.administreaza",
      "operatori.administreaza",
      "utilizatori.administreaza",
      "setari.administreaza",
      "audit.vezi",
      "plati.administreaza",
      "cms.administreaza",
      "roluri.schimba",
    ] as const) {
      expect(poate("OPERATOR", p)).toBe(false);
    }
  });

  it("îi dă exact ce are nevoie ca să lucreze", () => {
    for (const p of [
      "dashboard.operator",
      "calendar.vezi_propriu",
      "dosare.modifica",
      "documente.verifica",
      "mesaje.raspunde",
    ] as const) {
      expect(poate("OPERATOR", p)).toBe(true);
    }
  });

  it("nu îi dă vederea globală asupra calendarului", () => {
    expect(poate("OPERATOR", "calendar.vezi_tot")).toBe(false);
    expect(poate("OPERATOR", "calendar.vezi_propriu")).toBe(true);
  });
});

describe("limitele accoglienzei", () => {
  it("ține calendarul, dar nu intră în dosare și documente", () => {
    expect(poate("RECEPTIONIST", "calendar.vezi_tot")).toBe(true);
    expect(poate("RECEPTIONIST", "programari.creeaza")).toBe(true);
    expect(poate("RECEPTIONIST", "dosare.vezi_tot")).toBe(false);
    expect(poate("RECEPTIONIST", "documente.verifica")).toBe(false);
    expect(poate("RECEPTIONIST", "documente.vezi_tot")).toBe(false);
  });
});

describe("limitele administratorului", () => {
  it("administrează tot, în afară de schimbarea rolurilor", () => {
    expect(poate("ADMIN", "utilizatori.administreaza")).toBe(true);
    expect(poate("ADMIN", "audit.vezi")).toBe(true);
    expect(poate("ADMIN", "roluri.schimba")).toBe(false);
    expect(poate("SUPER_ADMIN", "roluri.schimba")).toBe(true);
  });
});

describe("ajutoare", () => {
  it("poateOricare și poateToate se comportă ca ∃ și ∀", () => {
    expect(poateOricare("OPERATOR", ["dashboard.admin", "mesaje.raspunde"])).toBe(true);
    expect(poateToate("OPERATOR", ["dashboard.admin", "mesaje.raspunde"])).toBe(false);
    expect(poateToate("OPERATOR", ["dosare.modifica", "mesaje.raspunde"])).toBe(true);
    expect(poateOricare("CLIENT", [...PERMISIUNI])).toBe(false);
  });

  it("clasifică personalul corect", () => {
    expect(estePersonal("OPERATOR")).toBe(true);
    expect(estePersonal("RECEPTIONIST")).toBe(true);
    expect(estePersonal("ADMIN")).toBe(true);
    expect(estePersonal("CLIENT")).toBe(false);
    expect(estePersonal(null)).toBe(false);
    expect(esteAdmin("OPERATOR")).toBe(false);
    expect(esteAdmin("ADMIN")).toBe(true);
  });

  it("trimite fiecare rol la pagina lui de start", () => {
    expect(paginaDeStart("SUPER_ADMIN")).toBe("/admin");
    expect(paginaDeStart("ADMIN")).toBe("/admin");
    expect(paginaDeStart("OPERATOR")).toBe("/operatore");
    expect(paginaDeStart("RECEPTIONIST")).toBe("/operatore");
    expect(paginaDeStart("CLIENT")).toBe("/area-cliente");
    expect(paginaDeStart(null)).toBe("/area-cliente");
  });

  it("descrie fiecare rol fără să arunce", () => {
    for (const rol of ROLURI) {
      expect(Array.isArray(permisiunileRolului(rol))).toBe(true);
    }
  });
});

describe("poateVedeaDosarul", () => {
  const CLIENT = "client-1";
  const OP_A = "operator-a";
  const OP_B = "operator-b";
  const DOSAR = { clientId: CLIENT, operatorId: OP_A };

  it("lasă clientul în propriul dosar", () => {
    expect(
      poateVedeaDosarul({ rol: "CLIENT", id: CLIENT, operatorId: null }, DOSAR),
    ).toBe(true);
  });

  it("ține clientul departe de dosarul altcuiva — §24, §75", () => {
    expect(
      poateVedeaDosarul({ rol: "CLIENT", id: "strain", operatorId: null }, DOSAR),
    ).toBe(false);
  });

  it("lasă operatorul în dosarele lui, dar nu în ale colegului", () => {
    expect(
      poateVedeaDosarul({ rol: "OPERATOR", id: "u", operatorId: OP_A }, DOSAR),
    ).toBe(true);
    expect(
      poateVedeaDosarul({ rol: "OPERATOR", id: "u", operatorId: OP_B }, DOSAR),
    ).toBe(false);
  });

  it("refuză un operator fără fișă de operator", () => {
    expect(
      poateVedeaDosarul({ rol: "OPERATOR", id: "u", operatorId: null }, DOSAR),
    ).toBe(false);
  });

  /*
   * Regresia pe care botul de review a găsit-o.
   *
   * Garda dinainte verifica NUMELE rolului („dacă e OPERATOR…"), deci
   * accoglienza trecea neatinsă, iar RLS o lăsa să citească rândul ca membru al
   * personalului: numele, telefonul, documentele și istoricul clientului, la un
   * URL ghicit. Accoglienza ține calendarul; în dosare nu intră.
   */
  it("ține accoglienza afară din dosare, deși este personal", () => {
    expect(poate("RECEPTIONIST", "dosare.vezi_tot")).toBe(false);
    expect(poate("RECEPTIONIST", "dosare.vezi_propriu")).toBe(false);

    expect(
      poateVedeaDosarul({ rol: "RECEPTIONIST", id: "u", operatorId: null }, DOSAR),
    ).toBe(false);
    // Nici măcar dacă cineva i-ar atașa din greșeală o fișă de operator.
    expect(
      poateVedeaDosarul({ rol: "RECEPTIONIST", id: "u", operatorId: OP_A }, DOSAR),
    ).toBe(false);
  });

  it("lasă administratorii în orice dosar", () => {
    for (const rol of ["ADMIN", "SUPER_ADMIN"] as const) {
      expect(poateVedeaDosarul({ rol, id: "u", operatorId: null }, DOSAR)).toBe(true);
    }
  });

  it("nu deschide un dosar fără operator atribuit către oricine", () => {
    const orfan = { clientId: CLIENT, operatorId: null };
    expect(
      poateVedeaDosarul({ rol: "OPERATOR", id: "u", operatorId: null }, orfan),
    ).toBe(false);
    expect(
      poateVedeaDosarul({ rol: "OPERATOR", id: "u", operatorId: OP_A }, orfan),
    ).toBe(false);
    expect(poateVedeaDosarul({ rol: "ADMIN", id: "u", operatorId: null }, orfan)).toBe(true);
  });
});
