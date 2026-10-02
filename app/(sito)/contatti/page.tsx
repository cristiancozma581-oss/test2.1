import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { setari } from "@/lib/immy/dal/setari";
import { urlPublic } from "@/lib/immy/env";

export const metadata: Metadata = {
  title: "Contatti e sede",
  description:
    "IMMY & EMY — Via Monte Rosa 101/B, 10154 Torino. Telefono 333 47 59 704. " +
    "Aperto lunedì–venerdì 9:30–13:00 e 15:00–18:00.",
  alternates: { canonical: "/contatti" },
};

export default async function PaginaContact() {
  const s = await setari();
  const telCurat = s.telefon.replace(/[^\d+]/g, "");

  /*
   * Date structurate LocalBusiness (§58).
   *
   * Sunt cele care fac să apară pe Google adresa, orarul și butonul de apel
   * pentru un birou de cartier — pentru un CAF cu clienți din zonă, asta
   * cântărește mai mult decât orice altă optimizare.
   */
  const dateStructurate = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: s.numeFirma,
    description: s.slogan,
    telephone: s.telefon,
    email: s.email,
    url: urlPublic(),
    address: {
      "@type": "PostalAddress",
      streetAddress: "Via Monte Rosa, 101/B",
      addressLocality: "Torino",
      postalCode: "10154",
      addressRegion: "TO",
      addressCountry: "IT",
    },
    ...(s.lat && s.lng
      ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } }
      : {}),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:30",
        closes: "13:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "15:00",
        closes: "18:00",
      },
    ],
  };

  const harta =
    s.lat && s.lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${s.lng - 0.004}%2C${s.lat - 0.002}%2C${s.lng + 0.004}%2C${s.lat + 0.002}&layer=mapnik&marker=${s.lat}%2C${s.lng}`
      : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dateStructurate) }}
      />

      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-deep">
          Parla con noi
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Contatti e sede</h1>
        <p className="mt-4 text-muted-foreground">
          Lavoriamo su appuntamento, così non aspetti in fila. Se preferisci sentirci prima,
          chiamaci: rispondiamo negli orari di apertura.
        </p>
      </header>

      <div className="mt-9 grid gap-4 sm:grid-cols-3">
        <a
          href={`tel:${telCurat}`}
          className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-primary hover:bg-tint"
        >
          <span aria-hidden="true" className="text-2xl">📞</span>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Cellulare
          </p>
          <p className="mt-1 font-semibold">{s.telefon}</p>
        </a>

        {s.telefonSecundar ? (
          <a
            href={`tel:${s.telefonSecundar.replace(/[^\d+]/g, "")}`}
            className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-primary hover:bg-tint"
          >
            <span aria-hidden="true" className="text-2xl">☎️</span>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Tel / Fax
            </p>
            <p className="mt-1 font-semibold">{s.telefonSecundar}</p>
          </a>
        ) : null}

        <a
          href={`mailto:${s.email}`}
          className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-primary hover:bg-tint"
        >
          <span aria-hidden="true" className="text-2xl">✉️</span>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Email
          </p>
          <p className="mt-1 break-all text-sm font-semibold">{s.email}</p>
        </a>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {harta ? (
            <iframe
              src={harta}
              title="Mappa della sede di IMMY &amp; EMY"
              loading="lazy"
              className="h-80 w-full border-0"
            />
          ) : (
            <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
              Mappa non disponibile
            </div>
          )}
          <div className="border-t border-border p-5">
            <p className="font-semibold">{s.adresa}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" className="rounded-full">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.adresa)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Indicazioni stradali
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <a href={`tel:${telCurat}`}>Chiama</a>
              </Button>
              {s.whatsapp ? (
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <a
                    href={`https://wa.me/${s.whatsapp.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-foreground p-7 text-background">
          <h2 className="font-serif text-xl font-semibold text-background">Orario di apertura</h2>
          <dl className="mt-5 divide-y divide-white/12 text-sm">
            {[
              ["Lunedì – Venerdì", "9:30–13:00 · 15:00–18:00"],
              ["Sabato", "Chiuso"],
              ["Domenica", "Chiuso"],
            ].map(([zi, ore]) => (
              <div key={zi} className="flex justify-between gap-4 py-3">
                <dt>{zi}</dt>
                <dd className="text-right font-semibold text-accent">{ore}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-background/75">
            Fuori orario puoi comunque prenotare online: il calendario è sempre aperto.
          </p>
          <Button asChild className="mt-5 w-full rounded-full bg-primary">
            <a href="/prenota">Prenota appuntamento</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
