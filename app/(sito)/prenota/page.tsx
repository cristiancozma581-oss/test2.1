import type { Metadata } from "next";
import { FluxRezervare } from "@/components/immy/flux-rezervare";
import { BannerNeconfigurat } from "@/components/immy/stari";
import { categorii, servicii } from "@/lib/immy/dal/catalog";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { supabaseConfigurat } from "@/lib/immy/env";

export const metadata: Metadata = {
  title: "Prenota un appuntamento",
  description:
    "Scegli il servizio, l'operatore, il giorno e l'ora. Ricevi subito il codice della prenotazione.",
  alternates: { canonical: "/prenota" },
};

type Proprietati = { searchParams: Promise<{ servizio?: string }> };

export default async function PaginaRezervare(props: Proprietati) {
  const { servizio } = await props.searchParams;

  const [listaServicii, listaCategorii, sesiune] = await Promise.all([
    servicii(),
    categorii(),
    sesiuneCurenta(),
  ]);

  const rezervabile = listaServicii.filter((s) => s.rezervabilOnline);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-deep">
          Prenotazione
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Prenota un appuntamento</h1>
        <p className="mt-4 text-muted-foreground">
          Quattro passaggi: servizio, operatore, giorno e ora, i tuoi dati. Alla fine ricevi
          un codice come <span className="font-mono text-foreground">IMMY-2026-000124</span>.
        </p>
      </header>

      {!supabaseConfigurat() ? (
        <div className="mt-8">
          <BannerNeconfigurat />
        </div>
      ) : (
        <div className="mt-9">
          <FluxRezervare
            servicii={rezervabile}
            categorii={listaCategorii}
            slugInitial={servizio}
            client={
              sesiune && sesiune.rol === "CLIENT"
                ? {
                    email: sesiune.email,
                    numeComplet: sesiune.numeComplet,
                    telefon: sesiune.telefon,
                  }
                : null
            }
          />
        </div>
      )}
    </div>
  );
}
