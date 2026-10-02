import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { FormularSetari } from "@/components/immy/formular-setari";
import { setari } from "@/lib/immy/dal/setari";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";
import {
  cheieAi,
  emailApiKey,
  secretCron,
  stripeSecret,
  telegramToken,
  whatsappToken,
} from "@/lib/immy/env";

export const metadata: Metadata = {
  title: "Impostazioni",
  robots: { index: false, follow: false },
};

/**
 * Setările platformei (§64) și starea integrărilor (§61).
 *
 * Panoul de integrări arată DOAR dacă o cheie este prezentă, niciodată
 * valoarea ei — nici parțial. O cheie afișată pe jumătate tot este o cheie
 * scursă într-o captură de ecran.
 */
export default async function PaginaSetari() {
  await cerutAdmin();
  const s = await setari();

  const integrari = [
    { nume: "Email (Resend)", cheie: "EMAIL_API_KEY", activ: Boolean(emailApiKey()),
      efect: "Conferme, promemoria e notifiche via email." },
    { nume: "Telegram", cheie: "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID", activ: Boolean(telegramToken()),
      efect: "Avvisi immediati all'ufficio per prenotazioni e documenti." },
    { nume: "WhatsApp Business", cheie: "WHATSAPP_API_TOKEN", activ: Boolean(whatsappToken()),
      efect: "Predisposto: l'adattatore è pronto, il canale si attiva con le chiavi." },
    { nume: "Assistente AI", cheie: "ANTHROPIC_API_KEY", activ: Boolean(cheieAi()),
      efect: "Senza chiave l'assistente risponde comunque, citando la base di conoscenza." },
    { nume: "Pagamenti (Stripe)", cheie: "STRIPE_SECRET_KEY", activ: Boolean(stripeSecret()),
      efect: "Predisposto: i pagamenti online restano disattivati finché non li abiliti." },
    { nume: "Promemoria automatici", cheie: "IMMY_CRON_SECRET", activ: Boolean(secretCron()),
      efect: "Senza questo segreto l'endpoint dei promemoria rifiuta ogni chiamata." },
  ];

  return (
    <>
      <AntetPagina
        titlu="Impostazioni"
        descriere="Dati dell'ufficio, regole di prenotazione e stato delle integrazioni."
      />

      <div className="max-w-3xl space-y-7 px-5 py-6 lg:px-8">
        <FormularSetari setari={s} />

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-serif text-lg font-semibold">Integrazioni</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Le chiavi vivono solo nelle variabili d&apos;ambiente, mai nel database e mai nel
            codice. Qui vedi soltanto se sono presenti.
          </p>

          <ul className="mt-4 space-y-2.5">
            {integrari.map((i) => (
              <li
                key={i.nume}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4"
              >
                <div>
                  <p className="font-medium">{i.nume}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{i.cheie}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{i.efect}</p>
                </div>
                <span
                  className={
                    i.activ
                      ? "shrink-0 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success"
                      : "shrink-0 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {i.activ ? "Configurata" : "Non configurata"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
