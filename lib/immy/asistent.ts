import "server-only";

import { clientPublic, clientServiciu } from "./supabase";
import { cheieAi, modelAi } from "./env";

/**
 * Asistentul (§44-§46).
 *
 * Funcționează în două trepte, iar prima nu cere nicio cheie:
 *
 *   1. REGĂSIRE. Caută în baza de cunoștințe, în FAQ și în catalogul de
 *      servicii, apoi răspunde cu ce a găsit. Fără API extern, fără cost, fără
 *      posibilitatea de a inventa: textul întors este chiar textul scris de
 *      birou.
 *   2. FORMULARE, dacă există `ANTHROPIC_API_KEY`. Aceleași fragmente sunt date
 *      unui model, care le leagă într-un răspuns în limba clientului. Modelul
 *      primește instrucțiunea de a NU adăuga nimic peste ele.
 *
 * Fără cheie asistentul rămâne util, doar mai sec. Asta contează: un birou care
 * n-a configurat încă nimic nu trebuie să aibă pe pagină o casetă moartă.
 *
 * Limita din §44 este ținută în ambele trepte: asistentul nu dă consultanță
 * juridică definitivă și, când întrebarea îl depășește, trimite la operator.
 */

export type FragmentGasit = {
  tip: "articol" | "faq" | "serviciu";
  titlu: string;
  text: string;
  link?: string;
};

export type RaspunsAsistent = {
  raspuns: string;
  surse: FragmentGasit[];
  serviciiSugerate: { slug: string; nume: string; durataMinute: number }[];
  /** Când e adevărat, interfața arată butoanele „Prenota" și „Scrivici" (§46). */
  predaLaOperator: boolean;
};

const REFUZ =
  "Su questa domanda preferisco non darti una risposta approssimativa: " +
  "ogni situazione ha i suoi dettagli e una risposta sbagliata ti farebbe perdere tempo. " +
  "Parlane con un nostro operatore, che può guardare il tuo caso concreto.";

const DISCLAIMER =
  "Questa è un'informazione generale, non una consulenza legale definitiva.";

/**
 * Caută în cele trei surse.
 *
 * Interogarea se pregătește pentru `websearch`-ul Postgres cu prefixe (`:*`),
 * ca „citta" să prindă „cittadinanza" — omul care scrie într-o casetă de chat
 * nu tastează termenul complet.
 */
async function cauta(intrebare: string): Promise<{
  fragmente: FragmentGasit[];
  servicii: { slug: string; nume: string; durataMinute: number }[];
}> {
  const sb = clientPublic();
  if (!sb) return { fragmente: [], servicii: [] };

  const cuvinte = intrebare
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((c) => c.length > 2)
    .slice(0, 8);

  if (cuvinte.length === 0) return { fragmente: [], servicii: [] };

  const expresie = cuvinte.map((c) => `${c}:*`).join(" | ");

  const [articole, servicii, faq] = await Promise.all([
    sb
      .from("ie_knowledge_base")
      .select("title, body")
      .eq("is_active", true)
      .eq("visibility", "public")
      .textSearch("search_vector", expresie, { config: "public.ie_it" })
      .limit(4),
    sb
      .from("ie_services")
      .select("slug, name, short_description, duration_minutes")
      .eq("status", "ACTIVE")
      .textSearch("search_vector", expresie, { config: "public.ie_it" })
      .limit(5),
    sb
      .from("ie_faq")
      .select("question, answer")
      .eq("is_active", true)
      .limit(60),
  ]);

  const fragmente: FragmentGasit[] = [];

  for (const a of articole.data ?? []) {
    fragmente.push({ tip: "articol", titlu: a.title, text: a.body });
  }

  for (const s of servicii.data ?? []) {
    fragmente.push({
      tip: "serviciu",
      titlu: s.name,
      text: s.short_description ?? "",
      link: `/servizi/${s.slug}`,
    });
  }

  /*
   * FAQ-ul se filtrează în memorie, prin potrivire de cuvinte.
   *
   * Sunt câteva zeci de întrebări: o interogare de text integral în plus ar
   * costa mai mult decât economisește, iar potrivirea simplă prinde și
   * întrebările scurte, unde stemmer-ul nu are pe ce lucra.
   */
  const scor = (t: string) =>
    cuvinte.filter((c) => t.toLowerCase().includes(c)).length;

  const faqPotrivite = (faq.data ?? [])
    .map((f) => ({ f, s: scor(`${f.question} ${f.answer}`) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  for (const { f } of faqPotrivite) {
    fragmente.push({ tip: "faq", titlu: f.question, text: f.answer });
  }

  return {
    fragmente,
    servicii: (servicii.data ?? []).map((s) => ({
      slug: s.slug,
      nume: s.name,
      durataMinute: s.duration_minutes,
    })),
  };
}

/** Răspunsul fără model: fragmentele găsite, puse cap la cap. */
function raspunsDinFragmente(fragmente: FragmentGasit[]): string {
  if (fragmente.length === 0) return REFUZ;

  const parti: string[] = [];
  for (const f of fragmente.slice(0, 3)) {
    parti.push(f.tip === "faq" ? `${f.titlu}\n${f.text}` : f.text || f.titlu);
  }
  return `${parti.filter(Boolean).join("\n\n")}\n\n${DISCLAIMER}`;
}

/** Treapta a doua: modelul leagă fragmentele, fără să adauge fapte noi. */
async function formuleaza(
  intrebare: string,
  fragmente: FragmentGasit[],
): Promise<string | null> {
  const cheie = cheieAi();
  if (!cheie || fragmente.length === 0) return null;

  const context = fragmente
    .map((f, i) => `[${i + 1}] ${f.titlu}\n${f.text}`)
    .join("\n\n");

  const sistem = [
    "Sei l'assistente del centro IMMY & EMY di Torino (CAF e pratiche per immigrati).",
    "Rispondi SOLO con le informazioni contenute nel CONTESTO qui sotto.",
    "Non inventare requisiti, scadenze, importi o tempi che non siano nel contesto.",
    "Non dare consulenza legale definitiva: sei un primo orientamento.",
    "Se il contesto non basta a rispondere, dillo apertamente e invita a parlare con un operatore.",
    "Rispondi in italiano, in modo semplice e diretto, in massimo 120 parole.",
    "Chi legge spesso non è madrelingua: usa frasi brevi e parole comuni.",
  ].join(" ");

  try {
    const raspuns = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": cheie,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelAi(),
        max_tokens: 400,
        system: sistem,
        messages: [
          { role: "user", content: `CONTESTO:\n${context}\n\nDOMANDA: ${intrebare}` },
        ],
      }),
      // Un asistent care se gândește zece secunde este un asistent stricat:
      // sub limită cădem pe răspunsul din fragmente, care e oricum corect.
      signal: AbortSignal.timeout(12_000),
    });

    if (!raspuns.ok) return null;

    const date = (await raspuns.json()) as { content?: { type: string; text?: string }[] };
    const text = date.content?.find((c) => c.type === "text")?.text?.trim();
    return text || null;
  } catch {
    // Rețea căzută, cheie greșită, model indisponibil: treapta întâi rămâne.
    return null;
  }
}

export async function intreabaAsistentul(
  intrebare: string,
  sesiuneCheie: string,
  profileId?: string | null,
): Promise<RaspunsAsistent> {
  const curatata = intrebare.trim().slice(0, 1000);
  if (curatata.length < 2) {
    return {
      raspuns: "Scrivimi la tua domanda e provo ad aiutarti.",
      surse: [],
      serviciiSugerate: [],
      predaLaOperator: false,
    };
  }

  const { fragmente, servicii } = await cauta(curatata);
  const formulat = await formuleaza(curatata, fragmente);
  const raspuns = formulat ?? raspunsDinFragmente(fragmente);

  // Predarea către operator (§46): fie n-am găsit nimic, fie modelul însuși a
  // spus că nu-i ajunge contextul.
  const predaLaOperator =
    fragmente.length === 0 ||
    /operator|sportello|chiama|non (?:ho|posso|riesco)/i.test(raspuns);

  // Jurnalizăm ca să putem completa baza de cunoștințe pornind de la
  // întrebările reale la care n-a știut să răspundă.
  const sb = clientServiciu();
  if (sb) {
    try {
      await sb.from("ie_assistant_messages").insert({
        session_key: sesiuneCheie.slice(0, 100),
        profile_id: profileId ?? null,
        question: curatata,
        answer: raspuns.slice(0, 4000),
        matched_service_id: null,
        handed_off: predaLaOperator,
      });
    } catch {
      // Un asistent care refuză să răspundă pentru că n-a putut scrie în jurnal
      // ar fi cu totul absurd.
    }
  }

  return {
    raspuns,
    surse: fragmente.slice(0, 3),
    serviciiSugerate: servicii.slice(0, 3),
    predaLaOperator,
  };
}
