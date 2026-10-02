/**
 * Schemele de validare (§54).
 *
 * Aceleași scheme rulează în browser (feedback imediat) și pe server (decizia
 * care contează). Un formular trimis direct prin `curl`, ocolind interfața,
 * întâlnește exact aceleași reguli — validarea de client este comoditate,
 * validarea de server este apărare.
 */

import { z } from "zod";
import { EXTENSII_ACCEPTATE, LIMBI, TIPURI_FISIER } from "./tipuri";

// --- Cărămizi reutilizabile --------------------------------------------------

/** Text obligatoriu, curățat de spații, cu limită superioară. */
const text = (min: number, max: number, camp: string) =>
  z
    .string()
    .trim()
    .min(min, `${camp}: sono richiesti almeno ${min} caratteri.`)
    .max(max, `${camp}: massimo ${max} caratteri.`);

const textOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Massimo ${max} caratteri.`)
    .optional()
    .transform((v) => (v ? v : undefined));

/*
 * E-mailul se CURĂȚĂ înainte de a fi validat, nu după.
 *
 * În Zod 4, `.trim()` pus după `z.email()` este o transformare aplicată
 * rezultatului, deci „ Maria@Example.com " ar cădea la validare din cauza
 * spațiilor — exact adresa pe care omul tocmai a lipit-o din alt câmp.
 * `pipe` inversează ordinea: întâi normalizăm, apoi verificăm.
 */
export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Indirizzo email troppo lungo.")
  .pipe(z.email("Indirizzo email non valido."));

/**
 * Numărul de telefon.
 *
 * Nu impunem prefixul italian: clienții au numere din toată lumea, iar un
 * validator prea strict ar respinge exact persoanele pe care biroul le
 * servește. Cerem doar să rămână cifre suficiente după curățare.
 */
export const telefon = z
  .string()
  .trim()
  .min(6, "Numero di telefono troppo corto.")
  .max(32, "Numero di telefono troppo lungo.")
  .refine(
    (v) => (v.match(/\d/g) ?? []).length >= 6,
    "Il numero di telefono deve contenere almeno 6 cifre.",
  )
  .refine(
    (v) => /^[+()\s\d./-]+$/.test(v),
    "Il numero di telefono contiene caratteri non ammessi.",
  );

export const uuid = z.uuid("Identificatore non valido.");

export const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida.")
  .refine((v) => {
    const [a, l, zi] = v.split("-").map(Number);
    const d = new Date(Date.UTC(a, l - 1, zi));
    return d.getUTCFullYear() === a && d.getUTCMonth() === l - 1 && d.getUTCDate() === zi;
  }, "Questa data non esiste.");

export const limba = z.enum(LIMBI);

/**
 * Parola.
 *
 * Lungimea este cerința principală: o frază lungă bate o parolă scurtă cu
 * simboluri, iar regulile baroce împing oamenii spre „Parola1!" peste tot.
 * Cerem totuși o literă și o cifră, ca minim.
 */
export const parola = z
  .string()
  .min(10, "La password deve avere almeno 10 caratteri.")
  .max(128, "La password è troppo lunga.")
  .refine((v) => /[a-zA-Z]/.test(v), "La password deve contenere almeno una lettera.")
  .refine((v) => /\d/.test(v), "La password deve contenere almeno un numero.");

// --- Rezervare (§12) ---------------------------------------------------------

export const schemaRezervare = z.object({
  serviceId: uuid,
  operatorId: uuid,
  /** Momentul de început, în ISO 8601, exact cum l-a propus motorul de sloturi. */
  inceput: z.iso.datetime({ offset: true }).or(z.iso.datetime()),
  nume: text(2, 80, "Nome"),
  prenume: text(2, 80, "Cognome"),
  email,
  telefon,
  limba: limba.default("it"),
  note: textOptional(1000),
  /**
   * Consimțământul GDPR (§12, §49). `literal(true)` nu este cosmetică: o bifă
   * absentă dintr-un `FormData` ajunge `undefined`, iar un `boolean` obișnuit
   * ar trece-o ca „false" fără să se plângă.
   */
  gdpr: z.literal(true, {
    error: "Per proseguire è necessario accettare l'informativa sulla privacy.",
  }),
});
export type DateRezervare = z.infer<typeof schemaRezervare>;

export const schemaAnulare = z.object({
  appointmentId: uuid,
  motiv: textOptional(500),
});

export const schemaReprogramare = z.object({
  appointmentId: uuid,
  inceput: z.iso.datetime({ offset: true }).or(z.iso.datetime()),
  operatorId: uuid.optional(),
});

// --- Autentificare -----------------------------------------------------------

export const schemaLogin = z.object({
  email,
  parola: z.string().min(1, "Inserisci la password."),
});

export const schemaInregistrare = z.object({
  nume: text(2, 80, "Nome"),
  prenume: text(2, 80, "Cognome"),
  email,
  telefon,
  parola,
  limba: limba.default("it"),
  gdpr: z.literal(true, {
    error: "Per creare l'account è necessario accettare l'informativa sulla privacy.",
  }),
});

export const schemaEmailSingur = z.object({ email });

export const schemaParolaNoua = z
  .object({ parola, confirmare: z.string() })
  .refine((d) => d.parola === d.confirmare, {
    error: "Le due password non coincidono.",
    path: ["confirmare"],
  });

// --- Catalog (admin) ---------------------------------------------------------

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Lo slug può contenere solo lettere minuscole, numeri e trattini.",
  );

const culoare = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colore non valido.");

export const schemaServiciu = z.object({
  id: uuid.optional(),
  categoryId: uuid,
  slug,
  nume: text(2, 160, "Nome"),
  descriereScurta: textOptional(300),
  descriere: textOptional(5000),
  cuvinteCheie: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) =>
      v ? v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) : [],
    ),
  durataMinute: z.coerce.number().int().min(5).max(480),
  // Prețul se introduce în euro, dar se stochează în cenți: nicio sumă nu
  // ajunge în bază ca număr cu virgulă mobilă.
  pretEuro: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(",", ".") : ""))
    .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), "Prezzo non valido.")
    .transform((v) => (v === "" ? null : Math.round(Number(v) * 100))),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"]),
  rezervabilOnline: z.coerce.boolean().default(true),
  cereDocumente: z.coerce.boolean().default(false),
  ordine: z.coerce.number().int().min(0).max(9999).default(0),
  operatori: z.array(uuid).default([]),
});

export const schemaCategorie = z.object({
  id: uuid.optional(),
  slug,
  nume: text(2, 120, "Nome"),
  descriere: textOptional(500),
  culoare: culoare.default("#0a6b3a"),
  ordine: z.coerce.number().int().min(0).max(9999).default(0),
  activa: z.coerce.boolean().default(true),
});

export const schemaOperator = z.object({
  id: uuid.optional(),
  numeAfisat: text(2, 80, "Nome"),
  slug,
  titlu: textOptional(160),
  email: email.optional().or(z.literal("").transform(() => undefined)),
  telefon: telefon.optional().or(z.literal("").transform(() => undefined)),
  culoare: culoare.default("#00b34a"),
  activ: z.coerce.boolean().default(true),
  servicii: z.array(uuid).default([]),
});

// --- Disponibilitate (§16) ---------------------------------------------------

const ora = z.string().regex(/^\d{2}:\d{2}$/, "Ora non valida.");

export const schemaRegulaProgram = z
  .object({
    operatorId: uuid,
    ziuaSaptamanii: z.coerce.number().int().min(0).max(6),
    deLa: ora,
    panaLa: ora,
    tip: z.enum(["work", "break"]).default("work"),
  })
  .refine((d) => d.panaLa > d.deLa, {
    error: "L'ora di fine deve essere successiva a quella di inizio.",
    path: ["panaLa"],
  });

export const schemaExceptie = z
  .object({
    operatorId: uuid.nullable().default(null),
    deLa: dataIso,
    panaLa: dataIso,
    tip: z.enum(["closed", "holiday", "leave", "extra"]),
    oraDeLa: ora.optional().or(z.literal("").transform(() => undefined)),
    oraPanaLa: ora.optional().or(z.literal("").transform(() => undefined)),
    motiv: textOptional(300),
  })
  .refine((d) => d.panaLa >= d.deLa, {
    error: "La data di fine non può precedere quella di inizio.",
    path: ["panaLa"],
  })
  .refine((d) => d.tip !== "extra" || (d.oraDeLa && d.oraPanaLa), {
    error: "Per un'apertura straordinaria servono l'ora di inizio e quella di fine.",
    path: ["oraDeLa"],
  })
  .refine((d) => !d.oraDeLa || !d.oraPanaLa || d.oraPanaLa > d.oraDeLa, {
    error: "L'ora di fine deve essere successiva a quella di inizio.",
    path: ["oraPanaLa"],
  });

// --- Dosare, documente, mesaje ----------------------------------------------

export const schemaDosar = z.object({
  id: uuid.optional(),
  clientId: uuid,
  serviceId: uuid,
  operatorId: uuid.nullable().optional(),
  titlu: text(2, 200, "Titolo"),
  termen: dataIso.optional().or(z.literal("").transform(() => undefined)),
  prioritate: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  note: textOptional(2000),
});

export const schemaStatusDosar = z.object({
  caseId: uuid,
  status: z.enum([
    "NEW", "IN_PROGRESS", "WAITING_DOCUMENTS", "DOCUMENTS_RECEIVED",
    "UNDER_REVIEW", "READY", "COMPLETED", "CLOSED", "CANCELLED",
  ]),
  nota: textOptional(1000),
});

export const schemaCerereDocument = z.object({
  caseId: uuid,
  eticheta: text(2, 200, "Nome del documento"),
  observatie: textOptional(500),
});

export const schemaVerificareDocument = z.object({
  documentId: uuid,
  status: z.enum(["UNDER_REVIEW", "VERIFIED", "REJECTED", "NEEDS_CORRECTION"]),
  observatie: textOptional(1000),
});

export const schemaMesaj = z.object({
  threadId: uuid,
  corp: text(1, 5000, "Messaggio"),
});

export const schemaFirNou = z.object({
  caseId: uuid.optional(),
  subiect: text(2, 200, "Oggetto"),
  corp: text(1, 5000, "Messaggio"),
});

// --- FAQ, CMS, cunoștințe ----------------------------------------------------

export const schemaFaq = z.object({
  id: uuid.optional(),
  intrebare: text(5, 300, "Domanda"),
  raspuns: text(5, 5000, "Risposta"),
  serviceId: uuid.nullable().optional(),
  ordine: z.coerce.number().int().min(0).max(9999).default(0),
  activa: z.coerce.boolean().default(true),
});

export const schemaArticolCunostinte = z.object({
  id: uuid.optional(),
  titlu: text(3, 200, "Titolo"),
  corp: text(10, 20000, "Contenuto"),
  cuvinteCheie: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) =>
      v ? v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) : [],
    ),
  serviceId: uuid.nullable().optional(),
  vizibilitate: z.enum(["public", "internal"]).default("public"),
  activ: z.coerce.boolean().default(true),
});

export const schemaContinutSite = z.object({
  cheie: z.string().trim().min(2).max(120),
  limba,
  valoare: z.string().trim().max(5000),
});

// --- Setări (§64) ------------------------------------------------------------

export const schemaSetari = z.object({
  numeFirma: text(2, 120, "Nome"),
  slogan: textOptional(200),
  telefon,
  telefonSecundar: textOptional(32),
  whatsapp: textOptional(32),
  email,
  adresa: text(5, 300, "Indirizzo"),
  fusOrar: z
    .string()
    .trim()
    .refine((v) => {
      // Un fus invalid ar rupe tăcut tot calendarul; îl încercăm pe loc.
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Fuso orario non riconosciuto."),
  preavizMinute: z.coerce.number().int().min(0).max(20160),
  orizontZile: z.coerce.number().int().min(1).max(365),
  pasMinute: z.coerce.number().int().min(5).max(120),
  pragAnulareOre: z.coerce.number().int().min(0).max(168),
  maxUploadMb: z.coerce.number().int().min(1).max(100),
  retentieLuni: z.coerce.number().int().min(1).max(240),
  platiOnline: z.coerce.boolean().default(false),
  asistentActiv: z.coerce.boolean().default(true),
});

// --- Fișiere (§22, §50) ------------------------------------------------------

/**
 * Validarea unui fișier încărcat.
 *
 * Se verifică extensia ȘI tipul MIME, iar cele două trebuie să se potrivească
 * între ele: un `.pdf` anunțat ca `image/png` este respins. Ambele valori vin
 * de la client, deci niciuna nu este de încredere singură — dar contradicția
 * dintre ele este un semnal bun.
 */
export function validareFisier(
  nume: string,
  tip: string,
  marime: number,
  maxMb: number,
): { valid: true } | { valid: false; motiv: string } {
  const ext = nume.split(".").pop()?.toLowerCase() ?? "";

  if (!EXTENSII_ACCEPTATE.includes(ext)) {
    return {
      valid: false,
      motiv: `Formato non ammesso. Accettiamo: ${EXTENSII_ACCEPTATE.join(", ").toUpperCase()}.`,
    };
  }
  if (!TIPURI_FISIER[ext].includes(tip)) {
    return { valid: false, motiv: "Il tipo del file non corrisponde alla sua estensione." };
  }
  if (marime <= 0) {
    return { valid: false, motiv: "Il file è vuoto." };
  }
  if (marime > maxMb * 1024 * 1024) {
    return { valid: false, motiv: `Il file supera il limite di ${maxMb} MB.` };
  }
  return { valid: true };
}

/**
 * Caractere de control (U+0000–U+001F și U+007F).
 *
 * Scrise ca escape într-un `new RegExp`, nu ca literali în sursă: un octet de
 * control invizibil în cod este exact felul de detaliu pe care nimeni nu-l vede
 * la o revizuire.
 */
const CARACTERE_CONTROL = new RegExp("[\\u0000-\\u001f\\u007f]", "g");

/**
 * Curăță numele unui fișier înainte de a-l folosi ca nume de obiect în storage.
 *
 * Scoate căile („../"), separatorii și caracterele de control, ca un nume ales
 * de client să nu poată ieși din prefixul lui în bucket.
 */
export function numeFisierSigur(nume: string): string {
  const curat = nume
    .replace(CARACTERE_CONTROL, "")
    .replace(/[\\/]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/[^\w.\- ]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, 120);
  return curat || "documento";
}

/** Rezumă erorile Zod într-o hartă câmp → primul mesaj. */
export function erori(e: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of e.issues) {
    const cheie = issue.path.join(".") || "_";
    if (!out[cheie]) out[cheie] = issue.message;
  }
  return out;
}
