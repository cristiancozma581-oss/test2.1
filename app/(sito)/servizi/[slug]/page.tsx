import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { serviciu, servicii } from "@/lib/immy/dal/catalog";
import { setari } from "@/lib/immy/dal/setari";
import { urlPublic } from "@/lib/immy/env";

/**
 * Pagina unui serviciu (§10, §58).
 *
 * Include date structurate `Service` — datele vin din bază, deci ce vede
 * motorul de căutare este exact ce vede clientul, fără o a doua sursă de
 * adevăr care se învechește.
 */

export async function generateStaticParams() {
  return (await servicii()).map((s) => ({ slug: s.slug }));
}

/*
 * `params` este o promisiune în Next 16 (accesul sincron a fost eliminat).
 *
 * Tipul se scrie explicit, nu prin ajutorul global `PageProps`: acela există
 * doar după `next typegen`, deci un `tsc --noEmit` pe o copie proaspătă, fără
 * build, ar cădea — exact ce face verificarea din integrarea continuă.
 */
type ProprietatiPagina = { params: Promise<{ slug: string }> };

export async function generateMetadata(props: ProprietatiPagina): Promise<Metadata> {
  const { slug } = await props.params;
  const s = await serviciu(slug);
  if (!s) return { title: "Servizio non trovato" };

  return {
    title: s.nume,
    description:
      s.descriereScurta ??
      `${s.nume} presso IMMY & EMY a Torino. Durata ${s.durataMinute} minuti, su appuntamento.`,
    alternates: { canonical: `/servizi/${s.slug}` },
    openGraph: {
      title: `${s.nume} · IMMY & EMY`,
      description: s.descriereScurta ?? undefined,
    },
  };
}

export default async function PaginaServiciu(props: ProprietatiPagina) {
  const { slug } = await props.params;
  const [s, config] = await Promise.all([serviciu(slug), setari()]);

  if (!s) notFound();

  const dateStructurate = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.nume,
    description: s.descriereScurta ?? s.descriere ?? undefined,
    serviceType: s.categorieNume,
    provider: {
      "@type": "LocalBusiness",
      name: config.numeFirma,
      telephone: config.telefon,
      email: config.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Via Monte Rosa, 101/B",
        addressLocality: "Torino",
        postalCode: "10154",
        addressCountry: "IT",
      },
    },
    areaServed: { "@type": "City", name: "Torino" },
    url: `${urlPublic()}/servizi/${s.slug}`,
    ...(s.pretCenti !== null
      ? {
          offers: {
            "@type": "Offer",
            price: (s.pretCenti / 100).toFixed(2),
            priceCurrency: "EUR",
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <script
        type="application/ld+json"
        // Datele vin din propria bază, serializate cu JSON.stringify — nu este
        // text arbitrar de la utilizator.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dateStructurate) }}
      />

      <nav aria-label="Percorso" className="text-sm text-muted-foreground">
        <Link href="/servizi" className="hover:text-primary-deep">
          Servizi
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{s.categorieNume}</span>
      </nav>

      <header className="mt-4">
        <h1 className="font-serif text-4xl font-semibold">{s.nume}</h1>
        <p className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-tint px-3 py-1.5 font-semibold text-primary-deep">
            ⏱ {s.durataMinute} minuti
          </span>
          {s.pretCenti !== null ? (
            <span className="rounded-full bg-surface-muted px-3 py-1.5 font-semibold">
              {(s.pretCenti / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
            </span>
          ) : (
            <span className="rounded-full bg-surface-muted px-3 py-1.5 font-semibold text-muted-foreground">
              Preventivo in sede
            </span>
          )}
          <span className="rounded-full bg-surface-muted px-3 py-1.5 font-semibold text-muted-foreground">
            {s.categorieNume}
          </span>
        </p>

        {s.descriereScurta ? (
          <p className="mt-5 text-lg text-muted-foreground">{s.descriereScurta}</p>
        ) : null}

        <div className="mt-7">
          {s.rezervabilOnline ? (
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href={`/prenota?servizio=${s.slug}`}>Prenota questo servizio</Link>
            </Button>
          ) : (
            <div className="rounded-xl border border-warning/35 bg-warning/10 px-5 py-4">
              <p className="text-sm font-semibold text-warning">
                Questo servizio non si prenota online
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Chiamaci al {config.telefon}: valutiamo insieme la tua situazione e fissiamo
                l&apos;appuntamento giusto.
              </p>
            </div>
          )}
        </div>
      </header>

      {s.descriere ? (
        <section className="mt-11">
          <h2 className="font-serif text-2xl font-semibold">In cosa consiste</h2>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{s.descriere}</p>
        </section>
      ) : null}

      {s.documente.length > 0 ? (
        <section className="mt-11">
          <h2 className="font-serif text-2xl font-semibold">Documenti da portare</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Controlla la lista prima di venire: con il fascicolo completo la pratica si chiude in
            un solo appuntamento.
          </p>
          <ul className="mt-5 space-y-2.5">
            {s.documente.map((d) => (
              <li
                key={d.id}
                className="flex gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <span aria-hidden="true" className="mt-0.5 text-primary">
                  {d.obligatoriu ? "●" : "○"}
                </span>
                <span>
                  <span className="font-medium">{d.eticheta}</span>
                  {!d.obligatoriu ? (
                    <span className="ml-2 text-xs text-muted-foreground">(se ce l&apos;hai)</span>
                  ) : null}
                  {d.indiciu ? (
                    <span className="mt-1 block text-sm text-muted-foreground">{d.indiciu}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {s.pasi.length > 0 ? (
        <section className="mt-11">
          <h2 className="font-serif text-2xl font-semibold">Come procediamo</h2>
          <ol className="mt-5 space-y-3">
            {s.pasi.map((p, i) => (
              <li key={p.id} className="flex gap-4 rounded-xl border border-border bg-surface p-5">
                <span className="font-serif text-2xl font-semibold text-primary">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{p.titlu}</span>
                  {p.descriere ? (
                    <span className="mt-1 block text-sm text-muted-foreground">{p.descriere}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {s.operatori.length > 0 ? (
        <section className="mt-11">
          <h2 className="font-serif text-2xl font-semibold">Chi ti segue</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {s.operatori.map((o) => (
              <li key={o.id} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full font-serif text-lg font-semibold text-white"
                  style={{ backgroundColor: o.culoare }}
                >
                  {o.nume.charAt(0)}
                </span>
                <span>
                  <span className="block font-semibold">{o.nume}</span>
                  {o.titlu ? (
                    <span className="block text-sm text-muted-foreground">{o.titlu}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {s.faq.length > 0 ? (
        <section className="mt-11">
          <h2 className="font-serif text-2xl font-semibold">Domande frequenti</h2>
          <div className="mt-5 space-y-3">
            {s.faq.map((f) => (
              <details key={f.id} className="rounded-xl border border-border bg-surface p-5">
                <summary className="cursor-pointer font-semibold">{f.intrebare}</summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.raspuns}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {s.rezervabilOnline ? (
        <div className="mt-12 rounded-2xl bg-tint px-7 py-9 text-center">
          <p className="font-serif text-xl font-semibold text-primary-deep">
            Pronto a prenotare {s.nume.toLowerCase()}?
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Scegli giorno e ora fra quelli liberi. Ricevi subito il codice della prenotazione.
          </p>
          <Button asChild size="lg" className="mt-5 rounded-full px-8">
            <Link href={`/prenota?servizio=${s.slug}`}>Prenota ora</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
