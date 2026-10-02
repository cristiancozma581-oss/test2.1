import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { BannerNeconfigurat } from "@/components/immy/stari";
import { CautareServicii } from "@/components/immy/cautare-servicii";
import { Asistent } from "@/components/immy/asistent";
import { categorii, servicii } from "@/lib/immy/dal/catalog";
import { setari, texte } from "@/lib/immy/dal/setari";
import { supabaseConfigurat } from "@/lib/immy/env";

export const metadata: Metadata = {
  title: "IMMY & EMY — Pratiche per immigrati e CAF a Torino",
  description:
    "Cittadinanza, permesso di soggiorno, SPID, 730, Naspi e assegno unico. " +
    "Prenota online il tuo appuntamento in Via Monte Rosa 101/B, Torino.",
  alternates: { canonical: "/" },
};

export default async function Acasa() {
  const [s, t, listaCategorii, listaServicii] = await Promise.all([
    setari(),
    texte(),
    categorii(),
    servicii(),
  ]);

  return (
    <>
      {/* ---------- HERO (§5) ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#d7f06c] via-[#3fb15f] to-[#045c33] text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#eafce0]">
                <span aria-hidden="true" className="h-px w-5 bg-[#eafce0]" />
                {t("hero.eyebrow", "CAF · Pratiche per immigrati · Torino")}
              </span>

              <h1 className="mt-4 font-serif text-4xl leading-[1.05] font-semibold text-white md:text-[3.4rem]">
                {t("hero.title", "La tua pratica, senza pensieri.")}
              </h1>

              <p className="mt-5 max-w-lg text-base text-white/90 md:text-lg">
                {t(
                  "hero.subtitle",
                  "Assistenza fiscale, previdenziale e servizi per immigrati, con prenotazione online e assistenza diretta.",
                )}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-white px-7 text-[#045c33] hover:bg-[#e7f8ee]"
                >
                  <Link href="/prenota">{t("hero.cta_primary", "Prenota ora")}</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/60 bg-transparent px-7 text-white hover:bg-white/12"
                >
                  <Link href="/servizi">{t("hero.cta_secondary", "Scopri i servizi")}</Link>
                </Button>
              </div>

              <ul className="mt-9 space-y-2 text-sm font-medium text-white/95">
                <li>📍 {s.adresa}</li>
                <li>
                  📞 {s.telefon}
                  {s.telefonSecundar ? ` · ☎️ ${s.telefonSecundar}` : null}
                </li>
                <li>✉️ {s.email}</li>
              </ul>
            </div>

            <div aria-hidden="true" className="hidden md:block">
              <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[340px] drop-shadow-2xl">
                <defs>
                  <radialGradient id="lucire" cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="55%" stopColor="#dff2c9" />
                    <stop offset="100%" stopColor="#7cc24a" />
                  </radialGradient>
                </defs>
                <circle cx="150" cy="150" r="140" fill="url(#lucire)" />
                <path d="M40 110c30 20 55-15 85 5s65-8 110 15" stroke="#0a6b3a" strokeWidth="10" fill="none" opacity="0.55" />
                <path d="M25 165c35 15 60-18 95 0s60 12 120-8" stroke="#0a6b3a" strokeWidth="10" fill="none" opacity="0.5" />
                <path d="M55 210c30 12 55-10 85 3s55 6 95-10" stroke="#0a6b3a" strokeWidth="9" fill="none" opacity="0.45" />
                <circle cx="150" cy="150" r="140" fill="none" stroke="#045c33" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CĂUTARE ȘI CATALOG (§6, §7) ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        {!supabaseConfigurat() ? (
          <div className="mb-8">
            <BannerNeconfigurat />
          </div>
        ) : null}

        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl font-semibold">Di cosa hai bisogno?</h2>
          <p className="mt-3 text-muted-foreground">
            Cerca il servizio che ti serve o sfoglia le categorie. Su ogni servizio trovi
            durata, documenti necessari e il pulsante per prenotare.
          </p>
        </div>

        <div className="mt-7">
          <CautareServicii
            servicii={listaServicii}
            categorii={listaCategorii}
            placeholder={t(
              "search.placeholder",
              "Cerca un servizio — es. SPID, cittadinanza, permesso di soggiorno…",
            )}
          />
        </div>
      </section>

      {/* ---------- CUM FUNCȚIONEAZĂ ---------- */}
      <section className="border-y border-border bg-surface-muted/50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-serif text-3xl font-semibold">Come funziona</h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-4">
            {[
              ["Scegli il servizio", "Trova la pratica che ti serve e leggi quali documenti servono."],
              ["Prenota online", "Scegli operatore, giorno e ora fra quelli liberi. Ricevi subito il codice."],
              ["Vieni in sede", "Ti aspettiamo all'orario scelto. Nessuna fila, nessuna attesa."],
              ["Segui la pratica", "Dall'area riservata vedi lo stato, carichi documenti e ci scrivi."],
            ].map(([titlu, corp], i) => (
              <li key={titlu} className="rounded-xl border border-border bg-surface p-6">
                <span className="font-serif text-3xl font-semibold text-primary">{i + 1}</span>
                <h3 className="mt-3 text-base font-semibold">{titlu}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{corp}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- ORAR ȘI SEDIU ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl bg-foreground p-8 text-background">
            <h2 className="font-serif text-xl font-semibold text-background">Orario di apertura</h2>
            <dl className="mt-5 divide-y divide-white/12 text-sm">
              {[
                ["Lunedì – Venerdì", "9:30–13:00 · 15:00–18:00"],
                ["Sabato", "Chiuso"],
                ["Domenica", "Chiuso"],
              ].map(([zi, ore]) => (
                <div key={zi} className="flex justify-between py-3">
                  <dt>{zi}</dt>
                  <dd className="font-semibold text-accent">{ore}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-surface p-8">
            <h2 className="font-serif text-xl font-semibold">Dove siamo</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.adresa}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=17/${s.lat}/${s.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apri la mappa
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/contatti">Indicazioni stradali</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-[#0f8a45] to-[#045c33] px-8 py-14 text-center text-white">
          <h2 className="font-serif text-3xl font-semibold text-white">
            {t("cta.title", "Hai bisogno di assistenza?")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            {t("cta.body", "Scegli il servizio che ti serve e prenota il tuo appuntamento in pochi click.")}
          </p>
          <Button
            asChild
            size="lg"
            className="mt-7 rounded-full bg-white px-8 text-[#045c33] hover:bg-[#e7f8ee]"
          >
            <Link href="/prenota">Prenota appuntamento</Link>
          </Button>
        </div>
      </section>

      {s.asistentActiv ? <Asistent /> : null}
    </>
  );
}
