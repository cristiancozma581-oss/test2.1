import { describe, expect, it } from "vitest";
import {
  erori,
  numeFisierSigur,
  schemaExceptie,
  schemaInregistrare,
  schemaRezervare,
  schemaServiciu,
  schemaSetari,
  telefon,
  validareFisier,
} from "./validare";

const REZERVARE_VALIDA = {
  serviceId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  operatorId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
  inceput: "2026-09-14T07:30:00.000Z",
  nume: "Maria",
  prenume: "Rossi",
  email: "maria.rossi@example.com",
  telefon: "333 47 59 704",
  gdpr: true,
};

describe("schemaRezervare", () => {
  it("acceptă o rezervare completă", () => {
    const r = schemaRezervare.safeParse(REZERVARE_VALIDA);
    expect(r.success).toBe(true);
  });

  it("respinge rezervarea fără consimțământ GDPR — §12", () => {
    for (const gdpr of [undefined, false, "false", null]) {
      const r = schemaRezervare.safeParse({ ...REZERVARE_VALIDA, gdpr });
      expect(r.success).toBe(false);
    }
  });

  it("normalizează e-mailul", () => {
    const r = schemaRezervare.parse({ ...REZERVARE_VALIDA, email: "  MARIA@Example.COM " });
    expect(r.email).toBe("maria@example.com");
  });

  it("respinge identificatorii care nu sunt UUID", () => {
    const r = schemaRezervare.safeParse({ ...REZERVARE_VALIDA, serviceId: "1; drop table" });
    expect(r.success).toBe(false);
  });

  it("pune limba implicită it", () => {
    expect(schemaRezervare.parse(REZERVARE_VALIDA).limba).toBe("it");
  });
});

describe("telefon", () => {
  it("acceptă formate internaționale", () => {
    for (const v of ["+39 011 853273", "0040 722 123 456", "333-47-59-704", "(011) 8532373"]) {
      expect(telefon.safeParse(v).success).toBe(true);
    }
  });

  it("respinge textul și numerele prea scurte", () => {
    for (const v of ["chiamami", "123", "+39 abc def"]) {
      expect(telefon.safeParse(v).success).toBe(false);
    }
  });
});

describe("schemaInregistrare", () => {
  it("cere o parolă lungă, cu literă și cifră", () => {
    const baza = {
      nume: "Ion", prenume: "Popescu", email: "ion@example.com",
      telefon: "333 111 2222", gdpr: true,
    };
    expect(schemaInregistrare.safeParse({ ...baza, parola: "scurta1" }).success).toBe(false);
    expect(schemaInregistrare.safeParse({ ...baza, parola: "numaiLitere" }).success).toBe(false);
    expect(schemaInregistrare.safeParse({ ...baza, parola: "1234567890" }).success).toBe(false);
    expect(schemaInregistrare.safeParse({ ...baza, parola: "parolaBuna7" }).success).toBe(true);
  });
});

describe("schemaServiciu", () => {
  const baza = {
    categoryId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    slug: "spid",
    nume: "SPID",
    durataMinute: "15",
    status: "ACTIVE",
  };

  it("transformă prețul din euro în cenți, fără virgulă mobilă", () => {
    expect(schemaServiciu.parse({ ...baza, pretEuro: "35,50" }).pretEuro).toBe(3550);
    expect(schemaServiciu.parse({ ...baza, pretEuro: "35.5" }).pretEuro).toBe(3550);
    expect(schemaServiciu.parse({ ...baza, pretEuro: "0" }).pretEuro).toBe(0);
  });

  it("deosebește «gratuit» de «preț la evaluare»", () => {
    expect(schemaServiciu.parse({ ...baza, pretEuro: "0" }).pretEuro).toBe(0);
    expect(schemaServiciu.parse({ ...baza, pretEuro: "" }).pretEuro).toBeNull();
    expect(schemaServiciu.parse(baza).pretEuro).toBeNull();
  });

  it("respinge un preț cu prea multe zecimale", () => {
    expect(schemaServiciu.safeParse({ ...baza, pretEuro: "35,555" }).success).toBe(false);
  });

  it("desparte cuvintele-cheie și le normalizează", () => {
    const r = schemaServiciu.parse({ ...baza, cuvinteCheie: " SPID , identita ,, Accesso " });
    expect(r.cuvinteCheie).toEqual(["spid", "identita", "accesso"]);
  });

  it("respinge slug-urile cu spații sau majuscule nevalide", () => {
    expect(schemaServiciu.safeParse({ ...baza, slug: "carta di soggiorno" }).success).toBe(false);
    expect(schemaServiciu.safeParse({ ...baza, slug: "-spid" }).success).toBe(false);
    expect(schemaServiciu.safeParse({ ...baza, slug: "carta-di-soggiorno" }).success).toBe(true);
  });
});

describe("schemaExceptie", () => {
  const baza = { deLa: "2026-08-01", panaLa: "2026-08-20", motiv: "Ferie" };

  it("acceptă un concediu de mai multe zile", () => {
    expect(schemaExceptie.safeParse({ ...baza, tip: "leave" }).success).toBe(true);
  });

  it("respinge o perioadă inversată", () => {
    const r = schemaExceptie.safeParse({ ...baza, deLa: "2026-08-20", panaLa: "2026-08-01", tip: "leave" });
    expect(r.success).toBe(false);
  });

  it("cere orele pentru o deschidere extraordinară", () => {
    expect(schemaExceptie.safeParse({ ...baza, tip: "extra" }).success).toBe(false);
    expect(
      schemaExceptie.safeParse({ ...baza, tip: "extra", oraDeLa: "10:00", oraPanaLa: "13:00" }).success,
    ).toBe(true);
  });

  it("respinge o dată care nu există", () => {
    expect(schemaExceptie.safeParse({ ...baza, deLa: "2026-02-30", tip: "leave" }).success).toBe(false);
  });
});

describe("schemaSetari", () => {
  const baza = {
    numeFirma: "IMMY & EMY", telefon: "333 47 59 704", email: "caf@example.com",
    adresa: "Via Monte Rosa 101/B, Torino", preavizMinute: "120", orizontZile: "60",
    pasMinute: "15", pragAnulareOre: "12", maxUploadMb: "10", retentieLuni: "60",
  };

  it("respinge un fus orar inexistent", () => {
    expect(schemaSetari.safeParse({ ...baza, fusOrar: "Europe/Torino" }).success).toBe(false);
    expect(schemaSetari.safeParse({ ...baza, fusOrar: "Europe/Rome" }).success).toBe(true);
  });
});

describe("validareFisier", () => {
  it("acceptă formatele din §22", () => {
    expect(validareFisier("passaporto.pdf", "application/pdf", 1024, 10).valid).toBe(true);
    expect(validareFisier("foto.JPG", "image/jpeg", 1024, 10).valid).toBe(true);
  });

  it("respinge un executabil deghizat în PDF", () => {
    const r = validareFisier("virus.exe", "application/pdf", 1024, 10);
    expect(r.valid).toBe(false);
  });

  it("respinge nepotrivirea dintre extensie și tipul MIME", () => {
    const r = validareFisier("document.pdf", "image/png", 1024, 10);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.motiv).toMatch(/non corrisponde/);
  });

  it("respinge fișierele goale și pe cele prea mari", () => {
    expect(validareFisier("a.pdf", "application/pdf", 0, 10).valid).toBe(false);
    expect(validareFisier("a.pdf", "application/pdf", 11 * 1024 * 1024, 10).valid).toBe(false);
    expect(validareFisier("a.pdf", "application/pdf", 9 * 1024 * 1024, 10).valid).toBe(true);
  });
});

describe("numeFisierSigur", () => {
  it("blochează ieșirea din prefixul de storage", () => {
    expect(numeFisierSigur("../../etc/passwd")).not.toContain("..");
    expect(numeFisierSigur("../../etc/passwd")).not.toContain("/");
    expect(numeFisierSigur("..\\..\\windows\\system32")).not.toContain("\\");
  });

  it("păstrează un nume normal aproape neatins", () => {
    expect(numeFisierSigur("Passaporto 2026.pdf")).toBe("Passaporto_2026.pdf");
  });

  it("nu întoarce niciodată un nume gol", () => {
    expect(numeFisierSigur("...")).toBeTruthy();
    expect(numeFisierSigur("")).toBe("documento");
  });

  it("taie numele foarte lungi", () => {
    expect(numeFisierSigur("a".repeat(500) + ".pdf").length).toBeLessThanOrEqual(120);
  });
});

describe("erori", () => {
  it("rezumă erorile pe câmpuri", () => {
    const r = schemaRezervare.safeParse({ ...REZERVARE_VALIDA, email: "nu-e-email", gdpr: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = erori(r.error);
      expect(e.email).toBeTruthy();
      expect(e.gdpr).toBeTruthy();
    }
  });
});
