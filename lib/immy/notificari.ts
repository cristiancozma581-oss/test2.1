import "server-only";

import { clientServiciu } from "./supabase";
import { emailApiKey, emailExpeditor, telegramChatId, telegramToken, urlPublic } from "./env";
import type { Eveniment } from "./tipuri";

/**
 * Notificările (§27-§31, §65, §66).
 *
 * Principiul: notificarea se SCRIE ÎNTOTDEAUNA în bază, apoi se încearcă
 * livrarea pe canalele externe. Dacă e-mailul nu e configurat sau Telegram
 * cade, rândul rămâne — marcat `queued` sau `failed`, vizibil în centrul de
 * notificări. O notificare care dispare pentru că un adaptor nu era pornit este
 * mai rea decât una netrimisă: nimeni nu află că lipsește.
 *
 * Scrierea se face cu cheia de service, pentru că în 0016 nu există politică de
 * insert pe `ie_notifications` — nici clientul, nici personalul nu au voie să-și
 * fabrice notificări.
 */

export type ContextNotificare = Record<string, string | number | null | undefined>;

export type CerereNotificare = {
  eveniment: Eveniment;
  destinatarId?: string | null;
  destinatarEmail?: string | null;
  /** Notificare pentru birou, nu pentru client (§31). */
  catrePersonal?: boolean;
  context?: ContextNotificare;
  entitate?: { tip: string; id: string };
  limba?: string;
};

// --- Șabloanele implicite (§29) ----------------------------------------------
//
// Trăiesc în cod ca rezervă, ca sistemul să funcționeze pe o bază proaspătă.
// Administratorul le poate suprascrie în `ie_notification_templates`, iar
// varianta din bază are întotdeauna prioritate.

type Sablon = { titlu: string; corp: string; severitate: "info" | "success" | "warning" | "urgent" };

const SABLOANE_CLIENT: Record<Eveniment, Sablon> = {
  APPOINTMENT_CREATED: {
    titlu: "Prenotazione ricevuta — {{cod}}",
    corp:
      "Abbiamo ricevuto la tua richiesta per «{{serviciu}}» il {{data}} alle {{ora}}. " +
      "Il tuo codice è {{cod}}. Ti confermiamo l'appuntamento a breve.",
    severitate: "success",
  },
  APPOINTMENT_CONFIRMED: {
    titlu: "Appuntamento confermato — {{cod}}",
    corp: "Il tuo appuntamento per «{{serviciu}}» del {{data}} alle {{ora}} è confermato. Ti aspettiamo!",
    severitate: "success",
  },
  APPOINTMENT_CANCELLED: {
    titlu: "Appuntamento annullato — {{cod}}",
    corp: "L'appuntamento per «{{serviciu}}» del {{data}} alle {{ora}} è stato annullato.",
    severitate: "warning",
  },
  APPOINTMENT_RESCHEDULED: {
    titlu: "Appuntamento spostato — {{cod}}",
    corp: "Il tuo appuntamento per «{{serviciu}}» è stato spostato al {{data}} alle {{ora}}.",
    severitate: "info",
  },
  APPOINTMENT_REMINDER: {
    titlu: "Promemoria: appuntamento {{data}} alle {{ora}}",
    corp:
      "Ti ricordiamo l'appuntamento per «{{serviciu}}» del {{data}} alle {{ora}}. " +
      "Porta con te i documenti richiesti.",
    severitate: "info",
  },
  APPOINTMENT_COMPLETED: {
    titlu: "Appuntamento completato — {{cod}}",
    corp: "Grazie per essere venuto. L'appuntamento per «{{serviciu}}» è stato completato.",
    severitate: "success",
  },
  DOCUMENT_REQUESTED: {
    titlu: "Ti chiediamo un documento: {{document}}",
    corp:
      "Per procedere con la pratica «{{dosar}}» abbiamo bisogno di: {{document}}. " +
      "Puoi caricarlo dalla tua area riservata.",
    severitate: "warning",
  },
  DOCUMENT_UPLOADED: {
    titlu: "Documento caricato: {{document}}",
    corp: "Abbiamo ricevuto «{{document}}». Lo verifichiamo al più presto.",
    severitate: "info",
  },
  DOCUMENT_VERIFIED: {
    titlu: "Documento verificato: {{document}}",
    corp: "Il documento «{{document}}» è stato verificato. Nessuna altra azione richiesta.",
    severitate: "success",
  },
  DOCUMENT_REJECTED: {
    titlu: "Documento da correggere: {{document}}",
    corp: "Il documento «{{document}}» ha bisogno di una correzione. {{observatie}}",
    severitate: "urgent",
  },
  MESSAGE_RECEIVED: {
    titlu: "Nuovo messaggio da {{expeditor}}",
    corp: "{{fragment}}",
    severitate: "info",
  },
  CASE_STATUS_CHANGED: {
    titlu: "Pratica aggiornata: {{dosar}}",
    corp: "Lo stato della pratica «{{dosar}}» è cambiato in «{{status}}».",
    severitate: "info",
  },
  ACCOUNT_WELCOME: {
    titlu: "Benvenuto in IMMY & EMY",
    corp:
      "Il tuo account è attivo. Da qui puoi seguire le tue pratiche, caricare documenti " +
      "e parlare direttamente con il tuo operatore.",
    severitate: "success",
  },
};

const SABLOANE_PERSONAL: Partial<Record<Eveniment, Sablon>> = {
  APPOINTMENT_CREATED: {
    titlu: "NUOVA PRENOTAZIONE — {{cod}}",
    corp: "{{nume}} · {{serviciu}} · {{data}} {{ora}} · {{telefon}} · {{email}}",
    severitate: "info",
  },
  APPOINTMENT_CANCELLED: {
    titlu: "PRENOTAZIONE ANNULLATA — {{cod}}",
    corp: "{{serviciu}} · {{data}} {{ora}}",
    severitate: "warning",
  },
  DOCUMENT_UPLOADED: {
    titlu: "NUOVO DOCUMENTO — {{dosar}}",
    corp: "{{nume}} ha caricato «{{document}}».",
    severitate: "info",
  },
  MESSAGE_RECEIVED: {
    titlu: "NUOVO MESSAGGIO — {{expeditor}}",
    corp: "{{fragment}}",
    severitate: "info",
  },
  CASE_STATUS_CHANGED: {
    titlu: "PRATICA AGGIORNATA — {{dosar}}",
    corp: "Nuovo stato: {{status}}.",
    severitate: "info",
  },
};

/**
 * Înlocuiește `{{cheie}}` cu valorile din context.
 *
 * Substituțiile rămase fără valoare se șterg, nu se lasă vizibile: un client
 * care primește „Ti aspettiamo il {{data}}" vede un sistem stricat.
 */
export function completeaza(sablon: string, context: ContextNotificare = {}): string {
  return sablon
    .replace(/\{\{(\w+)\}\}/g, (_, cheie: string) => {
      const v = context[cheie];
      return v === null || v === undefined ? "" : String(v);
    })
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Legătura pe care o deschide notificarea, în funcție de entitate. */
function linkPentru(entitate?: { tip: string; id: string }): string | null {
  if (!entitate) return null;
  switch (entitate.tip) {
    case "appointment":
      return "/area-cliente/appuntamenti";
    case "case":
      return `/area-cliente/pratiche/${entitate.id}`;
    case "document":
      return "/area-cliente/documenti";
    case "thread":
      return `/area-cliente/messaggi/${entitate.id}`;
    default:
      return null;
  }
}

/**
 * Scrie notificarea și încearcă livrarea externă.
 *
 * Nu aruncă niciodată: o notificare eșuată nu are voie să anuleze programarea
 * pe care tocmai a anunțat-o. Eșecurile ajung în coloanele de status și în
 * logurile serverului.
 */
export async function trimiteNotificare(cerere: CerereNotificare): Promise<void> {
  const sb = clientServiciu();
  if (!sb) return;

  const catrePersonal = Boolean(cerere.catrePersonal);
  const implicit = catrePersonal
    ? (SABLOANE_PERSONAL[cerere.eveniment] ?? SABLOANE_CLIENT[cerere.eveniment])
    : SABLOANE_CLIENT[cerere.eveniment];

  if (!implicit) return;

  // Șablonul din bază bate rezerva din cod (§29).
  let titlu = implicit.titlu;
  let corp = implicit.corp;
  try {
    const { data } = await sb
      .from("ie_notification_templates")
      .select("subject, body")
      .eq("event", cerere.eveniment)
      .eq("channel", "inapp")
      .eq("locale", cerere.limba ?? "it")
      .eq("is_active", true)
      .maybeSingle();
    if (data) {
      titlu = data.subject ?? titlu;
      corp = data.body;
    }
  } catch {
    // Fără șablon personalizat rămâne cel din cod; nu e motiv să oprim livrarea.
  }

  const titluFinal = completeaza(titlu, cerere.context);
  const corpFinal = completeaza(corp, cerere.context);
  const link = linkPentru(cerere.entitate);

  const emailPosibil = Boolean(cerere.destinatarEmail && emailApiKey());
  const telegramPosibil = catrePersonal && Boolean(telegramToken() && telegramChatId());

  const { data: rand } = await sb
    .from("ie_notifications")
    .insert({
      recipient_id: catrePersonal ? null : (cerere.destinatarId ?? null),
      recipient_email: cerere.destinatarEmail ?? null,
      audience: catrePersonal ? "staff" : "client",
      event: cerere.eveniment,
      title: titluFinal,
      body: corpFinal,
      link,
      severity: implicit.severitate,
      entity_type: cerere.entitate?.tip ?? null,
      entity_id: cerere.entitate?.id ?? null,
      email_status: emailPosibil ? "queued" : "skipped",
      telegram_status: telegramPosibil ? "queued" : "skipped",
    })
    .select("id")
    .single();

  if (!rand) return;

  const livrari: Promise<{ canal: "email" | "telegram"; ok: boolean; eroare?: string }>[] = [];

  if (emailPosibil) {
    livrari.push(
      trimiteEmail(cerere.destinatarEmail as string, titluFinal, corpFinal, link)
        .then(() => ({ canal: "email" as const, ok: true }))
        .catch((e) => ({ canal: "email" as const, ok: false, eroare: String(e) })),
    );
  }
  if (telegramPosibil) {
    livrari.push(
      trimiteTelegram(`${titluFinal}\n\n${corpFinal}`)
        .then(() => ({ canal: "telegram" as const, ok: true }))
        .catch((e) => ({ canal: "telegram" as const, ok: false, eroare: String(e) })),
    );
  }

  if (livrari.length === 0) return;

  const rezultate = await Promise.all(livrari);
  const actualizare: Record<string, string> = {};
  const erori: string[] = [];

  for (const r of rezultate) {
    actualizare[`${r.canal}_status`] = r.ok ? "sent" : "failed";
    if (!r.ok && r.eroare) erori.push(`${r.canal}: ${r.eroare}`);
  }
  if (erori.length > 0) actualizare.delivery_error = erori.join(" | ").slice(0, 1000);

  await sb.from("ie_notifications").update(actualizare).eq("id", rand.id);
}

// --- Adaptoare de canal ------------------------------------------------------

/**
 * E-mail prin Resend (§29).
 *
 * Adaptorul este deliberat subțire și fără SDK: o singură cerere HTTP, ușor de
 * înlocuit cu alt furnizor schimbând acest bloc.
 */
async function trimiteEmail(
  catre: string,
  subiect: string,
  corp: string,
  link: string | null,
): Promise<void> {
  const cheie = emailApiKey();
  if (!cheie) throw new Error("EMAIL_API_KEY lipsește.");

  const url = link ? `${urlPublic()}${link}` : urlPublic();
  const html = `<!doctype html><html lang="it"><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#132018;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(subiect)}</h1>
<p style="margin:0 0 20px;color:#54655c">${escapeHtml(corp)}</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#00b34a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Apri l'area riservata</a></p>
<hr style="border:none;border-top:1px solid #dfeee4;margin:24px 0">
<p style="font-size:12px;color:#54655c;margin:0">IMMY &amp; EMY · Via Monte Rosa 101/B, 10154 Torino · 333 47 59 704</p>
</body></html>`;

  const raspuns = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cheie}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailExpeditor(),
      to: [catre],
      subject: subiect,
      text: `${corp}\n\n${url}`,
      html,
    }),
  });

  if (!raspuns.ok) {
    throw new Error(`Resend ${raspuns.status}: ${(await raspuns.text()).slice(0, 200)}`);
  }
}

/** Telegram pentru administratori (§31). */
async function trimiteTelegram(mesaj: string): Promise<void> {
  const token = telegramToken();
  const chat = telegramChatId();
  if (!token || !chat) throw new Error("Configurarea Telegram lipsește.");

  const raspuns = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat,
      text: mesaj,
      disable_web_page_preview: true,
    }),
  });

  if (!raspuns.ok) {
    throw new Error(`Telegram ${raspuns.status}: ${(await raspuns.text()).slice(0, 200)}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
