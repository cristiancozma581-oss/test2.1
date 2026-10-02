import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { FormularProfil } from "@/components/immy/formular-profil";
import { Button } from "@/components/ui/button";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Profilo",
  robots: { index: false, follow: false },
};

export default async function PaginaProfil() {
  const [sesiune, s] = await Promise.all([sesiuneCurenta(), setari()]);
  if (!sesiune) return null;

  return (
    <>
      <AntetPagina titlu="Il tuo profilo" descriere="I dati che usiamo per contattarti." />

      <div className="max-w-2xl space-y-6 px-5 py-6 lg:px-8">
        <section className="rounded-xl border border-border bg-surface p-5">
          <FormularProfil
            numeComplet={sesiune.numeComplet}
            telefon={sesiune.telefon}
            limba={sesiune.limba}
            email={sesiune.email}
          />
        </section>

        {/* §49: dreptul de acces și de portabilitate, exercitabil din interfață. */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-serif text-lg font-semibold">I tuoi dati</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Puoi scaricare in qualsiasi momento una copia dei dati che conserviamo su di te:
            profilo, prenotazioni, pratiche, documenti e messaggi.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
            <a href="/api/dati-personali" download>
              Scarica i miei dati (JSON)
            </a>
          </Button>

          <h3 className="mt-6 font-semibold">Cancellazione</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Per chiedere la cancellazione dei tuoi dati scrivici a{" "}
            <a className="font-semibold text-primary-deep" href={`mailto:${s.email}`}>
              {s.email}
            </a>
            . Cancelliamo tutto ciò che non siamo tenuti a conservare per obblighi fiscali e
            amministrativi, e ti diciamo con chiarezza che cosa resta e perché.
          </p>
        </section>
      </div>
    </>
  );
}
