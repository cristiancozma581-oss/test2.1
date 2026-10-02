/**
 * Contractul de mediu al platformei IMMY & EMY (§61).
 *
 * Niciun secret nu este scris în cod — nici măcar ca „rezervă pentru pilot".
 * Platforma este complet separată de orice alt proiect din depozit: își are
 * propriul proiect Supabase, propriul bucket și propriile chei.
 *
 * Regula de reziliență: paginile publice trebuie să se randeze chiar dacă
 * integrările lipsesc. De aceea funcțiile întorc `null` în loc să arunce, iar
 * apelantul decide ce afișează când o integrare nu e configurată.
 */

function citeste(...nume: string[]): string | null {
  for (const n of nume) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return null;
}

// --- Supabase ----------------------------------------------------------------

export function urlSupabase(): string | null {
  return citeste("IMMY_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
}

/** Cheia publicabilă (anon). Ajunge inevitabil în browser; datele sunt apărate de RLS. */
export function cheiePublica(): string | null {
  return citeste(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

/**
 * Cheia de service. Ocolește RLS, deci NU trebuie să ajungă niciodată în
 * browser: fișierele care o citesc sunt marcate `server-only`.
 */
export function cheieService(): string | null {
  return citeste("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
}

export function supabaseConfigurat(): boolean {
  return Boolean(urlSupabase() && cheiePublica());
}

// --- Storage (§62) -----------------------------------------------------------

export const BUCKET_DOCUMENTE = process.env.IMMY_STORAGE_BUCKET?.trim() || "ie-documenti";

/**
 * Durata de viață a unui link semnat, în secunde.
 *
 * Scurtă intenționat: linkul este o cheie temporară către un document personal,
 * iar adresele ajung în istoricul browserului, în loguri de proxy și în
 * capturile de ecran trimise pe chat.
 */
export const DURATA_LINK_SEMNAT_SEC = Number(process.env.IMMY_SIGNED_URL_TTL ?? 120);

// --- Integrări (§29-§31, §43, §44) -------------------------------------------
//
// Fiecare adaptor își verifică singur configurarea. Lipsa unei chei nu este o
// eroare: înseamnă că acel canal e închis, iar notificarea rămâne vizibilă în
// aplicație, marcată ca netrimisă — nu dispare tăcut.

export const emailApiKey = () => citeste("EMAIL_API_KEY", "RESEND_API_KEY");
export const emailExpeditor = () =>
  citeste("EMAIL_FROM") ?? "IMMY & EMY <noreply@immyemy.it>";

export const telegramToken = () => citeste("TELEGRAM_BOT_TOKEN");
export const telegramChatId = () => citeste("TELEGRAM_CHAT_ID");

export const whatsappToken = () => citeste("WHATSAPP_API_TOKEN");
export const whatsappPhoneId = () => citeste("WHATSAPP_PHONE_NUMBER_ID");

export const cheieAi = () => citeste("ANTHROPIC_API_KEY", "OPENAI_API_KEY");
export const modelAi = () =>
  citeste("IMMY_AI_MODEL") ?? "claude-sonnet-5";

export const stripeSecret = () => citeste("STRIPE_SECRET_KEY");
export const paypalSecret = () => citeste("PAYPAL_SECRET");

/**
 * Secretul care protejează endpointul de remindere (§28).
 *
 * Fără el ruta refuză orice cerere: un endpoint care trimite mesaje către
 * clienți nu are voie să fie deschis pentru că nimeni nu a apucat să-l
 * configureze.
 */
export const secretCron = () => citeste("IMMY_CRON_SECRET");

/**
 * Cât de larg caută endpointul de remindere, în minute.
 *
 * Trebuie să fie egală cu intervalul dintre rulări. La un cron orar, fereastra
 * este de 60 de minute și fiecare programare este văzută exact o dată. La un
 * cron zilnic (singurul permis pe planul Hobby al Vercel), fereastra trebuie
 * să fie 1440, altfel fiecare rulare ar vedea doar o felie de o oră din zi și
 * ar rata restul programărilor.
 */
export const fereastraCronMinute = () =>
  Math.max(5, Number(process.env.IMMY_CRON_WINDOW_MINUTES ?? 60));

/** Adresa publică a sitului, pentru linkurile din e-mailuri și pentru SEO. */
export function urlPublic(): string {
  const explicit = citeste("IMMY_SITE_URL", "NEXT_PUBLIC_SITE_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = citeste("VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
