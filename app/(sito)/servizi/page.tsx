import type { Metadata } from "next";
import { CautareServicii } from "@/components/immy/cautare-servicii";
import { BannerNeconfigurat } from "@/components/immy/stari";
import { categorii, servicii } from "@/lib/immy/dal/catalog";
import { supabaseConfigurat } from "@/lib/immy/env";

export const metadata: Metadata = {
  title: "Servizi e prenotazioni",
  description:
    "Tutti i servizi di IMMY & EMY: cittadinanza, permessi di soggiorno, SPID, " +
    "certificati, 730, Naspi, assegno unico, contratti di lavoro domestico, apostille.",
  alternates: { canonical: "/servizi" },
};

export default async function PaginaServicii() {
  const [listaCategorii, listaServicii] = await Promise.all([categorii(), servicii()]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-deep">
          I nostri servizi
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Servizi e prenotazioni</h1>
        <p className="mt-4 text-muted-foreground">
          Cerca il servizio di cui hai bisogno o sfoglia le categorie. Su ogni scheda trovi la
          durata, i documenti necessari e il pulsante per prenotare.
        </p>
      </header>

      {!supabaseConfigurat() ? (
        <div className="mt-8">
          <BannerNeconfigurat />
        </div>
      ) : null}

      <div className="mt-9">
        <CautareServicii
          servicii={listaServicii}
          categorii={listaCategorii}
          placeholder="Cerca — es. SPID, cittadinanza, 730, Naspi…"
        />
      </div>
    </div>
  );
}
